import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, Mail, ArrowRight, AlertTriangle, Loader2, CheckCircle2, BookOpen, Sun, Moon, Briefcase, Cloud, Lightbulb, Download, NotebookPen, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import CodeChip from "../components/CodeChip";

const LENGTH_LABEL = { one_day: "One-Time", one_week: "1-Week", thirty_day: "30-Day" };

const TIME_BADGE = {
  morning: { label: "Morning", Icon: Sun, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  during_work: { label: "During work", Icon: Briefcase, cls: "bg-sky-50 text-sky-700 border-sky-200" },
  afternoon: { label: "Afternoon", Icon: Cloud, cls: "bg-stone-50 text-stone-700 border-stone-200" },
  evening: { label: "Evening", Icon: Moon, cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

const SETUP_STEPS = [
  { title: "Connect power", body: "Plug the power cord into the back of the machine, then into a wall outlet." },
  { title: "Choose your accessory", body: "Stainless Steel Cylinders (larger black cord, banana plugs in the right and left side of the machine) for full-body sessions, OR Electrode Pads (thin black cord plugs in the back of the machine like the power cord) — place pads on the left/right or front/back of the target area." },
  { title: "Enter your code", body: "Press AUTO, type the Code number, then press RUN. The session starts automatically." },
  { title: "Pause & resume", body: "Press any number key (1–9) to pause. Press RUN to resume right where you left off." },
];

export default function PlanResult() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [emailedAt, setEmailedAt] = useState(null);
  const [view, setView] = useState("detail");  // "detail" | "grid"
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState("Reviewing your answers…");

  // Poll the plan until status flips off "pending". Backend generates async on Railway —
  // this avoids any proxy/edge timeout on long-running 30-day generations.
  useEffect(() => {
    let cancelled = false;
    if (!id || id === "undefined") {
      setLoading(false);
      return () => { cancelled = true; };
    }
    let pollDelayMs = 2500;
    let timeoutHandle;

    const tick = async () => {
      try {
        const { data } = await api.get(`/plan/${id}`);
        if (cancelled) return;
        if (!data || !data.id) {
          toast.error("Plan not found.");
          setLoading(false);
          return;
        }
        if (data.status === "failed") {
          toast.error(data.error || "Plan generation failed. Please try again.");
          setPlan(data);
          setLoading(false);
          return;
        }
        if (data.status === "pending") {
          // keep polling
          timeoutHandle = setTimeout(tick, pollDelayMs);
          return;
        }
        // status === "ready" (or legacy plans without status field)
        setPlan(data);
        setLoading(false);
      } catch (e) {
        // Transient error — keep polling a couple more times before giving up
        if (!cancelled) timeoutHandle = setTimeout(tick, pollDelayMs);
      }
    };

    tick();

    // Notes are optional — failing here shouldn't surface an error
    (async () => {
      try {
        const notesRes = await api.get(`/plan/${id}/notes`);
        if (!cancelled) setNotes(notesRes.data.notes || "");
      } catch (_e) { /* ignore — empty notes is the default state */ }
    })();

    return () => { cancelled = true; if (timeoutHandle) clearTimeout(timeoutHandle); };
  }, [id]);

  // Rotating loading messages while we wait for the plan.
  useEffect(() => {
    if (!loading) return;
    const messages = [
      "Reviewing your answers…",
      "Selecting the right Wave Therapy codes…",
      "Optimizing your schedule and timing…",
      "Adding tips and safety notes…",
      "Finalizing your personalized program…",
    ];
    let idx = 0;
    const msgInterval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setLoadingMsg(messages[idx]);
    }, 4000);
    return () => { clearInterval(msgInterval); };
  }, [loading]);

  // Debounced auto-save for notes
  useEffect(() => {
    if (!plan) return;
    const t = setTimeout(async () => {
      setNotesSaving(true);
      try {
        await api.patch(`/plan/${id}/notes`, { notes });
        setNotesSavedAt(new Date().toLocaleTimeString());
      } catch (e) {
        // silent
      } finally {
        setNotesSaving(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [notes, id, plan]);

  const downloadPlan = () => {
    const sessionsHTML = plan.schedule.map((d) => `
      <h3 style="font-family:Georgia,serif;color:#2C5E7A;margin:18px 0 6px;font-weight:500;">${d.label}</h3>
      <table width="100%" cellspacing="0" style="border-collapse:collapse;font-size:14px;color:#2A3439;">
        ${d.sessions.map((s) => {
          const keystrokes = s.code === 444
            ? `10 &nbsp;|&nbsp; SELECT &nbsp;|&nbsp; <b style="color:#2C5E7A">444</b> &nbsp;|&nbsp; RUN`
            : s.code === 161
            ? `30 &nbsp;|&nbsp; SELECT &nbsp;|&nbsp; <b style="color:#2C5E7A">161</b> &nbsp;|&nbsp; RUN`
            : `AUTO &nbsp;|&nbsp; <b style="color:#2C5E7A">${s.code}</b> &nbsp;|&nbsp; RUN`;
          return `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #EAE5D9;font-family:monospace;width:36%;">${keystrokes}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #EAE5D9;">${s.name}${s.time_of_day ? ` <span style="font-size:10px;background:#E9F1F5;color:#2C5E7A;padding:2px 8px;border-radius:12px;margin-left:6px;">${s.time_of_day.replace("_"," ")}</span>` : ""}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #EAE5D9;text-align:right;width:80px;">${s.minutes} min</td>
          </tr>
        `;}).join("")}
      </table>
    `).join("");

    const safetyHTML = plan.safety_notes?.length
      ? `<div style="background:#FDF1E5;color:#7A5A3A;padding:12px 14px;border-radius:8px;font-size:13px;margin:18px 0;"><b>Safety notes:</b><ul style="margin:6px 0 0 18px;padding:0;">${plan.safety_notes.map((s) => `<li>${s}</li>`).join("")}</ul></div>`
      : "";

    const tipsHTML = plan.tips?.length
      ? `<h3 style="font-family:Georgia,serif;color:#D27A59;margin:24px 0 8px;font-weight:500;">Tips for the best results</h3><ul style="font-size:14px;color:#2A3439;padding-left:20px;">${plan.tips.map((t) => `<li style="margin-bottom:6px;">${t}</li>`).join("")}</ul>`
      : "";

    const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>CuraWaves Plan — ${plan.headline}</title>
<style>body{margin:0;background:#FDFBF7;font-family:Arial,sans-serif;color:#2A3439;padding:24px;} .card{max-width:760px;margin:0 auto;background:#fff;border:1px solid #EAE5D9;border-radius:16px;padding:32px;}</style>
</head><body>
<div class="card">
  <p style="letter-spacing:0.2em;text-transform:uppercase;font-size:11px;color:#85A094;margin:0;">CuraWaves Personalized Program</p>
  <h1 style="font-family:Georgia,serif;font-weight:400;color:#2C5E7A;margin:8px 0 4px;font-size:30px;">${plan.headline}</h1>
  <p style="color:#5C6A72;margin:0 0 18px;">${plan.ai_summary}</p>
  <p style="font-size:12px;color:#7A5A3A;background:#FDF1E5;padding:10px 14px;border-radius:8px;">For education &amp; investigative use only. Wave Therapy is not intended to diagnose, treat, cure or prevent any disease.</p>
  <p style="font-size:13px;color:#2C5E7A;background:#E9F1F5;padding:10px 14px;border-radius:8px;"><b>Daily tip:</b> ${plan.daily_tip}</p>
  ${safetyHTML}
  ${sessionsHTML}
  <h3 style="font-family:Georgia,serif;color:#2C5E7A;margin:24px 0 8px;font-weight:500;">Getting started</h3>
  <ol style="font-size:14px;line-height:1.6;padding-left:20px;">
    <li>Plug the power cord into the back of the device, then into a wall outlet.</li>
    <li>Choose your accessory — <b>Stainless Steel Cylinders</b> (larger black cord, banana plugs in the right and left side of the machine) for full-body sessions, OR <b>Electrode Pads</b> (thin black cord plugs in the back of the machine like the power cord) placed on the left/right or front/back of the target area.</li>
    <li>Press AUTO, type the Code, press RUN.</li>
    <li>Pause anytime with any number key (1–9); resume by pressing RUN.</li>
  </ol>
  ${tipsHTML}
  <div style="margin-top:28px;padding:20px;background:#F5F2EB;border:1px solid #EAE5D9;border-radius:12px;text-align:center;">
    <h3 style="font-family:Georgia,serif;color:#2A3439;margin:0 0 6px;font-weight:500;font-size:18px;">Want to talk through your plan?</h3>
    <p style="color:#5C6A72;font-size:13px;margin:0 0 14px;line-height:1.55;">To discuss your Wave Therapy personalized plan with a CuraWaves Health Coach, please book a virtual coaching session with our team.</p>
    <a href="https://curawaves.com/products/wellness-consultation-concierge-services" style="display:inline-block;background:#2C5E7A;color:#fff;text-decoration:none;font-size:13px;font-weight:500;padding:12px 22px;border-radius:30px;">Book a coaching session</a>
  </div>
  <p style="font-size:11px;color:#A0AAB0;margin-top:24px;">Plan ID: ${plan.id} · Generated ${new Date(plan.created_at).toLocaleString()}</p>
</div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CuraWaves-Plan-${plan.first_name}-${plan.id.slice(0,8)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Plan downloaded. Open the file and use Print → Save as PDF if you'd like a PDF.");
  };

  const sendEmail = async () => {
    setEmailing(true);
    try {
      const { data } = await api.post("/plan/email", { plan_id: id });
      if (data.mocked) {
        toast.warning("Email integration not yet configured — your plan stays on this page. Add a Resend API key to enable email.");
      } else {
        toast.success("Your plan has been emailed.");
        setEmailedAt(new Date().toLocaleTimeString());
      }
    } catch (e) {
      toast.error("Failed to send email.");
    } finally {
      setEmailing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-paper py-16 md:py-24" data-testid="plan-pending">
        <div className="max-w-xl mx-auto px-6 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ocean-light/60 mb-5">
            <Loader2 className="w-6 h-6 text-ocean animate-spin" />
          </div>
          <p className="text-xs tracking-[0.25em] uppercase text-sage font-semibold mb-2">Building your program</p>
          <h1 className="font-serif text-3xl md:text-4xl text-ink mb-3">{loadingMsg}</h1>
          <p className="text-sm text-ink-muted">
            We're tailoring your Wave Therapy schedule. This usually takes 20–60 seconds.
            A copy will also land in your inbox the moment it's ready.
          </p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-32" data-testid="plan-not-found">
        <p className="text-ink-muted">We couldn&apos;t find that plan.</p>
        <Link to="/onboarding" className="mt-4 inline-block text-ocean">Start a new questionnaire</Link>
      </div>
    );
  }

  if (plan.status === "failed") {
    return (
      <div className="bg-paper py-16 md:py-24" data-testid="plan-failed">
        <div className="max-w-xl mx-auto px-6 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-terracotta-light mb-5">
            <AlertTriangle className="w-6 h-6 text-terracotta" />
          </div>
          <h1 className="font-serif text-3xl text-ink mb-3">We hit a snag</h1>
          <p className="text-sm text-ink-muted mb-6">{plan.error || "Plan generation failed. Please try again."}</p>
          <Link to="/onboarding" className="inline-flex items-center gap-2 bg-ocean hover:bg-ocean-dark text-white text-sm font-medium px-6 py-3 rounded-full transition-colors">
            Try the questionnaire again <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper py-10 md:py-16">
      <div className="max-w-3xl mx-auto px-6 animate-fade-up">
        <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-sage font-semibold">Your personalized program</p>
            <h1 className="font-serif text-3xl md:text-4xl text-ink mt-1">{plan.headline}</h1>
            {plan.auto_emailed && (
              <p data-testid="auto-email-badge" className="mt-2 inline-flex items-center gap-1.5 text-xs text-sage bg-[#EAF1ED] border border-sage/30 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                A copy has been emailed to <strong className="font-semibold">{plan.email}</strong>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              data-testid="plan-view-toggle"
              onClick={() => setView(view === "detail" ? "grid" : "detail")}
              className="inline-flex items-center gap-2 bg-white border border-[#EAE5D9] hover:border-ocean text-ink-muted hover:text-ocean text-sm px-4 py-2.5 rounded-full transition-colors"
            >
              {view === "detail" ? <><LayoutGrid className="w-4 h-4" /> Grid view</> : <><List className="w-4 h-4" /> Detail view</>}
            </button>
            <button
              data-testid="plan-download-button"
              onClick={downloadPlan}
              className="inline-flex items-center gap-2 bg-white border border-[#EAE5D9] hover:border-ocean text-ink-muted hover:text-ocean text-sm px-4 py-2.5 rounded-full transition-colors"
            >
              <Download className="w-4 h-4" /> Download
            </button>
            <button
              data-testid="plan-print-button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-white border border-[#EAE5D9] hover:border-ocean text-ink-muted hover:text-ocean text-sm px-4 py-2.5 rounded-full transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              data-testid="plan-email-button"
              onClick={sendEmail}
              disabled={emailing}
              className="inline-flex items-center gap-2 bg-ocean hover:bg-ocean-dark text-white text-sm px-4 py-2.5 rounded-full transition-colors disabled:opacity-60"
            >
              {emailing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Email me this plan
            </button>
          </div>
        </div>

        {/* Prescription Card */}
        <div
          data-testid="prescription-card"
          className="bg-cream border border-sand-500 p-7 md:p-10 shadow-lg relative print:shadow-none print:border-none rounded-2xl"
        >
          <div className="border-b-2 border-dashed border-sand-500 pb-6 mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-sage font-semibold mb-1">CuraWaves Wave Therapy</div>
              <div className="font-serif text-2xl text-ink">{LENGTH_LABEL[plan.program_length]} {plan.primary_protocol_title} Program</div>
              <div className="text-sm text-ink-muted mt-1">Prepared for {plan.first_name}</div>
            </div>
            <div className="text-right text-xs text-ink-muted">
              <div>Plan ID: <span className="font-mono text-ink">{plan.id ? plan.id.slice(0, 8) : "—"}</span></div>
              <div className="mt-1">Created {plan.created_at ? new Date(plan.created_at).toLocaleDateString() : "—"}</div>
            </div>
          </div>

          <p className="text-ink-muted leading-relaxed mb-2">{plan.ai_summary}</p>
          <p className="text-sm text-ink-muted bg-ocean-light/50 rounded-lg px-4 py-3 mt-4 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-ocean mt-0.5 shrink-0" />
            <span><strong className="text-ocean">Daily tip:</strong> {plan.daily_tip}</span>
          </p>

          {plan.safety_notes?.length > 0 && (
            <div className="mt-5 bg-[#FDF1E5] border border-[#EAE5D9] rounded-lg p-4 text-sm text-[#7A5A3A]">
              <div className="font-semibold mb-1 inline-flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Safety notes</div>
              <ul className="list-disc list-inside space-y-1">
                {plan.safety_notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}

          {/* Schedule */}
          <div className="mt-8" data-testid="plan-schedule">
            {!plan.schedule || plan.schedule.length === 0 ? (
              <p className="text-sm text-ink-muted italic">Your schedule is being prepared — please refresh this page in a moment.</p>
            ) : view === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" data-testid="plan-grid">
                {plan.schedule.map((d) => (
                  <div key={d.day} className="bg-white border border-[#EAE5D9] rounded-xl p-3 hover:border-ocean/40 transition-colors">
                    <div className="text-[10px] uppercase tracking-wider text-sage font-semibold mb-1.5">{d.label}</div>
                    <div className="space-y-1.5">
                      {d.sessions.map((s, i) => (
                        <div key={i} className="text-xs text-ink-muted">
                          <span className="font-mono text-ocean font-bold">{s.code}</span> · {s.minutes}m
                          <div className="text-[10px] text-ink-muted/70 truncate">{s.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {plan.schedule.map((d) => (
                  <div key={d.day} className="bg-white border border-[#EAE5D9] rounded-xl p-5">
                    <h3 className="font-serif text-xl text-ocean mb-3">{d.label}</h3>
                    <div className="space-y-3">
                  {d.sessions.map((s, i) => {
                    const tb = s.time_of_day && TIME_BADGE[s.time_of_day];
                    return (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2 border-b last:border-b-0 border-[#F5F2EB]">
                        <div className="flex flex-wrap items-center gap-3">
                          <CodeChip code={s.code} />
                          <div>
                            <div className="text-sm font-medium text-ink flex flex-wrap items-center gap-2">
                              <span>{s.name}</span>
                              {tb && (
                                <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider border rounded-full px-2 py-0.5 ${tb.cls}`}>
                                  <tb.Icon className="w-3 h-3" /> {tb.label}
                                </span>
                              )}
                            </div>
                            {s.notes && <div className="text-xs text-ink-muted">{s.notes}</div>}
                          </div>
                        </div>
                        <div className="text-sm text-ink-muted shrink-0">{s.minutes} min</div>
                      </div>
                    );
                  })}
                </div>
              </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-dashed border-sand-500 text-xs text-ink-muted">
            <strong className="text-ink">How to run:</strong> On your Wave Therapy device, press <span className="font-mono">AUTO</span>, the code number,
            then <span className="font-mono">RUN</span>. Pause anytime by pressing any number key (1–9); resume by pressing <span className="font-mono">RUN</span> again.
          </div>
        </div>

        {/* Getting Started */}
        <div className="mt-8 bg-white rounded-2xl border border-[#EAE5D9] p-6 md:p-8" data-testid="getting-started">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-ocean" />
            <h3 className="font-serif text-2xl text-ink">Getting started with your device</h3>
          </div>
          <ol className="space-y-3">
            {SETUP_STEPS.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-ocean-light text-ocean text-sm font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                <div>
                  <div className="text-sm font-semibold text-ink">{s.title}</div>
                  <p className="text-sm text-ink-muted mt-0.5 leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Tips */}
        {plan.tips && plan.tips.length > 0 && (
          <div className="mt-6 bg-terracotta-light/60 rounded-2xl border border-[#EAE5D9] p-6 md:p-8" data-testid="plan-tips">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-terracotta" />
              <h3 className="font-serif text-2xl text-ink">Tips for the best results</h3>
            </div>
            <ul className="space-y-2.5">
              {plan.tips.map((t, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-muted leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-sage shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Personal log / notes */}
        <div className="no-print mt-6 bg-white rounded-2xl border border-[#EAE5D9] p-6 md:p-8" data-testid="plan-notes">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-2">
              <NotebookPen className="w-5 h-5 text-ocean" />
              <h3 className="font-serif text-2xl text-ink">My notes &amp; personal log</h3>
            </div>
            <div className="text-xs text-ink-muted">
              {notesSaving ? (
                <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>
              ) : notesSavedAt ? (
                <span className="inline-flex items-center gap-1 text-sage"><CheckCircle2 className="w-3 h-3" /> Saved at {notesSavedAt}</span>
              ) : (
                <span>Auto-saves as you type</span>
              )}
            </div>
          </div>
          <p className="text-sm text-ink-muted mb-3">Track how you feel each day, jot modifications to your plan, log session times, or note questions for your CuraWaves coach.</p>
          <textarea
            data-testid="plan-notes-textarea"
            className="w-full bg-cream/60 border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none min-h-[180px] font-sans text-sm leading-relaxed"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Day 1 — ran 646 at 9pm, slept like a rock.&#10;Day 2 — added 274 for back pain, felt looser by evening.&#10;Question for coach: …"
          />
        </div>

        {plan.needs_30day_reassessment && (
          <div className="no-print mt-8 bg-white border border-[#EAE5D9] rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-serif text-xl text-ink">30-day re-assessment scheduled</h3>
              <p className="text-sm text-ink-muted mt-1">
                For autoimmune or complex cases, return in 30 days to update your symptoms and refresh your program.
              </p>
            </div>
            <Link to="/reassess" data-testid="goto-reassess" className="bg-terracotta hover:bg-[#B86847] text-white text-sm px-5 py-2.5 rounded-full inline-flex items-center gap-2 transition-colors">
              Save reminder <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {emailedAt && (
          <p className="no-print mt-4 text-sm text-sage text-center">Plan emailed at {emailedAt}.</p>
        )}
      </div>
    </div>
  );
}
