import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Activity, Droplets, Shield, Zap, Brain } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";

const GOALS = [
  { key: "health_wellness", label: "Health & Wellness", desc: "Daily vitality, sleep, mental clarity, anti-aging", Icon: Sparkles },
  { key: "pain_inflammation", label: "Pain & Inflammation", desc: "Acute or chronic pain, arthritis, migraines, muscular pain", Icon: Activity },
  { key: "detoxification", label: "Detoxification", desc: "Liver/kidney/lymph cleanse, heavy metals, chemicals", Icon: Droplets },
  { key: "immune_boost", label: "Immune Boost", desc: "Viral/bacterial support, chronic infections, EBV, Lyme", Icon: Shield },
  { key: "repair_recovery", label: "Repair & Recovery", desc: "Surgery, injury, fractures, sports performance", Icon: Zap },
  { key: "meditation", label: "Deep Meditation", desc: "Run Mental Clarity during meditation; pause when complete", Icon: Brain },
];

const SYMPTOMS = [
  "Chronic pain", "Acute pain", "Headaches / migraines", "Sleep issues", "Fatigue",
  "Muscle tension", "Joint stiffness", "Brain fog", "Stress / anxiety", "Digestive issues",
  "Sinus / congestion", "Skin issues", "Recovery from injury", "Post-surgery", "Other",
];

