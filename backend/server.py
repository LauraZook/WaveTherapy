from fastapi import FastAPI, APIRouter, HTTPException, Header, BackgroundTasks, Response, Request
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
import anthropic
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

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
# In production (Railway/Vercel) set ANTHROPIC_API_KEY (sk-ant-...).
# EMERGENT_LLM_KEY is kept for backward compatibility with the Emergent dev environment.
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("EMERGENT_LLM_KEY", "")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")
anthropic_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "curawaves-admin-2026")


def _rate_limit_key(request: Request) -> str:
    """Identify clients by the original IP behind Railway / Vercel proxies."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        # First IP in the comma-separated list is the original client
        return fwd.split(",")[0].strip()
    return get_remote_address(request)


# Rate limiter — protects the LLM endpoint from abuse / accidental hammering.
# Each plan generation costs real $$ on Anthropic. 5 plans / 15 min / IP is generous
# for a real user (questionnaire takes ~1 min) and tight enough to stop scripted abuse.
limiter = Limiter(key_func=_rate_limit_key, default_limits=["100/hour"])

app = FastAPI(title="CuraWaves Onboarding API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("curawaves")


# ----------------- Models -----------------
class QuestionnaireSubmission(BaseModel):
    email: EmailStr
    first_name: str
    age: int = Field(ge=1, le=120)
    sex: str  # male | female | other | prefer_not_to_say
    primary_goal: str  # health_wellness | pain_inflammation | detoxification | immune_boost | repair_recovery | meditation
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
    ai_summary: str = ""
    headline: str = "Your CuraWaves Program"
    daily_tip: str = ""
    schedule: List[DaySchedule] = []
    safety_notes: List[str] = []
    tips: List[str] = []
    needs_30day_reassessment: bool = False
    created_at: str
    reminder_due_at: Optional[str] = None
    auto_emailed: Optional[bool] = False
    emailed_at: Optional[str] = None
    # Generation lifecycle: "pending" while the LLM is working, "ready" when finished,
    # "failed" if generation errored. Frontend polls until status flips off "pending".
    status: str = "ready"
    error: Optional[str] = None


class EmailPlanRequest(BaseModel):
    plan_id: str


class NotesUpdate(BaseModel):
    notes: str


class ReassessRequest(BaseModel):
    email: EmailStr
    symptoms_update: str
    severity: int = Field(ge=1, le=10)
    notes: str = ""


class TestimonialSubmission(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    rating: int = Field(ge=1, le=5)
    headline: str = Field(min_length=1, max_length=160)
    story: str = Field(min_length=10, max_length=5000)
    primary_goal: str = ""   # optional — prefilled from plan if available
    allow_publish: bool = True
    plan_id: Optional[str] = None


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
    minutes_budget = {"thirty": 30, "sixty": 60, "as_recommended": 90}.get(sub.minutes_per_day, 90)
    times_text = ", ".join(sub.preferred_times) if sub.preferred_times else "anytime (no preference)"

    # For 30-day plans we generate a 7-day template + 4 weekly focuses, then expand
    # deterministically to 30 days. This keeps Claude output small and fast (~25s vs ~80s)
    # and avoids proxy/network timeouts on long generations.
    is_thirty_day_template = sub.program_length == "thirty_day"
    schedule_instruction = (
        "thirty_day → produce a SINGLE 7-day `schedule` representing the TYPICAL weekly pattern "
        "(this template will be repeated across all 4 weeks). ALSO produce a `weekly_focuses` array "
        "of EXACTLY 4 short focus statements (one per week), e.g. \"Week 1 — Build the foundation\", "
        "\"Week 2 — Deepen the work\", \"Week 3 — Layer in support\", \"Week 4 — Integrate & sustain\". "
        "For detox specifically, use the WEEK 1/2/3/4 focus rotation described in DETOX RULES below."
        if is_thirty_day_template
        else "thirty_day → 30 days. You may compress by labeling repeating weekly patterns but produce all 30 days."
    )
    extra_schema = (
        ',\n  "weekly_focuses": ["Week 1 — ...", "Week 2 — ...", "Week 3 — ...", "Week 4 — ..."]'
        if is_thirty_day_template
        else ""
    )

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
- Time available per day: {sub.minutes_per_day}  (target total minutes per day: ~{minutes_budget} min, hard ceiling 180 min)
- Preferred time(s) of day: {times_text}

CATALOG OF AVAILABLE CODES (pick ONLY from these):
{catalog}

INSTRUCTIONS:
1. Build a day-by-day schedule that respects program_length:
   - one_day → 1 day with 2–4 sessions
   - one_week → 7 days, 1–3 sessions per day, vary daily
   - {schedule_instruction}
2. Each session must be one entry from the catalog. Use exact code + name + minutes.
3. Each session instructions string MUST follow this format:
   - DEFAULT (most codes — AUTO programs): `"Enter: AUTO, <CODE>, RUN"`
   - **Code 222 (DNA — single channel)**: instructions MUST be exactly `"Enter: 7, SELECT, 222, RUN"` and `minutes` MUST be 7 (single-channel session, run for 7 minutes)
   - **Code 444 (Pineal — single channel)**: instructions MUST be exactly `"Press: 10, SELECT, 444, RUN"` (single channel, 10 minutes)
   - **Code 161 (Cellular Cleanse — single channel)**: instructions MUST be exactly `"Press: 30, SELECT, 161, RUN"`
3a. **Cross-protocol go-to sessions** — feel free to include these in ANY plan (regardless of primary_goal) as an occasional weekly support:
   - **Code 161 (Cellular Cleanse)** — a great WEEKLY solo session; include it once per week for meditation, health & wellness, pain, detoxification, repair & recovery, AND immune boost programs. Always 30 minutes.
   - **Code 646 (Health, Wellness & Rejuvenation)** — a 90-MINUTE evening umbrella session done IN BED while listening to music, watching a movie, or drifting off to sleep. MUST use full 90 minutes — do NOT shorten. EVENING ONLY.
     - **MANDATORY** when `minutes_per_day` is `sixty` or `as_recommended`:
       - `one_week` plans → include Code 646 AT LEAST 1 time (typically on Day 6 or Day 7).
       - `thirty_day` plans → include Code 646 AT LEAST 2 times, spaced roughly 2 weeks apart (e.g. Day 7 and Day 21).
     - For each 646 session, set `notes` to something like: "Run this in bed at night — great to do while listening to music, watching a movie, or drifting off to sleep."
     - Skip on 1-day plans, and skip when `minutes_per_day` is `thirty` (not enough time budget).
4. **MINUTES BUDGET**: Total session minutes per day SHOULD stay near {minutes_budget} minutes. Pick fewer/shorter codes if needed to fit. **HARD CEILING: NEVER schedule more than 180 minutes (3 hours) of sessions in a single day** — for typical daily practice, 60–90 minutes is sufficient. If user picked "as_recommended", target ~90 minutes.
5. **TIME-OF-DAY RULES** (set the time_of_day field on each session):
   - User's preferred slots: {times_text}.
   - Energizing codes (DNA Healing 222, Pineal/Cortex 444, Mental Clarity 636) MUST be scheduled in the MORNING.
   - Chronic Fatigue / Mental Clarity codes → morning or during_work, never evening.
   - Code 646 (Health, Wellness & Rejuvenation) is SLIGHTLY DROWSY — schedule it in the EVENING only.
   - Code 647 (Earth Resonance) is safe to run while sleeping → evening.
   - Insomnia 351 → evening.
   - **Code 444 (Pineal) must NEVER be run on consecutive days — schedule it EVERY OTHER DAY at most (Days 1, 3, 5, …).**
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
10. **MEDITATION RULES** (if primary_goal == meditation):
   - Anchor every meditation day with code 636 (Mental Clarity) run DURING the meditation session.
   - Tell the user to pause the device with any number key (1–9) when their meditation ends — the device will hold the session there.
   - For shorter 10-min sits, recommend code 444 (Pineal Gland) instead.
   - On rest days you can suggest 647 (Earth Resonance) or 351 (Calm) for evening wind-down meditation.
   - Each session.notes should remind them: "Pause with any number key (1–9) when your meditation is complete."
11. Provide a warm, friendly 2–3 sentence ai_summary addressing the user by first name.
12. Provide a short headline (max 8 words) and a daily_tip (1 sentence on hydration/sleep/breathwork).
13. Provide 3–5 practical TIPS in the tips array (hydration during/after sessions, electrode pad vs stainless cylinder choice, consistency of daily use, pause/resume guidance, when to call a coach, etc.).
14. Output STRICT JSON with this schema (no extra fields, no comments):

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
  ]{extra_schema}
}}
"""

    if not anthropic_client:
        raise HTTPException(
            status_code=503,
            detail="LLM is not configured. Set ANTHROPIC_API_KEY (sk-ant-...) in the backend environment.",
        )

    # Prefill trick: starting the assistant's response with `{` forces Claude into JSON mode
    # without any prose preamble. We re-prepend `{` to the returned text before parsing.
    conversation: List[Dict[str, str]] = [
        {"role": "user", "content": user_prompt},
        {"role": "assistant", "content": "{"},
    ]

    # Token budget per program length. With the template approach for 30-day, output stays
    # small and fast. For 1-week we keep a healthy buffer.
    max_tokens = {"one_day": 4000, "one_week": 8000, "thirty_day": 8000}.get(sub.program_length, 8000)

    async def _ask(messages: List[Dict[str, str]]) -> str:
        try:
            resp = await anthropic_client.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=max_tokens,
                system=system_msg,
                messages=messages,
            )
            text = resp.content[0].text
            stop = getattr(resp, "stop_reason", None)
            if stop == "max_tokens":
                logger.warning(
                    f"LLM hit max_tokens={max_tokens} for program_length={sub.program_length}. "
                    f"Response length={len(text)} — likely truncated."
                )
            return text
        except anthropic.AuthenticationError:
            raise HTTPException(
                status_code=503,
                detail="LLM authentication failed. Check ANTHROPIC_API_KEY is a valid sk-ant-... key.",
            )
        except anthropic.APIError as e:
            raise HTTPException(status_code=502, detail=f"LLM error: {e.message if hasattr(e, 'message') else str(e)}")

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

    response = await _ask(conversation)
    # Re-prepend the prefill `{` so the response is valid JSON from the start.
    if not response.lstrip().startswith("{"):
        response = "{" + response
    try:
        data = _extract_json(response)
    except json.JSONDecodeError as e1:
        logger.warning(
            f"LLM returned non-JSON on first attempt: {e1}. "
            f"Raw tail (last 400 chars): {response[-400:]!r}"
        )
        # Retry: ask Claude to repair / re-emit JSON only, again with prefill.
        retry_conv: List[Dict[str, str]] = [
            {"role": "user", "content": user_prompt},
            {"role": "assistant", "content": response},
            {"role": "user", "content": "Your previous response was truncated or not valid JSON. Re-emit ONLY the complete JSON object — no prose, no markdown fences. Start with { and end with }. Keep the schedule complete."},
            {"role": "assistant", "content": "{"},
        ]
        response2 = await _ask(retry_conv)
        if not response2.lstrip().startswith("{"):
            response2 = "{" + response2
        try:
            data = _extract_json(response2)
        except json.JSONDecodeError as e2:
            logger.error(
                f"LLM JSON parse failed after retry: {e2}\n"
                f"First raw tail: {response[-400:]!r}\n"
                f"Retry raw tail: {response2[-400:]!r}"
            )
            raise HTTPException(status_code=502, detail="Failed to parse plan from AI. Please try again.")

    # 30-day template expansion: take the 7-day template the LLM produced and replicate it
    # across 30 days, applying the weekly focus labels per week.
    if sub.program_length == "thirty_day":
        _expand_thirty_day_template(data)

    _normalize_schedule(data, sub)
    return data


