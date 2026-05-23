"""CuraWaves backend API tests - protocols, questionnaire, plan, reassess, admin."""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://wave-therapy-dev.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_TOKEN = "curawaves-admin-2026"
TIMEOUT_LLM = 90  # LLM can take 10-30s


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _valid_submission(**overrides):
    payload = {
        "email": "test_user@example.com",
        "first_name": "TestUser",
        "age": 42,
        "sex": "female",
        "primary_goal": "health_wellness",
        "symptoms": ["Fatigue", "Brain fog"],
        "symptom_details": "Low energy in afternoons.",
        "severity": 5,
        "duration": "months",
        "has_autoimmune": False,
        "autoimmune_details": "",
        "medications": "",
        "pregnancy_or_pacemaker": False,
        "lifestyle_notes": "WFH",
        "program_length": "one_day",
        "consent_disclaimer": True,
    }
    payload.update(overrides)
    return payload


# ---------- Basic ----------
class TestRootAndProtocols:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        d = r.json()
        assert d.get("service") == "CuraWaves Onboarding API"

    def test_list_protocols(self, session):
        r = session.get(f"{API}/protocols")
        assert r.status_code == 200
        d = r.json()
        protos = d.get("protocols", [])
        assert len(protos) == 5
        keys = {p["key"] for p in protos}
        assert keys == {"health_wellness", "pain_inflammation", "detoxification", "immune_boost", "repair_recovery"}
        for p in protos:
            assert p["code_count"] > 0

    def test_get_protocol_valid(self, session):
        r = session.get(f"{API}/protocols/health_wellness")
        assert r.status_code == 200
        d = r.json()
        assert "title" in d
        assert isinstance(d["codes"], list) and len(d["codes"]) > 0

    def test_get_protocol_not_found(self, session):
        r = session.get(f"{API}/protocols/nonexistent_key")
        assert r.status_code == 404


# ---------- Questionnaire validation ----------
class TestQuestionnaireValidation:
    def test_consent_required(self, session):
        r = session.post(f"{API}/questionnaire/submit", json=_valid_submission(consent_disclaimer=False), timeout=TIMEOUT_LLM)
        assert r.status_code == 400

    def test_invalid_primary_goal(self, session):
        r = session.post(f"{API}/questionnaire/submit", json=_valid_submission(primary_goal="invalid_goal"), timeout=TIMEOUT_LLM)
        assert r.status_code == 400


# ---------- Plan generation ----------
@pytest.fixture(scope="module")
def generated_one_day_plan(session):
    r = session.post(f"{API}/questionnaire/submit", json=_valid_submission(program_length="one_day"), timeout=TIMEOUT_LLM)
    assert r.status_code == 200, f"Plan gen failed: {r.status_code} {r.text[:300]}"
    return r.json()


@pytest.fixture(scope="module")
def generated_autoimmune_plan(session):
    payload = _valid_submission(
        email="test_autoimmune@example.com",
        primary_goal="immune_boost",
        has_autoimmune=True,
        autoimmune_details="Hashimoto's",
        program_length="one_week",
    )
    r = session.post(f"{API}/questionnaire/submit", json=payload, timeout=TIMEOUT_LLM)
    assert r.status_code == 200
    return r.json()


class TestPlanGeneration:
    def test_one_day_plan_structure(self, generated_one_day_plan):
        p = generated_one_day_plan
        assert p["id"]
        assert p["headline"]
        assert p["ai_summary"]
        assert p["daily_tip"]
        assert p["primary_protocol_key"] == "health_wellness"
        assert "_id" not in p
        assert isinstance(p["schedule"], list) and len(p["schedule"]) >= 1
        # one_day → 1 day
        assert len(p["schedule"]) == 1
        for d in p["schedule"]:
            assert isinstance(d["sessions"], list) and len(d["sessions"]) > 0
            for s in d["sessions"]:
                assert "AUTO" in s["instructions"] and "RUN" in s["instructions"]

    def test_autoimmune_flags(self, generated_autoimmune_plan):
        p = generated_autoimmune_plan
        assert p["needs_30day_reassessment"] is True
        assert p["reminder_due_at"] is not None
        due = datetime.fromisoformat(p["reminder_due_at"])
        now = datetime.now(timezone.utc)
        diff_days = (due - now).total_seconds() / 86400
        assert 29 <= diff_days <= 31, f"reminder_due_at diff {diff_days} days"


# ---------- Get plan ----------
class TestGetPlan:
    def test_get_existing_plan(self, session, generated_one_day_plan):
        pid = generated_one_day_plan["id"]
        r = session.get(f"{API}/plan/{pid}")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == pid
        assert "_id" not in d
        assert d["headline"] == generated_one_day_plan["headline"]

    def test_get_unknown_plan(self, session):
        r = session.get(f"{API}/plan/nonexistent-uuid-xxx")
        assert r.status_code == 404


# ---------- Email (mocked) ----------
class TestEmailPlan:
    def test_email_plan_mocked(self, session, generated_one_day_plan):
        r = session.post(f"{API}/plan/email", json={"plan_id": generated_one_day_plan["id"]})
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "ok"
        assert d.get("mocked") is True

    def test_email_unknown_plan(self, session):
        r = session.post(f"{API}/plan/email", json={"plan_id": "nope-xxx"})
        assert r.status_code == 404


# ---------- Reassess ----------
class TestReassess:
    def test_reassess_unknown_email(self, session):
        r = session.post(f"{API}/reassess", json={
            "email": "nobody_unknown_999@example.com",
            "symptoms_update": "still tired",
            "severity": 4,
            "notes": "",
        }, timeout=TIMEOUT_LLM)
        assert r.status_code == 404

    def test_reassess_existing_email(self, session, generated_one_day_plan):
        r = session.post(f"{API}/reassess", json={
            "email": generated_one_day_plan["email"],
            "symptoms_update": "energy improved but back pain remains",
            "severity": 6,
            "notes": "more walking",
        }, timeout=TIMEOUT_LLM)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] != generated_one_day_plan["id"]
        assert d["program_length"] == "thirty_day"


# ---------- Admin ----------
class TestAdmin:
    def test_admin_no_token(self, session):
        r = session.get(f"{API}/admin/submissions")
        assert r.status_code == 401

    def test_admin_invalid_token(self, session):
        r = session.get(f"{API}/admin/submissions", headers={"x-admin-token": "wrong"})
        assert r.status_code == 401

    def test_admin_valid_token(self, session, generated_one_day_plan):
        r = session.get(f"{API}/admin/submissions", headers={"x-admin-token": ADMIN_TOKEN})
        assert r.status_code == 200
        d = r.json()
        assert "count" in d
        assert isinstance(d["submissions"], list)
        for s in d["submissions"]:
            assert "_id" not in s

    def test_admin_send_reminders_unauth(self, session):
        r = session.post(f"{API}/admin/send-reminders")
        assert r.status_code == 401

    def test_admin_send_reminders_ok(self, session):
        r = session.post(f"{API}/admin/send-reminders", headers={"x-admin-token": ADMIN_TOKEN})
        assert r.status_code == 200
        d = r.json()
        assert "reminders_sent" in d
        assert isinstance(d["reminders_sent"], int)
