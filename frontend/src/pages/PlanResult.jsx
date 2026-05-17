import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, Mail, ArrowRight, AlertTriangle, Loader2, CheckCircle2, BookOpen, Sun, Moon, Briefcase, Cloud, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import CodeChip from "../components/CodeChip";

const LENGTH_LABEL = { one_day: "1-Day", one_week: "1-Week", thirty_day: "30-Day" };

const TIME_BADGE = {
  morning: { label: "Morning", Icon: Sun, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  during_work: { label: "During work", Icon: Briefcase, cls: "bg-sky-50 text-sky-700 border-sky-200" },
  afternoon: { label: "Afternoon", Icon: Cloud, cls: "bg-stone-50 text-stone-700 border-stone-200" },
  evening: { label: "Evening", Icon: Moon, cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

const SETUP_STEPS = [
  { title: "Connect power", body: "Plug the power cord into the back of the machine, then into a wall outlet." },
  { title: "Choose your accessory", body: "Stainless Steel Cylinders (larger black cord, banana plugs) for full-body sessions, OR Electrode Pads (thin black cord) placed left/right or front/back of the target area." },
  { title: "Enter your code", body: "Press AUTO, type the Code number, then press RUN. The session starts automatically." },
  { title: "Pause & resume", body: "Press any number key (1–9) to pause. Press RUN to resume right where you left off." },
];

export default function PlanResult() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [emailedAt, setEmailedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/plan/${id}`);
        if (!cancelled) setPlan(data);
      } catch (e) {
        toast.error("Plan not found.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

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
      <div className="flex items-center justify-center py-32 text-ink-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your plan…
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-32">
        <p className="text-ink-muted">We couldn&apos;t find that plan.</p>
        <Link to="/onboarding" className="mt-4 inline-block text-ocean">Start a new questionnaire</Link>
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
          </div>
          <div className="flex gap-2">
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
              <div>Plan ID: <span className="font-mono text-ink">{plan.id.slice(0, 8)}</span></div>
              <div className="mt-1">Created {new Date(plan.created_at).toLocaleDateString()}</div>
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
          <div className="mt-8 space-y-6" data-testid="plan-schedule">
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