def _expand_thirty_day_template(data: Dict[str, Any]) -> None:
    """Expand a 7-day template `schedule` to a full 30-day schedule in-place."""
    template = data.get("schedule") or []
    if len(template) >= 30:
        # Already a full 30-day plan (LLM returned full schedule); keep as-is.
        return
    if not template:
        return

    # Ensure we have exactly 7 template days. If LLM returned 1-6, pad by reusing the last.
    if len(template) < 7:
        template = template + [template[-1]] * (7 - len(template))
        template = template[:7]

    focuses = data.get("weekly_focuses") or []
    expanded: List[Dict[str, Any]] = []
    for day_num in range(1, 31):
        # Weeks 1..4 cover days 1-28; days 29-30 reuse Week 4 focus + template start.
        week_idx = min((day_num - 1) // 7, 3)
        focus = focuses[week_idx].strip() if week_idx < len(focuses) and focuses[week_idx] else ""
        template_day = template[(day_num - 1) % 7]
        # Deep-copy sessions so we don't share references across weeks.
        new_sessions = [dict(s) for s in template_day.get("sessions", [])]
        label_core = template_day.get("label") or f"Day {day_num}"
        # Strip any leading "Day N — " from the template label so we don't double up.
        if " — " in label_core:
            _, _, label_tail = label_core.partition(" — ")
        else:
            label_tail = label_core
        # Compose: "Day 8 — Week 2: Deepen the work" or fallback to just the template tail.
        if focus:
            new_label = f"Day {day_num} — {focus}"
        else:
            new_label = f"Day {day_num} — {label_tail}" if label_tail and label_tail != f"Day {(day_num-1)%7 + 1}" else f"Day {day_num}"
        expanded.append({"day": day_num, "label": new_label, "sessions": new_sessions})

    data["schedule"] = expanded
    # weekly_focuses is post-processing metadata, not part of the public plan schema.
    data.pop("weekly_focuses", None)


# Deterministic overrides for codes with special keystroke sequences or fixed durations.
# Applied AFTER the LLM responds so we don't depend on the model getting every detail right.
SPECIAL_CODE_OVERRIDES = {
    222: {"instructions": "Enter: 7, SELECT, 222, RUN", "minutes": 7},                                # single-channel DNA, 7 min
    444: {"instructions": "Press: 10, SELECT, 444, RUN", "minutes": 10, "max_per_plan": 4},           # single-channel Pineal, every other day, 10 min
    161: {"instructions": "Press: 30, SELECT, 161, RUN", "minutes": 30, "max_per_plan": 1},           # weekly
    # 646 enforcement is handled separately by _enforce_646_minimums (requires program_length context).
    646: {"instructions": "Enter: AUTO, 646, RUN", "minutes": 90},
}

CODE_646_NOTE = (
    "Run this in bed at night — perfect to do while listening to music, "
    "watching a movie, or drifting off to sleep."
)


def _normalize_schedule(data: Dict[str, Any], sub: "QuestionnaireSubmission") -> None:
    """Mutates data['schedule'] in-place to enforce special-code rules."""
    schedule = data.get("schedule") or []
    code_counts: Dict[int, int] = {}
    for day in schedule:
        kept_sessions = []
        for s in day.get("sessions", []):
            code = s.get("code")
            override = SPECIAL_CODE_OVERRIDES.get(code)
            if override:
                s["instructions"] = override["instructions"]
                s["minutes"] = override["minutes"]
                # Enforce per-plan frequency cap only for codes that have one
                cap = override.get("max_per_plan")
                if cap is not None:
                    used = code_counts.get(code, 0)
                    if used >= cap:
                        continue  # skip duplicate occurrence
                    code_counts[code] = used + 1
                # Standardize 646 evening + bedtime notes
                if code == 646:
                    s["time_of_day"] = "evening"
                    if not s.get("notes") or "bed" not in s["notes"].lower():
                        s["notes"] = CODE_646_NOTE
            kept_sessions.append(s)
        day["sessions"] = kept_sessions

    _enforce_646_minimums(schedule, sub)


def _enforce_646_minimums(schedule: List[Dict[str, Any]], sub: "QuestionnaireSubmission") -> None:
    """Guarantee Code 646 appears the required number of times for the given plan."""
    # Only enforce when the user has the daily time budget for a 90-min evening session.
    if sub.minutes_per_day not in ("sixty", "as_recommended"):
        return

    if sub.program_length == "one_week":
        required, target_days = 1, [7, 6]      # prefer Day 7, fallback Day 6
    elif sub.program_length == "thirty_day":
        required, target_days = 2, [7, 21, 14, 28]
    else:
        return  # 1-day plans skip 646

    existing = sum(
        1
        for day in schedule
        for s in day.get("sessions", [])
        if s.get("code") == 646
    )
    if existing >= required:
        return

    needed = required - existing
    injected = 0
    for day_num in target_days:
        if injected >= needed:
            break
        # Find that day (1-indexed) in the schedule
        day = next((d for d in schedule if d.get("day") == day_num), None)
        if not day:
            continue
        # Don't add a duplicate 646 on the same day
        if any(s.get("code") == 646 for s in day.get("sessions", [])):
            continue
        day.setdefault("sessions", []).append({
            "code": 646,
            "name": "Health, Wellness & Rejuvenation",
            "minutes": 90,
            "instructions": "Enter: AUTO, 646, RUN",
            "notes": CODE_646_NOTE,
            "time_of_day": "evening",
        })
        injected += 1

    # Fallback: if target_days weren't all in the schedule, append to the last available days.
    if injected < needed:
        for day in reversed(schedule):
            if injected >= needed:
                break
            if any(s.get("code") == 646 for s in day.get("sessions", [])):
                continue
            day.setdefault("sessions", []).append({
                "code": 646,
                "name": "Health, Wellness & Rejuvenation",
                "minutes": 90,
                "instructions": "Enter: AUTO, 646, RUN",
                "notes": CODE_646_NOTE,
                "time_of_day": "evening",
            })
            injected += 1


def _build_plan_html(plan: Dict[str, Any]) -> str:
    """Build a print-friendly HTML email with the plan."""
    schedule_rows = []
    for d in plan["schedule"]:
        sess_html_rows = []
        for s in d["sessions"]:
            code = s["code"]
            if code == 444:
                keystrokes = "10 &nbsp;|&nbsp; SELECT &nbsp;|&nbsp; <b>444</b> &nbsp;|&nbsp; RUN"
            elif code == 161:
                keystrokes = "30 &nbsp;|&nbsp; SELECT &nbsp;|&nbsp; <b>161</b> &nbsp;|&nbsp; RUN"
            else:
                keystrokes = f"AUTO &nbsp;|&nbsp; <b>{code}</b> &nbsp;|&nbsp; RUN"
            sess_html_rows.append(
                f"<tr><td style='padding:6px 10px;border-bottom:1px solid #EAE5D9;font-family:monospace;'>{keystrokes}</td>"
                f"<td style='padding:6px 10px;border-bottom:1px solid #EAE5D9;'>{s['name']}</td>"
                f"<td style='padding:6px 10px;border-bottom:1px solid #EAE5D9;text-align:right;'>{s['minutes']} min</td></tr>"
            )
        sessions_html = "".join(sess_html_rows)
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

    <div style="margin-top:28px;padding:20px;background:#F5F2EB;border:1px solid #EAE5D9;border-radius:12px;text-align:center;">
      <h3 style="font-family:Georgia,serif;color:#2A3439;margin:0 0 6px;font-weight:500;font-size:18px;">Want to talk through your plan?</h3>
      <p style="color:#5C6A72;font-size:13px;margin:0 0 14px;line-height:1.55;">
        To discuss your Wave Therapy personalized plan with a CuraWaves Health Coach, please book a virtual coaching session with our team.
      </p>
      <a href="https://curawaves.com/products/wellness-consultation-concierge-services"
         style="display:inline-block;background:#2C5E7A;color:#fff;text-decoration:none;font-size:13px;font-weight:500;padding:12px 22px;border-radius:30px;">
        Book a coaching session
      </a>
    </div>
    <div style="margin-top:18px;padding:20px;background:#E9F1F5;border:1px solid #C9DCE5;border-radius:12px;text-align:center;">
      <h3 style="font-family:Georgia,serif;color:#2C5E7A;margin:0 0 6px;font-weight:500;font-size:18px;">Shop Wave Therapy</h3>
      <p style="color:#5C6A72;font-size:13px;margin:0 0 14px;line-height:1.55;">
        Explore Wave Therapy machines, accessories, and concierge services at CuraWaves.
      </p>
      <a href="https://curawaves.com/collections/all"
         style="display:inline-block;background:#2C5E7A;color:#fff;text-decoration:none;font-size:13px;font-weight:500;padding:12px 22px;border-radius:30px;">
        Visit the CuraWaves shop
      </a>
    </div>
  </div>
</div>
"""


async def _send_email_async(to: str, subject: str, html: str):
    """Send via Resend. Returns dict or raises HTTPException with a friendly message."""
    if not RESEND_API_KEY or RESEND_API_KEY.startswith("re_placeholder"):
        logger.warning("RESEND_API_KEY not configured — email send skipped (returning mock).")
        return {"id": "mock-no-resend-key", "mocked": True}

    params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        return result
    except Exception as e:
        msg = str(e)
        logger.error(f"Resend send failed: {msg}")
        # Detect Resend's free-tier "verify your domain" limitation
        if "verify a domain" in msg.lower() or "can only send testing emails" in msg.lower():
            raise HTTPException(
                status_code=400,
                detail=(
                    "Resend is in test mode — emails can only be sent to your verified account email. "
                    "To send to any address, verify a domain at resend.com/domains and update SENDER_EMAIL in .env "
                    "to an address on that domain (e.g. plans@curawaves.com)."
                ),
            )
        raise HTTPException(status_code=502, detail=f"Email send failed: {msg}")


# ----------------- Routes -----------------
@api_router.get("/")
async def root():
    return {"service": "CuraWaves Onboarding API", "version": "1.0.0"}


@api_router.get("/protocols")
async def list_protocols(response: Response):
    # Static catalog — safe to cache aggressively at the edge / browser.
    response.headers["Cache-Control"] = "public, max-age=3600, s-maxage=86400"
    return {"protocols": get_all_protocols_summary()}


@api_router.get("/protocols/{key}")
async def get_protocol(key: str):
    if key not in PROTOCOLS:
        raise HTTPException(status_code=404, detail="Protocol not found")
    return PROTOCOLS[key]


@api_router.post("/questionnaire/submit", response_model=GeneratedPlan)
@limiter.limit("5/15minutes")
async def submit_questionnaire(request: Request, sub: QuestionnaireSubmission, background: BackgroundTasks):
    if not sub.consent_disclaimer:
        raise HTTPException(status_code=400, detail="You must accept the educational-use disclaimer to continue.")

    if sub.primary_goal not in PROTOCOLS:
        raise HTTPException(status_code=400, detail="Invalid primary_goal")

    # Create a "pending" plan immediately and run the LLM in the background. The frontend
    # navigates to the plan page right away and polls until status flips to "ready" — this
    # avoids any proxy/edge timeout on long generations.
    plan_id = str(uuid.uuid4())
    reminder_due = None
    if sub.has_autoimmune or sub.program_length == "thirty_day":
        reminder_due = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    # Every plan gets a testimonial reminder ~30 days after creation, regardless of
    # autoimmune flag or program length. Separate from the re-assessment reminder.
    testimonial_reminder_due = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    pending_doc = {
        "id": plan_id,
        "email": sub.email,
        "first_name": sub.first_name,
        "program_length": sub.program_length,
        "primary_protocol_key": sub.primary_goal,
        "primary_protocol_title": PROTOCOLS[sub.primary_goal]["title"],
        "ai_summary": "",
        "headline": "Generating your personalized program…",
        "daily_tip": "",
        "schedule": [],
        "safety_notes": [],
        "tips": [],
        "needs_30day_reassessment": False,
        "created_at": _now_iso(),
        "reminder_due_at": reminder_due,
        "testimonial_reminder_due_at": testimonial_reminder_due,
        "submission": sub.model_dump(),
        "status": "pending",
        "error": None,
    }
    await db.plans.insert_one(pending_doc.copy())

    background.add_task(_generate_and_finalize_plan, plan_id, sub)

    pending_doc.pop("_id", None)
    pending_doc.pop("submission", None)
    return pending_doc


async def _generate_and_finalize_plan(plan_id: str, sub: QuestionnaireSubmission) -> None:
    """Run the LLM, persist the final plan, then auto-email. Updates status to ready/failed."""
    try:
        plan_data = await _generate_plan_with_llm(sub)
        needs_reassess = bool(plan_data.get("needs_30day_reassessment")) or sub.has_autoimmune
        update = {
            "ai_summary": plan_data.get("ai_summary", ""),
            "headline": plan_data.get("headline", "Your CuraWaves Program"),
            "daily_tip": plan_data.get("daily_tip", "Stay hydrated and rest well."),
            "schedule": plan_data.get("schedule", []),
            "safety_notes": plan_data.get("safety_notes", []),
            "tips": plan_data.get("tips", []),
            "needs_30day_reassessment": needs_reassess,
            "status": "ready",
            "error": None,
        }
        await db.plans.update_one({"id": plan_id}, {"$set": update})
        await _auto_email_plan(plan_id)
    except HTTPException as e:
        logger.error(f"Plan generation failed for {plan_id}: {e.detail}")
        await db.plans.update_one(
            {"id": plan_id},
            {"$set": {"status": "failed", "error": str(e.detail)}},
        )
    except Exception as e:
        logger.exception(f"Unexpected plan generation error for {plan_id}: {e}")
        await db.plans.update_one(
            {"id": plan_id},
            {"$set": {"status": "failed", "error": "Unexpected error generating plan. Please try again."}},
        )


async def _auto_email_plan(plan_id: str) -> None:
    """Background task: email the plan right after it's ready. Best-effort, swallow errors."""
    try:
        plan = await db.plans.find_one({"id": plan_id}, {"_id": 0})
        if not plan or plan.get("status") != "ready" or not plan.get("schedule"):
            return
        html = _build_plan_html(plan)
        subject = f"Your CuraWaves Personalized Program — {plan['headline']}"
        result = await _send_email_async(plan["email"], subject, html)
        await db.plans.update_one(
            {"id": plan_id},
            {"$set": {"emailed_at": _now_iso(), "email_result_id": result.get("id"), "auto_emailed": True}},
        )
    except HTTPException as e:
        # e.g. Resend rejection — log and move on (user can still hit "Email me this plan")
        logger.warning(f"Auto-email skipped for plan {plan_id}: {e.detail}")
    except Exception as e:
        logger.error(f"Auto-email failed for plan {plan_id}: {e}")


@api_router.get("/plan/{plan_id}", response_model=GeneratedPlan)
async def get_plan(plan_id: str):
    doc = await db.plans.find_one({"id": plan_id}, {"_id": 0, "submission": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    return doc


@api_router.patch("/plan/{plan_id}/notes")
async def update_plan_notes(plan_id: str, payload: NotesUpdate):
    result = await db.plans.update_one(
        {"id": plan_id},
        {"$set": {"user_notes": payload.notes, "notes_updated_at": _now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"status": "ok", "saved_at": _now_iso()}


@api_router.get("/plan/{plan_id}/notes")
async def get_plan_notes(plan_id: str):
    doc = await db.plans.find_one({"id": plan_id}, {"_id": 0, "user_notes": 1, "notes_updated_at": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"notes": doc.get("user_notes", ""), "updated_at": doc.get("notes_updated_at")}


@api_router.get("/plan/{plan_id}/testimonial-prefill")
async def get_plan_testimonial_prefill(plan_id: str):
    """Public lightweight read so the in-app testimonial form can greet the user
    and prefill non-sensitive context (name, protocol, length). Email is intentionally
    not returned — the user re-enters it for verification."""
    doc = await db.plans.find_one(
        {"id": plan_id},
        {"_id": 0, "first_name": 1, "primary_protocol_title": 1, "program_length": 1, "testimonial_submitted_at": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {
        "first_name": doc.get("first_name", ""),
        "primary_protocol_title": doc.get("primary_protocol_title", ""),
        "program_length": doc.get("program_length", ""),
        "already_submitted": bool(doc.get("testimonial_submitted_at")),
    }


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
            <h2 style='font-family:Georgia,serif;color:#2C5E7A;margin:0 0 12px;'>Hi {plan['first_name']}, time for your 30-day check-in</h2>
            <p style='color:#2A3439;font-size:14px;line-height:1.6;margin:0 0 16px;'>You're due for a CuraWaves re-assessment. Update your symptoms and we'll refresh your program with a new personalized 30-day schedule.</p>
            <p style='margin:0 0 8px;'>
              <a href='https://wavetherapy.ai/reassess' style='background:#2C5E7A;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-size:13px;font-weight:500;display:inline-block;'>Start re-assessment</a>
            </p>
            <p style='color:#A0AAB0;font-size:11px;margin-top:22px;'>CuraWaves · Wave Therapy · For education &amp; investigative use only.</p>
          </div>
        </div>
        """
        await _send_email_async(plan["email"], "Your CuraWaves 30-day check-in", html)
        await db.plans.update_one({"id": plan["id"]}, {"$set": {"reminder_sent_at": now_iso}})
        sent += 1
    return {"reminders_sent": sent}


@api_router.post("/admin/send-testimonial-reminders")
async def admin_send_testimonial_reminders(x_admin_token: Optional[str] = Header(default=None)):
    """Cron-triggered: email plans whose testimonial_reminder_due_at is due."""
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

    now_iso = _now_iso()
    cursor = db.plans.find(
        {
            "testimonial_reminder_due_at": {"$lte": now_iso, "$ne": None},
            "testimonial_reminder_sent_at": {"$exists": False},
            # Only fully-generated plans — don't pester users whose plan never finished.
            "status": "ready",
        },
        {"_id": 0},
    )
    sent = 0
    async for plan in cursor:
        first_name = plan.get("first_name", "there")
        testimonial_url = (
            "https://wavetherapy.ai/testimonial"
            f"?plan_id={plan['id']}"
        )
        html = f"""
        <div style='font-family:Arial,sans-serif;background:#FDFBF7;padding:24px;'>
          <div style='max-width:560px;margin:0 auto;background:#fff;border:1px solid #EAE5D9;border-radius:16px;padding:28px;'>
            <h2 style='font-family:Georgia,serif;color:#2C5E7A;margin:0 0 12px;'>Hi {first_name}, how was your first 30 days?</h2>
            <p style='color:#2A3439;font-size:14px;line-height:1.6;margin:0 0 16px;'>
              It's been about a month since we generated your Wave Therapy plan — we'd love to hear how it went.
              Your experience helps others on the same journey understand what's possible.
            </p>
            <p style='margin:0 0 22px;'>
              <a href='{testimonial_url}' style='background:#D27A59;color:#fff;padding:13px 24px;border-radius:30px;text-decoration:none;font-size:14px;font-weight:500;display:inline-block;'>Share your Wave Therapy story</a>
            </p>
            <p style='color:#5C6A72;font-size:12px;line-height:1.55;margin:0 0 6px;'>
              Takes about 90 seconds — rate your experience, share a few sentences, and let us know if we can publish it on CuraWaves.
            </p>
            <p style='color:#A0AAB0;font-size:11px;margin-top:22px;'>CuraWaves · Wave Therapy · For education &amp; investigative use only.</p>
          </div>
        </div>
        """
        try:
            await _send_email_async(plan["email"], "How was your first 30 days with Wave Therapy?", html)
            await db.plans.update_one(
                {"id": plan["id"]}, {"$set": {"testimonial_reminder_sent_at": now_iso}}
            )
            sent += 1
        except HTTPException as e:
            logger.warning(f"Testimonial reminder skipped for plan {plan['id']}: {e.detail}")
        except Exception as e:
            logger.error(f"Testimonial reminder failed for plan {plan['id']}: {e}")
    return {"testimonial_reminders_sent": sent}


@api_router.post("/testimonials")
@limiter.limit("5/hour")
async def submit_testimonial(request: Request, sub: TestimonialSubmission):
    """Public endpoint — customers submit their testimonial. Rate limited to deter abuse."""
    testimonial_id = str(uuid.uuid4())
    primary_goal = sub.primary_goal
    plan_program_length = None
    # If linked to a real plan, opportunistically denormalize the primary protocol so the
    # admin dashboard can filter / display nice context.
    if sub.plan_id:
        plan = await db.plans.find_one({"id": sub.plan_id}, {"_id": 0, "primary_protocol_key": 1, "primary_protocol_title": 1, "program_length": 1})
        if plan:
            primary_goal = primary_goal or plan.get("primary_protocol_title", "")
            plan_program_length = plan.get("program_length")
            # Mark the plan so the admin sees a testimonial was received and we don't
            # send another reminder.
            await db.plans.update_one(
                {"id": sub.plan_id},
                {"$set": {
                    "testimonial_submitted_at": _now_iso(),
                    "testimonial_id": testimonial_id,
                    # Ensure we don't re-send a reminder later
                    "testimonial_reminder_sent_at": _now_iso(),
                }},
            )

    doc = {
        "id": testimonial_id,
        "first_name": sub.first_name.strip(),
        "email": sub.email,
        "rating": sub.rating,
        "headline": sub.headline.strip(),
        "story": sub.story.strip(),
        "primary_goal": primary_goal,
        "allow_publish": sub.allow_publish,
        "plan_id": sub.plan_id,
        "plan_program_length": plan_program_length,
        "created_at": _now_iso(),
        "ip": _rate_limit_key(request),
    }
    await db.testimonials.insert_one(doc.copy())
    doc.pop("_id", None)
    doc.pop("ip", None)
    return {"status": "ok", "id": testimonial_id}


@api_router.get("/admin/testimonials")
async def admin_testimonials(x_admin_token: Optional[str] = Header(default=None)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    docs = await db.testimonials.find({}, {"_id": 0, "ip": 0}).sort("created_at", -1).to_list(1000)
    avg = round(sum(d.get("rating", 0) for d in docs) / len(docs), 2) if docs else 0
    return {"count": len(docs), "average_rating": avg, "testimonials": docs}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def ensure_indexes():
    """Create MongoDB indexes if they don't already exist. Idempotent."""
    try:
        await db.plans.create_index("id", unique=True)
        await db.plans.create_index("email")
        await db.plans.create_index("created_at")
        await db.plans.create_index("reminder_due_at")
        await db.plans.create_index("testimonial_reminder_due_at")
        await db.testimonials.create_index("id", unique=True)
        await db.testimonials.create_index("email")
        await db.testimonials.create_index("created_at")
        await db.testimonials.create_index("plan_id")
        logger.info("MongoDB indexes ensured on plans + testimonials collections.")
    except Exception as e:
        logger.warning(f"Index creation skipped: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
