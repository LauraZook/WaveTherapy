"""
Curated Wave Therapy protocol catalog grouped by the 5 categories used in the
CuraWaves onboarding app. Codes are drawn from the official Wave Therapy Manual.

Each entry includes:
  - code: int (the AUTO code number)
  - name: short human-readable name
  - minutes: recommended run time
  - targets: what it addresses (used by the LLM to pick the right code)
"""

PROTOCOLS = {
    "health_wellness": {
        "title": "Health & Wellness",
        "description": "Balance brain, heart and whole body. Daily vitality, sleep, rejuvenation.",
        "codes": [
            {"code": 646, "name": "Health, Wellness & Rejuvenation", "minutes": 30, "targets": "general vitality, cellular regeneration — NOTE: slightly drowsy; recommend EVENING only"},
            {"code": 647, "name": "General Health & Wellness (Earth Resonance)", "minutes": 30, "targets": "stress, EMF neutralization, sleep deprivation, immune support — safe to run while sleeping (evening)"},
            {"code": 222, "name": "DNA Healing & Cellular Rejuvenation (Energizing)", "minutes": 4, "targets": "DNA repair, cellular rejuvenation — ENERGIZING, recommend MORNING; every 3rd day x 40 sessions"},
            {"code": 444, "name": "Pineal Gland & Cortex Rejuvenation (Energizing)", "minutes": 10, "targets": "mental clarity, third eye, brain support — ENERGIZING, recommend MORNING; run EVERY OTHER DAY only (not daily) x 40 days"},
            {"code": 636, "name": "Mental Clarity (Energizing)", "minutes": 45, "targets": "focus, mental sharpness, brain fog — ENERGIZING, recommend MORNING or during_work"},
            {"code": 638, "name": "Memory", "minutes": 27, "targets": "memory, cognitive recall — morning preferred"},
            {"code": 351, "name": "Insomnia / Healthy Sleep", "minutes": 24, "targets": "sleep onset, insomnia — EVENING only"},
            {"code": 235, "name": "Mood Support (Outside circumstances)", "minutes": 9, "targets": "low mood, situational stress"},
        ],
    },
    "pain_inflammation": {
        "title": "Pain & Inflammation",
        "description": "Acute and chronic pain, inflammation, arthritis, headaches, muscular pain.",
        "codes": [
            {"code": 111, "name": "Acute Pain (General Inflammation)", "minutes": 33, "targets": "acute pain, inflammation"},
            {"code": 110, "name": "Acute Pain (Viral/Bacterial involvement)", "minutes": 48, "targets": "acute pain with infection component"},
            {"code": 425, "name": "Pain (General)", "minutes": 15, "targets": "general pain relief"},
            {"code": 641, "name": "Pain — Lower Back & Extremities", "minutes": 60, "targets": "low back pain, sciatica-like pain, extremities"},
            {"code": 388, "name": "Muscular Pain (General)", "minutes": 48, "targets": "muscle soreness, general muscular pain"},
            {"code": 274, "name": "Fibromyalgia (Pain & Inflammation)", "minutes": 30, "targets": "fibromyalgia, FULL-BODY chronic pain — anchor code for chronic pain, run DAILY"},
            {"code": 307, "name": "Migraine Headaches", "minutes": 15, "targets": "migraines"},
            {"code": 308, "name": "Headaches (Viral/Bacterial)", "minutes": 69, "targets": "tension/sinus headaches"},
            {"code": 192, "name": "Bursitis", "minutes": 12, "targets": "bursitis, joint inflammation"},
            {"code": 154, "name": "Arthritis (Viral)", "minutes": 33, "targets": "viral-driven arthritis pain — alternate with 155"},
            {"code": 155, "name": "Arthritis (Bacterial)", "minutes": 33, "targets": "bacterial-driven arthritis pain — alternate with 154"},
            {"code": 159, "name": "Arthritic Pain (Elbow)", "minutes": 18, "targets": "elbow / joint arthritis pain — also for tendonitis arms"},
            {"code": 298, "name": "Gout / Uric Acid / Arthritis", "minutes": 21, "targets": "uric acid, joint pain alternation"},
            {"code": 427, "name": "Joint Pain (Inflammation)", "minutes": 36, "targets": "joint pain, knee, hip, shoulder"},
            {"code": 465, "name": "Sciatica", "minutes": 27, "targets": "sciatica, nerve pain in leg"},
            {"code": 400, "name": "Stiff Neck", "minutes": 9, "targets": "neck stiffness"},
            {"code": 488, "name": "Stiff Muscles", "minutes": 69, "targets": "general stiffness"},
            {"code": 410, "name": "Neuralgia", "minutes": 15, "targets": "nerve pain, carpal tunnel-like, wrist nerve"},
            {"code": 514, "name": "Tendomyopathy", "minutes": 54, "targets": "tendonitis, tendon pain — wrists, forearms, elbows"},
        ],
    },
    "detoxification": {
        "title": "Detoxification",
        "description": "Clear toxins, heavy metals, support liver/kidney/lymph cleansing. Week 1 = general body cleanse every other day; later weeks rotate organ-specific codes.",
        "codes": [
            {"code": 237, "name": "General Detoxification", "minutes": 33, "targets": "whole-body detox starter — anchor of Week 1, every other day"},
            {"code": 574, "name": "Body Detox (Full Body)", "minutes": 33, "targets": "deep full-body detox"},
            {"code": 579, "name": "Liver Balance & Cleanse", "minutes": 33, "targets": "Week 2 anchor — liver focus"},
            {"code": 580, "name": "Kidney Balance & Cleanse", "minutes": 33, "targets": "Week 3 anchor — kidney focus"},
            {"code": 577, "name": "Liver Detox", "minutes": 33, "targets": "deep liver detox, hepatic cleanse"},
            {"code": 578, "name": "Kidney Detox", "minutes": 33, "targets": "deep kidney detox"},
            {"code": 495, "name": "Brain Detox", "minutes": 33, "targets": "brain / cognitive detox"},
            {"code": 575, "name": "Lymph Stasis Cleanse", "minutes": 33, "targets": "lymphatic drainage support"},
            {"code": 581, "name": "Parasite Cleanse", "minutes": 33, "targets": "parasite cleanse"},
            {"code": 576, "name": "Auto-Immune Presence Cleanse", "minutes": 33, "targets": "autoimmune cleanse support"},
            {"code": 583, "name": "Liver / Intestine Cleanse", "minutes": 33, "targets": "liver + gut cleanse"},
            {"code": 582, "name": "Kidney Fluke", "minutes": 33, "targets": "kidney fluke parasite"},
            {"code": 584, "name": "Pancreatic Fluke", "minutes": 33, "targets": "pancreatic fluke parasite"},
            {"code": 648, "name": "Mercury Detox", "minutes": 6, "targets": "mercury / heavy metal detox"},
            {"code": 642, "name": "Pesticides Detox", "minutes": 15, "targets": "pesticide / chemical exposure"},
            {"code": 643, "name": "Poison Ivy / Topical Toxins", "minutes": 6, "targets": "topical toxin exposure"},
            {"code": 377, "name": "Lymph Stasis (Lymphatic Drainage)", "minutes": 33, "targets": "lymph drainage, light off-day session"},
            {"code": 367, "name": "Hypothalamus Cleanse", "minutes": 12, "targets": "hormonal balance, hypothalamus detox; every 2nd day x 6"},
            {"code": 374, "name": "Lungs Cleanse & Rejuvenation", "minutes": 45, "targets": "lung cleanse, respiratory detox"},
            {"code": 161, "name": "Cellular Cleanse & Restoration", "minutes": 60, "targets": "cellular-level cleanse and restoration"},
        ],
    },
    "immune_boost": {
        "title": "Immune System Boost",
        "description": "Strengthen immune response to viruses, bacteria, chronic infections.",
        "codes": [
            {"code": 647, "name": "Immune & Stress Support (Earth Resonance)", "minutes": 30, "targets": "immune support, particularly helpful for Lyme; safe while sleeping"},
            {"code": 265, "name": "Epstein Barr", "minutes": 42, "targets": "EBV, chronic viral fatigue"},
            {"code": 282, "name": "Influenza, Early Stage (Viral)", "minutes": 33, "targets": "early flu / viral onset"},
            {"code": 283, "name": "Influenza, Late Stage (Bacterial)", "minutes": 27, "targets": "late-stage flu / secondary bacterial"},
            {"code": 348, "name": "Bacterial Infection", "minutes": 51, "targets": "general bacterial infection support"},
            {"code": 349, "name": "Parasitic Infection", "minutes": 36, "targets": "parasite cleanse"},
            {"code": 480, "name": "Sore Throat (Viral/Bacterial)", "minutes": 57, "targets": "sore throat"},
            {"code": 411, "name": "Nose Infection / Congestion", "minutes": 45, "targets": "sinus, congestion"},
            {"code": 468, "name": "Sinusitis", "minutes": 27, "targets": "sinusitis"},
            {"code": 162, "name": "Asthma (Inflammation)", "minutes": 33, "targets": "asthma, respiratory inflammation"},
            {"code": 506, "name": "Swollen Glands", "minutes": 27, "targets": "swollen lymph nodes"},
            {"code": 506, "name": "Lymph Stasis", "minutes": 33, "targets": "lymph support for immunity"},
        ],
    },
    "repair_recovery": {
        "title": "Repair & Recovery",
        "description": "Post-surgery, injury recovery, fractures, sports performance, tissue repair.",
        "codes": [
            {"code": 502, "name": "Surgery (Pre/Active)", "minutes": 57, "targets": "surgical site support"},
            {"code": 503, "name": "Surgery, Post-op", "minutes": 21, "targets": "post-surgery recovery"},
            {"code": 504, "name": "Surgery — Detoxification", "minutes": 27, "targets": "clear anesthesia / post-op toxins"},
            {"code": 285, "name": "Fractures", "minutes": 24, "targets": "bone fractures, healing"},
            {"code": 180, "name": "Bone Trauma", "minutes": 24, "targets": "bone trauma recovery"},
            {"code": 190, "name": "Bruise", "minutes": 9, "targets": "bruises, hematoma"},
            {"code": 191, "name": "Burns", "minutes": 21, "targets": "burns recovery"},
            {"code": 287, "name": "Frozen Shoulder", "minutes": 21, "targets": "frozen shoulder, range-of-motion"},
            {"code": 463, "name": "Scars", "minutes": 9, "targets": "scar tissue, healing"},
            {"code": 470, "name": "Slipped Discs (Strep/Staph)", "minutes": 15, "targets": "disc injury recovery"},
            {"code": 514, "name": "Tendomyopathy", "minutes": 54, "targets": "tendon / tendinopathy"},
            {"code": 394, "name": "Muscle Spasms", "minutes": 30, "targets": "muscle spasms, cramps"},
            {"code": 322, "name": "Heart — Bacterial/Parasite Support", "minutes": 48, "targets": "deeper cardio recovery"},
            {"code": 397, "name": "Muscle Tremors", "minutes": 39, "targets": "Parkinson's-like tremors, muscle control"},
        ],
    },
    "meditation": {
        "title": "Deep Meditation",
        "description": "Run a focused, energizing or calming code DURING your meditation session. Pause anytime by pressing any number key (1–9) when your meditation is complete — the device pauses where you left off.",
        "codes": [
            {"code": 636, "name": "Mental Clarity (Meditation Companion)", "minutes": 45, "targets": "PRIMARY meditation companion — run during a 20–45 min sit; pause with any number key when complete"},
            {"code": 444, "name": "Pineal Gland & Cortex Rejuvenation", "minutes": 10, "targets": "third-eye / awareness support — great for shorter 10-min meditations"},
            {"code": 222, "name": "DNA Healing & Cellular Rejuvenation", "minutes": 4, "targets": "short pre-meditation primer"},
            {"code": 647, "name": "Earth Resonance (Calm Focus)", "minutes": 30, "targets": "calmer breath-focused meditation, evenings"},
            {"code": 351, "name": "Calm / Insomnia Soothe", "minutes": 24, "targets": "deeply calming for body-scan or yoga-nidra style meditation"},
            {"code": 235, "name": "Mood Support", "minutes": 9, "targets": "uplift before meditation"},
        ],
    },
}


def get_all_protocols_summary():
    """Return a compact JSON-serializable summary used in landing/admin views."""
    out = []
    for key, p in PROTOCOLS.items():
        out.append({
            "key": key,
            "title": p["title"],
            "description": p["description"],
            "code_count": len(p["codes"]),
            "sample_codes": [c["code"] for c in p["codes"][:5]],
        })
    return out


def build_llm_context() -> str:
    """Build a compact text context of all categories + codes for the LLM."""
    lines = []
    for key, p in PROTOCOLS.items():
        lines.append(f"\n## {p['title']} (key={key})")
        lines.append(p["description"])
        for c in p["codes"]:
            lines.append(f"- Code {c['code']}: {c['name']} — {c['minutes']} min. Targets: {c['targets']}")
    return "\n".join(lines)