const STEPS = ["About you", "Your goal", "Symptoms", "Schedule", "Health flags", "Program length", "Review"];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    email: "",
    age: 35,
    sex: "",
    primary_goal: "",
    symptoms: [],
    symptom_details: "",
    severity: 5,
    duration: "months",
    pain_location: "",
    minutes_per_day: "as_recommended",
    preferred_times: [],
    has_autoimmune: false,
    autoimmune_details: "",
    medications: "",
    pregnancy_or_pacemaker: false,
    lifestyle_notes: "",
    program_length: "one_week",
    consent_disclaimer: false,
  });

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleSymptom = (s) =>
    setForm((p) => ({
      ...p,
      symptoms: p.symptoms.includes(s) ? p.symptoms.filter((x) => x !== s) : [...p.symptoms, s],
    }));
  const toggleTime = (t) =>
    setForm((p) => ({
      ...p,
      preferred_times: p.preferred_times.includes(t)
        ? p.preferred_times.filter((x) => x !== t)
        : [...p.preferred_times, t],
    }));

  const canNext = () => {
    if (step === 0) return form.first_name.trim() && form.email.trim() && form.age > 0;
    if (step === 1) return !!form.primary_goal;
    if (step === 2) return true;
    if (step === 3) return !!form.minutes_per_day;  // schedule
    if (step === 4) return true;  // health flags
    if (step === 5) return !!form.program_length;
    if (step === 6) return form.consent_disclaimer;
    return false;
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (!form.consent_disclaimer) {
      toast.error("Please accept the educational-use disclaimer.");
      return;
    }
    const messages = [
      "Reviewing your answers…",
      "Selecting the right Wave Therapy codes…",
      "Optimizing your schedule and timing…",
      "Adding tips and safety notes…",
      "Finalizing your personalized program…",
    ];
    let idx = 0;
    setLoadingMsg(messages[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setLoadingMsg(messages[idx]);
    }, 4000);

    setSubmitting(true);
    try {
      const { data } = await api.post("/questionnaire/submit", form);
      toast.success("Your personalized program is ready.");
      navigate(`/plan/${data.id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not generate plan. Please try again.");
    } finally {
      clearInterval(interval);
      setLoadingMsg("");
      setSubmitting(false);
    }
  };

  const waitEstimate = {
    one_day: "≈ 15 seconds",
    one_week: "≈ 30–45 seconds",
    thirty_day: "up to ~90 seconds — we're building all 30 days",
  }[form.program_length];

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="bg-paper min-h-[calc(100vh-200px)] py-10 md:py-16">
      <div className="max-w-2xl mx-auto px-6">
        <div className="mb-8 text-center">
          <p className="text-xs tracking-[0.25em] uppercase text-sage font-semibold mb-2">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
          <div className="h-1 bg-[#F5F2EB] w-full rounded-full overflow-hidden">
            <div
              data-testid="onboarding-progress"
              className="h-full bg-ocean transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div
          data-testid="onboarding-card"
          className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#EAE5D9] animate-fade-up"
          key={step}
        >
          {/* Step 0 */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="font-serif text-3xl text-ink mb-1">Let&apos;s get to know your goals</h2>
              <p className="text-ink-muted text-sm">We&apos;ll only use this info to personalize your Wave Therapy plan and deliver to you.</p>
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-ink-muted">First name</span>
                  <input
                    data-testid="input-first-name"
                    className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
                    value={form.first_name}
                    onChange={(e) => setF("first_name", e.target.value)}
                    placeholder="Jane"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-ink-muted">Email</span>
                  <input
                    data-testid="input-email"
                    type="email"
                    className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
                    value={form.email}
                    onChange={(e) => setF("email", e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-ink-muted">Age</span>
                  <input
                    data-testid="input-age"
                    type="number"
                    min={1} max={120}
                    className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
                    value={form.age}
                    onChange={(e) => setF("age", parseInt(e.target.value || 0, 10))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-ink-muted">Sex</span>
                  <select
                    data-testid="input-sex"
                    className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
                    value={form.sex}
                    onChange={(e) => setF("sex", e.target.value)}
                  >
                    <option value="" disabled>Select option</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-serif text-3xl text-ink mb-1">What&apos;s your primary goal?</h2>
              <p className="text-ink-muted text-sm">Pick the area you&apos;d most like Wave Therapy to support.</p>
              <div className="grid gap-3 pt-2">
                {GOALS.map(({ key, label, desc, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    data-testid={`goal-option-${key}`}
                    onClick={() => setF("primary_goal", key)}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      form.primary_goal === key
                        ? "border-ocean bg-ocean-light/40"
                        : "border-[#EAE5D9] hover:border-ocean/40 bg-white"
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      form.primary_goal === key ? "bg-ocean text-white" : "bg-cream text-ink-muted"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="font-semibold text-ink">{label}</div>
                      <div className="text-sm text-ink-muted">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-serif text-3xl text-ink mb-1">What are you experiencing?</h2>
              <p className="text-ink-muted text-sm">Tap any symptoms that apply. Add details below if helpful.</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {SYMPTOMS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-testid={`symptom-${s.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                    onClick={() => toggleSymptom(s)}
                    className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                      form.symptoms.includes(s)
                        ? "bg-ocean text-white border-ocean"
                        : "bg-white text-ink-muted border-[#EAE5D9] hover:border-ocean/40"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <label className="block pt-3">
                <span className="text-xs uppercase tracking-wider text-ink-muted">Anything specific to add</span>
                <textarea
                  data-testid="input-symptom-details"
                  className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none min-h-[80px]"
                  value={form.symptom_details}
                  onChange={(e) => setF("symptom_details", e.target.value)}
                  placeholder="e.g. lower back pain after long drives, started 6 months ago"
                />
              </label>
              {form.primary_goal === "pain_inflammation" && (
                <label className="block pt-1">
                  <span className="text-xs uppercase tracking-wider text-ink-muted">Where is the pain? (optional)</span>
                  <input
                    data-testid="input-pain-location"
                    className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
                    value={form.pain_location}
                    onChange={(e) => setF("pain_location", e.target.value)}
                    placeholder="e.g. wrists (carpal tunnel), elbow (tendonitis), lower back, knees — or leave blank for full-body"
                  />
                  <span className="text-xs text-ink-muted mt-1 block">
                    Localized pain gets targeted codes alternated with arthritis codes. Full-body/chronic → daily fibromyalgia code 274.
                  </span>
                </label>
              )}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-ink-muted">Severity: <span className="text-ocean font-semibold">{form.severity}/10</span></span>
                  <input
                    data-testid="input-severity"
                    type="range" min={1} max={10}
                    className="mt-2 w-full accent-ocean"
                    value={form.severity}
                    onChange={(e) => setF("severity", parseInt(e.target.value, 10))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-ink-muted">Duration</span>
                  <select
                    data-testid="input-duration"
                    className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
                    value={form.duration}
                    onChange={(e) => setF("duration", e.target.value)}
                  >
                    <option value="less_than_week">Less than a week</option>
                    <option value="weeks">A few weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* Step 3 — Schedule */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-serif text-3xl text-ink mb-1">Your schedule</h2>
              <p className="text-ink-muted text-sm">We&apos;ll match session timing to your day so you actually use it.</p>

              <div className="pt-2">
                <span className="text-xs uppercase tracking-wider text-ink-muted">Time available per day</span>
                <div className="mt-2 grid sm:grid-cols-3 gap-3">
                  {[
                    { key: "thirty", label: "30 min", desc: "Quick daily session" },
                    { key: "sixty", label: "60 min", desc: "Solid daily commitment" },
                    { key: "as_recommended", label: "As recommended", desc: "Follow the protocol fully" },
                  ].map(({ key, label, desc }) => (
                    <button
                      key={key}
                      type="button"
                      data-testid={`minutes-${key}`}
                      onClick={() => setF("minutes_per_day", key)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        form.minutes_per_day === key
                          ? "border-ocean bg-ocean-light/40"
                          : "border-[#EAE5D9] hover:border-ocean/40 bg-white"
                      }`}
                    >
                      <div className="font-serif text-xl text-ink">{label}</div>
                      <div className="text-xs text-ink-muted mt-1">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs uppercase tracking-wider text-ink-muted">When can you run sessions? (pick any)</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { key: "morning", label: "Morning" },
                    { key: "during_work", label: "During work" },
                    { key: "afternoon", label: "Afternoon" },
                    { key: "evening", label: "Evening" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      data-testid={`time-${key}`}
                      onClick={() => toggleTime(key)}
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                        form.preferred_times.includes(key)
                          ? "bg-ocean text-white border-ocean"
                          : "bg-white text-ink-muted border-[#EAE5D9] hover:border-ocean/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-ink-muted mt-2 block">
                  Energizing codes (DNA, brain) are scheduled in the morning. Drowsy codes like Health & Wellness 646 are placed in the evening.
                </span>
              </div>
            </div>
          )}

          {/* Step 4 — Health flags */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-serif text-3xl text-ink mb-1">Health flags</h2>
              <p className="text-ink-muted text-sm">A couple of safety questions so we can recommend appropriately.</p>
              <label className="flex items-start gap-3 p-4 border border-[#EAE5D9] rounded-xl cursor-pointer bg-white">
                <input
                  data-testid="input-autoimmune"
                  type="checkbox"
                  className="mt-1 w-4 h-4 accent-ocean"
                  checked={form.has_autoimmune}
                  onChange={(e) => setF("has_autoimmune", e.target.checked)}
                />
                <span>
                  <span className="block font-semibold text-ink">I have an autoimmune or complex chronic condition</span>
                  <span className="block text-sm text-ink-muted">e.g. Lyme, Hashimoto&apos;s, lupus, fibromyalgia, MS — we&apos;ll schedule a 30-day re-assessment.</span>
                </span>
              </label>
              {form.has_autoimmune && (
                <textarea
                  data-testid="input-autoimmune-details"
                  className="w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none min-h-[70px]"
                  value={form.autoimmune_details}
                  onChange={(e) => setF("autoimmune_details", e.target.value)}
                  placeholder="Briefly describe your condition"
                />
              )}
              <label className="flex items-start gap-3 p-4 border border-[#EAE5D9] rounded-xl cursor-pointer bg-white">
                <input
                  data-testid="input-safety"
                  type="checkbox"
                  className="mt-1 w-4 h-4 accent-ocean"
                  checked={form.pregnancy_or_pacemaker}
                  onChange={(e) => setF("pregnancy_or_pacemaker", e.target.checked)}
                />
                <span>
                  <span className="block font-semibold text-ink">I am pregnant OR have a pacemaker / implanted electronic device</span>
                  <span className="block text-sm text-ink-muted">We&apos;ll flag this so you discuss with your physician first.</span>
                </span>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink-muted">Current medications (optional)</span>
                <input
                  data-testid="input-medications"
                  className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
                  value={form.medications}
                  onChange={(e) => setF("medications", e.target.value)}
                  placeholder="e.g. blood pressure meds, NSAIDs"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink-muted">Lifestyle notes (optional)</span>
                <input
                  data-testid="input-lifestyle"
                  className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
                  value={form.lifestyle_notes}
                  onChange={(e) => setF("lifestyle_notes", e.target.value)}
                  placeholder="e.g. work from home, exercise 3x/week"
                />
              </label>
            </div>
          )}

          {/* Step 5 — Program length */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="font-serif text-3xl text-ink mb-1">Choose a program length</h2>
              <p className="text-ink-muted text-sm">Start small or commit to 30 days for deeper, lasting change.</p>
              <div className="grid gap-3 pt-2">
                {[
                  { key: "one_day", label: "1 Day", desc: "Try-it: 2–4 sessions to feel the device today." },
                  { key: "one_week", label: "1 Week", desc: "7 days of staggered sessions for steady results." },
                  { key: "thirty_day", label: "30 Days", desc: "Deep, consistent program for a whole-body reset, detoxification or to address chronic symptoms. We recommend an auto re-assessment to optimize every 30 days." },
                ].map(({ key, label, desc }) => (
                  <button
                    key={key}
                    type="button"
                    data-testid={`program-length-${key}`}
                    onClick={() => setF("program_length", key)}
                    className={`flex items-center justify-between p-5 rounded-xl border-2 text-left transition-all ${
                      form.program_length === key
                        ? "border-ocean bg-ocean-light/40"
                        : "border-[#EAE5D9] hover:border-ocean/40 bg-white"
                    }`}
                  >
                    <div>
                      <div className="font-serif text-2xl text-ink">{label}</div>
                      <div className="text-sm text-ink-muted mt-1">{desc}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      form.program_length === key ? "bg-ocean border-ocean" : "border-[#D5CEBC]"
                    }`}></div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 6 — Review */}
          {step === 6 && (
            <div className="space-y-5">
              <h2 className="font-serif text-3xl text-ink mb-1">Review &amp; consent</h2>
              <p className="text-ink-muted text-sm">A quick check before we generate your personalized program.</p>
              <div className="bg-cream/60 border border-[#EAE5D9] rounded-xl p-5 text-sm space-y-2">
                <div><span className="text-ink-muted">Name:</span> <span className="text-ink font-medium">{form.first_name || "—"}</span></div>
                <div><span className="text-ink-muted">Email:</span> <span className="text-ink font-medium">{form.email || "—"}</span></div>
                <div><span className="text-ink-muted">Primary goal:</span> <span className="text-ink font-medium">{GOALS.find(g => g.key === form.primary_goal)?.label || "—"}</span></div>
                <div><span className="text-ink-muted">Symptoms:</span> <span className="text-ink font-medium">{form.symptoms.length ? form.symptoms.join(", ") : "—"}</span></div>
                {form.pain_location && <div><span className="text-ink-muted">Pain location:</span> <span className="text-ink font-medium">{form.pain_location}</span></div>}
                <div><span className="text-ink-muted">Severity:</span> <span className="text-ink font-medium">{form.severity}/10</span></div>
                <div><span className="text-ink-muted">Time per day:</span> <span className="text-ink font-medium">{form.minutes_per_day === "thirty" ? "30 min" : form.minutes_per_day === "sixty" ? "60 min" : "As recommended"}</span></div>
                <div><span className="text-ink-muted">Preferred times:</span> <span className="text-ink font-medium">{form.preferred_times.length ? form.preferred_times.join(", ").replace(/_/g, " ") : "Any time"}</span></div>
                <div><span className="text-ink-muted">Program length:</span> <span className="text-ink font-medium">{form.program_length.replace("_", " ")}</span></div>
                {form.has_autoimmune && <div className="text-terracotta">Autoimmune flagged — 30-day re-assessment included.</div>}
                {form.pregnancy_or_pacemaker && <div className="text-terracotta">Safety flag noted.</div>}
              </div>
              <label className="flex items-start gap-3 p-4 border-2 border-[#EAE5D9] rounded-xl cursor-pointer bg-white">
                <input
                  data-testid="input-consent"
                  type="checkbox"
                  className="mt-1 w-4 h-4 accent-ocean"
                  checked={form.consent_disclaimer}
                  onChange={(e) => setF("consent_disclaimer", e.target.checked)}
                />
                <span className="text-sm text-ink-muted leading-relaxed">
                  I understand this site is for <strong className="text-ink">education and investigative use only</strong>. The Wave Therapy device is not intended to diagnose,
                  treat, cure or prevent any disease. I will consult my healthcare provider for medical concerns.
                </span>
              </label>
            </div>
          )}

          {/* Nav */}
          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              data-testid="onboarding-back"
              onClick={back}
              disabled={step === 0}
              className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ocean disabled:opacity-30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                data-testid="onboarding-next"
                onClick={next}
                disabled={!canNext()}
                className="inline-flex items-center gap-2 bg-ocean hover:bg-ocean-dark disabled:opacity-50 text-white font-medium px-6 py-3 rounded-full transition-colors"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                data-testid="onboarding-submit"
                onClick={submit}
                disabled={!canNext() || submitting}
                className="inline-flex items-center gap-2 bg-ocean hover:bg-ocean-dark disabled:opacity-50 text-white font-medium px-6 py-3 rounded-full transition-colors"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <>Generate my plan <ArrowRight className="w-4 h-4" /></>}
              </button>
            )}
          </div>

          {submitting && (
            <div className="mt-6 bg-ocean-light/50 border border-ocean/20 rounded-xl p-4 text-sm text-ocean animate-fade-in" data-testid="onboarding-loading-banner">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="font-medium">{loadingMsg}</span>
              </div>
              <p className="text-xs text-ink-muted mt-2 pl-6">
                Estimated wait: {waitEstimate}. We'll also email a copy to <strong>{form.email}</strong> when it's ready.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
