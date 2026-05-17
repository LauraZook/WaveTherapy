from fastapi import FastAPI, APIRouter, HTTPException, Header, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import asyncio
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

import resend
from emergentintegrations.llm.chat import LlmChat, UserMessage

from protocols_data import PROTOCOLS, get_all_protocols_summary, build_llm_context

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---- Mongo ----
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---- Email ----
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
if RESEND_API_KEY and not RESEND_API_KEY.startswith("re_placeholder"):
    resend.api_key = RESEND_API_KEY

# ---- LLM ----
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "curawaves-admin-2026")

app = FastAPI(title="CuraWaves Onboarding API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("curawaves")


# ----------------- Models -----------------
class QuestionnaireSubmission(BaseModel):
    email: EmailStr
    first_name: str
    age: int = Field(ge=1, le=120)
    sex: str  # male | female | other | prefer_not_to_say
    primary_goal: str  # health_wellness | pain_inflammation | detoxification | immune_boost | repair_recovery
    symptoms: List[str] = []
    symptom_details: str = ""
    severity: int = Field(ge=1, le=10)
    duration: str  # less_than_week | weeks | months | years
    pain_location: str = ""  # free-text body areas, only relevant for pain_inflammation
    minutes_per_day: str = "as_recommended"  # thirty | sixty | as_recommended
    preferred_times: List[str] = []  # morning | afternoon | during_work | evening
    has_autoimmune: bool = False
    autoimmune_details: str = ""
    medications: str = ""
    pregnancy_or_pacemaker: bool = False  # safety flag
    lifestyle_notes: str = ""
    program_length: str  # one_day | one_week | thirty_day
    consent_disclaimer: bool


class SessionItem(BaseModel):
    code: int
    name: str
    minutes: int
    instructions: str  # e.g. "Enter: AUTO, 646, RUN"
    notes: Optional[str] = ""
    time_of_day: Optional[str] = ""  # morning | afternoon | during_work | evening | anytime


class DaySchedule(BaseModel):
    day: int
    label: str  # "Morning", "Day 1", etc.
    sessions: List[SessionItem]


class GeneratedPlan(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    program_length: str
    primary_protocol_key: str
    primary_protocol_title: str
    ai_summary: str
    headline: str
    daily_tip: str
    schedule: List[DaySchedule]
    safety_notes: List[str]
    tips: List[str] = []
    needs_30day_reassessment: bool
    created_at: str
    reminder_due_at: Optional[str] = None


class EmailPlanRequest(BaseModel):
    plan_id: str


class ReassessRequest(BaseModel):
    email: EmailStr
    symptoms_update: str
    severity: int = Field(ge=1, le=10)
    notes: str = ""


# ----------------- Helpers -----------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _strip_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc


async def _generate_plan_with_llm(sub: QuestionnaireSubmission) -> Dict[str, Any]:
    """Use Claude Sonnet 4.5 to generate a personalized program. Returns dict."""
    system_msg = (
        "You are CuraWaves Wellness AI — a knowledgeable, warm integrative-health guide for the Wave Therapy "
        "electrotherapy device. You build personalized education-only programs by selecting from a fixed catalog "
        "of pre-programmed Auto Codes. You DO NOT diagnose, treat, or cure disease. Always remind users this is "
        "for education/investigative use only. Always return STRICT JSON only — no preface, no markdown fences."
    )

    catalog = build_llm_context()
    minutes_budget = {"thirty": 30, "sixty": 60, "as_recommended": 999}.get(sub.minutes_per_day, 999)
    times_text = ", ".join(sub.preferred_times) if sub.preferred_times else "anytime (no preference)"

    user_prompt = f"""
Generate a personalized Wave Therapy program for this user.

USER PROFILE:
- Name: {sub.first_name}
- Age: {sub.age}, Sex: {sub.sex}
- Primary health goal category: {sub.primary_goal}
- Symptoms: {", ".join(sub.symptoms) if sub.symptoms else "(none specified)"}
- Symptom details: {sub.symptom_details or "(none)"}
- Pain location (if relevant): {sub.pain_location or "(none specified / full body)"}
- Severity (1-10): {sub.severity}
- Duration: {sub.duration}
- Has autoimmune or complex condition: {sub.has_autoimmune} ({sub.autoimmune_details})
- Medications / relevant: {sub.medications or "(none)"}
- Pregnancy/pacemaker (safety flag): {sub.pregnancy_or_pacemaker}
- Lifestyle notes: {sub.lifestyle_notes or "(none)"}
- Requested program length: {sub.program_length}  (one_day = 1 day, one_week = 7 days, thirty_day = 30 days)
- Time available per day: {sub.minutes_per_day}  (target total minutes per day: {minutes_budget if minutes_budget < 999 else "no limit — follow recommended"})
- Preferred time(s) of day: {times_text}

CATALOG OF AVAILABLE CODES (pick ONLY from these):
{catalog}

INSTRUCTIONS:
1. Build a day-by-day schedule that respects program_length:
   - one_day → 1 day with 2–4 sessions
   - one_week → 7 days, 1–3 sessions per day, vary daily
   - thirty_day → 30 days. You may compress by labeling repeating weekly patterns but produce all 30 days.
2. Each session must be one entry from the catalog. Use exact code + name + minutes.
3. Each session instructions string MUST be exactly: "Enter: AUTO, <CODE>, RUN"
4. **MINUTES BUDGET**: Total session minutes per day SHOULD stay near {minutes_budget if minutes_budget < 999 else "the recommended length per code"} minutes. Pick fewer/shorter codes if needed to fit. Never go more than +15 minutes over.
5. **TIME-OF-DAY RULES** (set the time_of_day field on each session):
   - User's preferred slots: {times_text}.
   - Energizing codes (DNA Healing 222, Pineal/Cortex 444, Mental Clarity 636) MUST be scheduled in the MORNING.
   - Chronic Fatigue / Mental Clarity codes → morning or during_work, never evening.
   - Code 646 (Health, Wellness & Rejuvenation) is SLIGHTLY DROWSY — schedule it in the EVENING only.
   - Code 647 (Earth Resonance) is safe to run while sleeping → evening.
   - Insomnia 351 → evening.
   - If user picked specific slots, only use those slots. If none picked, distribute sensibly.
6. **PAIN RULES** (if primary_goal == pain_inflammation):
   - If pain_location is empty OR mentions "all over"/"full body"/"chronic"/"fibromyalgia" → recommend code 274 (Fibromyalgia Pain & Inflammation) DAILY as the anchor session.
   - If pain_location names a specific body part (wrists, carpal tunnel, elbow, tendons, knees, neck, back, hip, etc.) → use the closest catalog code (e.g. 159 elbow arthritic, 287 frozen shoulder, 400 stiff neck, 465 sciatica, 641 lower-back/extremities, 514 tendomyopathy) and ALTERNATE days with arthritis-related codes (159 elbow arthritic; 298 Gout/Uric Acid/Arthritis) for pain management.
7. **DETOX RULES** (if primary_goal == detoxification):
   - WEEK 1: General Detoxification (code 237) every OTHER day (Days 1, 3, 5, 7) with lighter Lymph Stasis 377 on the off days.
   - WEEK 2: Liver focus — Liver Balance & Cleanse 579 on Days 8, 10, 12, 14 with General Detox 237 on Days 9, 11, 13.
   - WEEK 3: Kidney focus — Kidney Balance & Cleanse 580 on Days 15, 17, 19, 21 with General Detox 237 on Days 16, 18, 20.
   - WEEK 4: Lungs / Hypothalamus / Cellular focus — alternate 374 (Lungs Cleanse), 367 (Hypothalamus Cleanse), 161 (Cellular Cleanse) and finish with 237 General Detox on Day 30.
   - For 1-week detox plans, do Week 1 only. For 1-day, just General Detox 237 + Lymph Stasis 377.
8. Lead with the primary_goal category but blend 1–2 supportive codes from other categories where helpful.
9. If autoimmune is true OR severity >= 8 OR pregnancy_or_pacemaker is true: set needs_30day_reassessment=true and include 1–2 safety_notes (e.g., "Consult your physician before use if you have a pacemaker", "Schedule a 30-day re-assessment for autoimmune conditions").
10. Provide a warm, friendly 2–3 sentence ai_summary addressing the user by first name.
11. Provide a short headline (max 8 words) and a daily_tip (1 sentence on hydration/sleep/breathwork).
12. Provide 3–5 practical TIPS in the tips array (hydration during/after sessions, electrode pad vs stainless cylinder choice, consistency of daily use, pause/resume guidance, when to call a coach, etc.).
13. Output STRICT JSON with this schema (no extra fields, no comments):

{{
  "headline": "string",
  "ai_summary": "string",
  "daily_tip": "string",
  "primary_protocol_key": "{sub.primary_goal}",
  "primary_protocol_title": "string",
  "needs_30day_reassessment": true|false,
  "safety_notes": ["string", ...],
  "tips": ["string", ...],
  "schedule": [
    {{
      "day": 1,
      "label": "Day 1",
      "sessions": [
        {{ "code": 646, "name": "Health, Wellness & Rejuvenation", "minutes": 30, "instructions": "Enter: AUTO, 646, RUN", "notes": "", "time_of_day": "evening" }}
      ]
    }}
  ]
}}
"""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"plan-{uuid.uuid4()}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    async def _ask(prompt_text: str) -> str:
        return await chat.send_message(UserMessage(text=prompt_text))

    def _extract_json(text: str):
        text = text.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        first = text.find("{")
        last = text.rfind("}")
        if first != -1 and last != -1:
            text = text[first : last + 1]
        return json.loads(text)

    response = await _ask(user_prompt)
    try:
        return _extract_json(response)
    except json.JSONDecodeError:
        # One retry asking for strict JSON-only output
        logger.warning("LLM returned non-JSON. Retrying with stricter prompt.")
        retry_prompt = "Return ONLY the JSON object from your previous answer. No prose, no markdown fences. Start with { and end with }."
        response2 = await _ask(retry_prompt)
        try:
            return _extract_json(response2)
        except json.JSONDecodeError as e:
            logger.error(f"LLM JSON parse failed after retry: {e}\nRaw: {response2[:500]}")
            raise HTTPException(status_code=502, detail="Failed to parse plan from AI. Please try again.")


def _build_plan_html(plan: Dict[str, Any]) -> str:
    """Build a print-friendly HTML email with the plan."""
    schedule_rows = []
    for d in plan["schedule"]:
        sessions_html = "".join(
            f"<tr><td style='padding:6px 10px;border-bottom:1px solid #EAE5D9;font-family:monospace;'>"
            f"AUTO &nbsp;|&nbsp; <b>{s['code']}</b> &nbsp;|&nbsp; RUN</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #EAE5D9;'>{s['name']}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #EAE5D9;text-align:right;'>{s['minutes']} min</td></tr>"
            for s in d["sessions"]
        )
        schedule_rows.append(
            f"<h3 style='font-family:Georgia,serif;color:#2C5E7A;margin:18px 0 6px;'>{d['label']}</h3>"
            f"<table width='100%' cellspacing='0' style='border-collapse:collapse;font-size:14px;color:#2A3439;'>{sessions_html}</table>"
        )

    safety = "".join(f"<li>{s}</li>" for s in plan.get("safety_notes", []))
    safety_block = f"<ul style='color:#7A5A3A;font-size:13px;'>{safety}</ul>" if safety else ""

    return f"""
<div style="font-family:Arial,sans-serif;background:#FDFBF7;padding:24px;color:#2A3439;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #EAE5D9;border-radius:16px;padding:32px;">
    <p style="letter-spacing:0.2em;text-transform:uppercase;font-size:11px;color:#85A094;margin:0;">CuraWaves Personalized Program</p>
    <h1 style="font-family:Georgia,serif;font-weight:400;color:#2C5E7A;margin:8px 0 4px;font-size:28px;">{plan['headline']}</h1>
    <p style="color:#5C6A72;margin:0 0 18px;">{plan['ai_summary']}</p>
    <div style="background:#FDF1E5;color:#7A5A3A;padding:12px 14px;border-radius:8px;font-size:12px;margin-bottom:18px;">
      For education & investigative use only. This device is not intended to diagnose, treat, cure, or prevent any disease.
    </div>
    {''.join(schedule_rows)}
    <hr style="border:none;border-top:1px dashed #D5CEBC;margin:24px 0;"/>
    <p style="font-size:13px;color:#5C6A72;"><b>Daily Tip:</b> {plan['daily_tip']}</p>
    {safety_block}
    <p style="font-size:12px;color:#A0AAB0;margin-top:18px;">Pause any session by pressing a number key (1–9). Resume by pressing RUN.</p>
  </div>
</div>
"""


async def _send_email_async(to: str, subject: str, html: str):
    """Send via Resend. Returns dict or raises."""
    if not RESEND_API_KEY or RESEND_API_KEY.startswith("re_placeholder"):
        logger.warning("RESEND_API_KEY not configured — email send skipped (returning mock).")
        return {"id": "mock-no-resend-key", "mocked": True}

    params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
    result = await asyncio.to_thread(resend.Emails.send, params)
    return result


# ----------------- Routes -----------------
@api_router.get("/")
async def root():
    return {"service": "CuraWaves Onboarding API", "version": "1.0.0"}


@api_router.get("/protocols")
async def list_protocols():
    return {"protocols": get_all_protocols_summary()}


@api_router.get("/protocols/{key}")
async def get_protocol(key: str):
    if key not in PROTOCOLS:
        raise HTTPException(status_code=404, detail="Protocol not found")
    return PROTOCOLS[key]


@api_router.post("/questionnaire/submit", response_model=GeneratedPlan)
async def submit_questionnaire(sub: QuestionnaireSubmission):
    if not sub.consent_disclaimer:
        raise HTTPException(status_code=400, detail="You must accept the educational-use disclaimer to continue.")

    if sub.primary_goal not in PROTOCOLS:
        raise HTTPException(status_code=400, detail="Invalid primary_goal")

    plan_data = await _generate_plan_with_llm(sub)

    needs_reassess = bool(plan_data.get("needs_30day_reassessment")) or sub.has_autoimmune
    reminder_due = None
    if needs_reassess or sub.program_length == "thirty_day":
        reminder_due = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    plan_id = str(uuid.uuid4())
    plan_doc = {
        "id": plan_id,
        "email": sub.email,
        "first_name": sub.first_name,
        "program_length": sub.program_length,
        "primary_protocol_key": sub.primary_goal,
        "primary_protocol_title": PROTOCOLS[sub.primary_goal]["title"],
        "ai_summary": plan_data.get("ai_summary", ""),
        "headline": plan_data.get("headline", "Your CuraWaves Program"),
        "daily_tip": plan_data.get("daily_tip", "Stay hydrated and rest well."),
        "schedule": plan_data.get("schedule", []),
        "safety_notes": plan_data.get("safety_notes", []),
        "tips": plan_data.get("tips", []),
        "needs_30day_reassessment": needs_reassess,
        "created_at": _now_iso(),
        "reminder_due_at": reminder_due,
        "submission": sub.model_dump(),
    }

    await db.plans.insert_one(plan_doc.copy())
    plan_doc.pop("_id", None)
    plan_doc.pop("submission", None)
    return plan_doc


@api_router.get("/plan/{plan_id}", response_model=GeneratedPlan)
async def get_plan(plan_id: str):
    doc = await db.plans.find_one({"id": plan_id}, {"_id": 0, "submission": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    return doc


@api_router.post("/plan/email")
async def email_plan(req: EmailPlanRequest, background: BackgroundTasks):
    plan = await db.plans.find_one({"id": req.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    html = _build_plan_html(plan)
    subject = f"Your CuraWaves Personalized Program — {plan['headline']}"
    result = await _send_email_async(plan["email"], subject, html)

    await db.plans.update_one(
        {"id": req.plan_id}, {"$set": {"emailed_at": _now_iso(), "email_result_id": result.get("id")}}
    )
    return {"status": "ok", "email_id": result.get("id"), "mocked": result.get("mocked", False)}


@api_router.post("/reassess", response_model=GeneratedPlan)
async def reassess(req: ReassessRequest):
    """Returning user: use most recent plan to inform a fresh plan."""
    prior = await db.plans.find_one({"email": req.email}, {"_id": 0}, sort=[("created_at", -1)])
    if not prior:
        raise HTTPException(status_code=404, detail="No prior plan found for this email.")

    prior_sub = prior.get("submission", {})
    # Build a fresh submission carrying forward profile + updated symptoms
    new_sub = QuestionnaireSubmission(
        email=req.email,
        first_name=prior_sub.get("first_name", "Friend"),
        age=prior_sub.get("age", 35),
        sex=prior_sub.get("sex", "prefer_not_to_say"),
        primary_goal=prior_sub.get("primary_goal", "health_wellness"),
        symptoms=prior_sub.get("symptoms", []),
        symptom_details=req.symptoms_update,
        severity=req.severity,
        duration=prior_sub.get("duration", "months"),
        has_autoimmune=prior_sub.get("has_autoimmune", False),
        autoimmune_details=prior_sub.get("autoimmune_details", ""),
        medications=prior_sub.get("medications", ""),
        pregnancy_or_pacemaker=prior_sub.get("pregnancy_or_pacemaker", False),
        lifestyle_notes=req.notes or prior_sub.get("lifestyle_notes", ""),
        pain_location=prior_sub.get("pain_location", ""),
        minutes_per_day=prior_sub.get("minutes_per_day", "as_recommended"),
        preferred_times=prior_sub.get("preferred_times", []),
        program_length="thirty_day",
        consent_disclaimer=True,
    )
    return await submit_questionnaire(new_sub)


@api_router.get("/admin/submissions")
async def admin_submissions(x_admin_token: Optional[str] = Header(default=None)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    docs = await db.plans.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"count": len(docs), "submissions": docs}


@api_router.post("/admin/send-reminders")
async def admin_send_reminders(x_admin_token: Optional[str] = Header(default=None)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

    now_iso = _now_iso()
    cursor = db.plans.find(
        {"reminder_due_at": {"$lte": now_iso, "$ne": None}, "reminder_sent_at": {"$exists": False}},
        {"_id": 0},
    )
    sent = 0
    async for plan in cursor:
        html = f"""
        <div style='font-family:Arial,sans-serif;background:#FDFBF7;padding:24px;'>
          <div style='max-width:560px;margin:0 auto;background:#fff;border:1px solid #EAE5D9;border-radius:16px;padding:28px;'>
            <h2 style='font-family:Georgia,serif;color:#2C5E7A;'>Hi {plan['first_name']}, time for your 30-day check-in</h2>
            <p>You're due for a CuraWaves re-assessment. Update your symptoms and we'll refresh your program.</p>
            <p><a href='https://curawaves.com' style='background:#2C5E7A;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;'>Start re-assessment</a></p>
          </div>
        </div>
        """
        await _send_email_async(plan["email"], "Your CuraWaves 30-day check-in", html)
        await db.plans.update_one({"id": plan["id"]}, {"$set": {"reminder_sent_at": now_iso}})
        sent += 1
    return {"reminders_sent": sent}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
