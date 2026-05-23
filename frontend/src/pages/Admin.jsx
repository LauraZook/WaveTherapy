import React, { useState } from "react";
import { Loader2, Lock, Send, MessageSquareHeart, Star, FileText } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";

export default function Admin() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialStats, setTestimonialStats] = useState({ count: 0, average_rating: 0 });
  const [selected, setSelected] = useState(null);
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [sendingTestimonialReminders, setSendingTestimonialReminders] = useState(false);
  const [tab, setTab] = useState("submissions"); // "submissions" | "testimonials"

  const loadAll = async (t) => {
    const headers = { "x-admin-token": t };
    const [{ data: subs }, { data: tess }] = await Promise.all([
      api.get("/admin/submissions", { headers }),
      api.get("/admin/testimonials", { headers }),
    ]);
    setSubmissions(subs.submissions || []);
    setTestimonials(tess.testimonials || []);
    setTestimonialStats({ count: tess.count || 0, average_rating: tess.average_rating || 0 });
  };

  const login = async () => {
    setLoading(true);
    try {
      await loadAll(token);
      setAuthed(true);
    } catch (e) {
      toast.error("Invalid admin token");
    } finally { setLoading(false); }
  };

  const sendReminders = async () => {
    setSendingReminders(true);
    try {
      const { data } = await api.post("/admin/send-reminders", {}, { headers: { "x-admin-token": token } });
      toast.success(`Sent ${data.reminders_sent} re-assessment reminder(s).`);
    } catch (e) {
      toast.error("Could not send reminders");
    } finally { setSendingReminders(false); }
  };

  const sendTestimonialReminders = async () => {
    setSendingTestimonialReminders(true);
    try {
      const { data } = await api.post("/admin/send-testimonial-reminders", {}, { headers: { "x-admin-token": token } });
      toast.success(`Sent ${data.testimonial_reminders_sent} testimonial reminder(s).`);
    } catch (e) {
      toast.error("Could not send testimonial reminders");
    } finally { setSendingTestimonialReminders(false); }
  };

  if (!authed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="bg-white border border-[#EAE5D9] rounded-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-4">
            <Lock className="w-6 h-6 text-ocean mx-auto" />
            <h1 className="font-serif text-2xl text-ink mt-2">Admin Access</h1>
          </div>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink-muted">Admin token</span>
            <input
              data-testid="admin-token-input"
              type="password"
              className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && token) login(); }}
            />
          </label>
          <button
            data-testid="admin-login-button"
            onClick={login}
            disabled={loading || !token}
            className="mt-4 w-full bg-ocean hover:bg-ocean-dark text-white py-3 rounded-full text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Sign in"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper py-10 min-h-[60vh]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Tab header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-[#EAE5D9] rounded-full p-1" role="tablist">
            <button
              onClick={() => setTab("submissions")}
              data-testid="admin-tab-submissions"
              className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full transition-colors ${
                tab === "submissions" ? "bg-ocean text-white" : "text-ink-muted hover:text-ocean"
              }`}
            >
              <FileText className="w-4 h-4" /> Plans <span className="opacity-70">({submissions.length})</span>
            </button>
            <button
              onClick={() => setTab("testimonials")}
              data-testid="admin-tab-testimonials"
              className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full transition-colors ${
                tab === "testimonials" ? "bg-terracotta text-white" : "text-ink-muted hover:text-terracotta"
              }`}
            >
              <MessageSquareHeart className="w-4 h-4" /> Testimonials <span className="opacity-70">({testimonialStats.count})</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              data-testid="admin-send-reminders"
              onClick={sendReminders}
              disabled={sendingReminders}
              className="inline-flex items-center gap-2 bg-ocean hover:bg-ocean-dark text-white text-sm px-4 py-2.5 rounded-full disabled:opacity-50"
            >
              {sendingReminders ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send re-assessment reminders
            </button>
            <button
              data-testid="admin-send-testimonial-reminders"
              onClick={sendTestimonialReminders}
              disabled={sendingTestimonialReminders}
              className="inline-flex items-center gap-2 bg-terracotta hover:bg-[#B86847] text-white text-sm px-4 py-2.5 rounded-full disabled:opacity-50"
            >
              {sendingTestimonialReminders ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquareHeart className="w-4 h-4" />}
              Send testimonial reminders
            </button>
          </div>
        </div>

        {/* Submissions tab */}
        {tab === "submissions" && (
          <>
            <div className="mb-4">
              <h1 className="font-serif text-3xl text-ink">Submissions</h1>
              <p className="text-sm text-ink-muted">{submissions.length} total plans generated</p>
            </div>
            <div className="bg-white border border-[#EAE5D9] rounded-2xl overflow-hidden">
              <table className="w-full text-sm" data-testid="admin-submissions-table">
                <thead className="bg-[#F5F2EB] text-ink-muted">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider">Goal</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider">Length</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider">Re-assess</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider">Testimonial</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} className="border-t border-[#EAE5D9] hover:bg-cream">
                      <td className="px-4 py-3 text-ink-muted">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-ink">{s.first_name}</td>
                      <td className="px-4 py-3 text-ink-muted">{s.email}</td>
                      <td className="px-4 py-3"><span className="bg-ocean-light text-ocean text-xs px-2 py-1 rounded">{s.primary_protocol_title}</span></td>
                      <td className="px-4 py-3 text-ink-muted">{s.program_length.replace("_", " ")}</td>
                      <td className="px-4 py-3">{s.needs_30day_reassessment ? <span className="text-terracotta text-xs">Due {s.reminder_due_at?.slice(0,10)}</span> : <span className="text-ink-muted/60 text-xs">—</span>}</td>
                      <td className="px-4 py-3">
                        {s.testimonial_submitted_at ? (
                          <span className="text-sage text-xs">Submitted</span>
                        ) : s.testimonial_reminder_sent_at ? (
                          <span className="text-ink-muted text-xs">Reminder sent</span>
                        ) : s.testimonial_reminder_due_at ? (
                          <span className="text-ink-muted/60 text-xs">Due {s.testimonial_reminder_due_at?.slice(0,10)}</span>
                        ) : (
                          <span className="text-ink-muted/60 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelected(s)}
                          className="text-ocean text-xs hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {submissions.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-muted">No submissions yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Testimonials tab */}
        {tab === "testimonials" && (
          <>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="font-serif text-3xl text-ink">Testimonials</h1>
                <p className="text-sm text-ink-muted">{testimonialStats.count} submitted · average rating {testimonialStats.average_rating}/5</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4" data-testid="admin-testimonials-grid">
              {testimonials.map((t) => (
                <div key={t.id} className="bg-white border border-[#EAE5D9] rounded-2xl p-5 hover:border-terracotta/40 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`w-4 h-4 ${n <= t.rating ? "fill-terracotta text-terracotta" : "text-[#D5CEBC]"}`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-ink-muted">{new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <h3 className="font-serif text-lg text-ink mb-1.5">{t.headline}</h3>
                  <p className="text-sm text-ink-muted line-clamp-3 leading-relaxed">{t.story}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="text-ink">{t.first_name} · <span className="text-ink-muted">{t.email}</span></div>
                    <div className="flex items-center gap-2">
                      {t.allow_publish ? (
                        <span className="text-sage bg-sage/10 px-2 py-0.5 rounded-full">Can publish</span>
                      ) : (
                        <span className="text-terracotta bg-terracotta-light/60 px-2 py-0.5 rounded-full">Private</span>
                      )}
                      <button onClick={() => setSelectedTestimonial(t)} className="text-ocean hover:underline">View</button>
                    </div>
                  </div>
                  {t.primary_goal && (
                    <div className="mt-2 inline-block text-[10px] uppercase tracking-wider text-ocean bg-ocean-light/60 px-2 py-0.5 rounded-full">
                      {t.primary_goal}
                    </div>
                  )}
                </div>
              ))}
              {testimonials.length === 0 && (
                <div className="col-span-full bg-white border border-[#EAE5D9] rounded-2xl p-10 text-center text-ink-muted">
                  No testimonials yet. Send the 30-day testimonial reminder or share <span className="font-mono text-ocean">/testimonial</span> with a customer.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Plan detail drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="w-full max-w-xl h-full bg-white overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-2xl text-ink">{selected.headline}</h3>
              <button onClick={() => setSelected(null)} className="text-ink-muted hover:text-ink">✕</button>
            </div>
            <p className="text-sm text-ink-muted mb-4">{selected.ai_summary}</p>
            <div className="text-xs text-ink-muted mb-4">
              <div><strong>Plan ID:</strong> <span className="font-mono">{selected.id}</span></div>
              <div><strong>Tip:</strong> {selected.daily_tip}</div>
            </div>
            <div className="space-y-4">
              {selected.schedule.map((d) => (
                <div key={d.day} className="border border-[#EAE5D9] rounded-lg p-3">
                  <div className="font-semibold text-ink text-sm">{d.label}</div>
                  <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                    {d.sessions.map((s, i) => (
                      <li key={i} className="font-mono">AUTO › <span className="text-ocean font-bold">{s.code}</span> › RUN — {s.name} ({s.minutes} min)</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Testimonial detail drawer */}
      {selectedTestimonial && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelectedTestimonial(null)}>
          <div className="w-full max-w-xl h-full bg-white overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-2xl text-ink">{selectedTestimonial.headline}</h3>
              <button onClick={() => setSelectedTestimonial(null)} className="text-ink-muted hover:text-ink">✕</button>
            </div>
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`w-5 h-5 ${n <= selectedTestimonial.rating ? "fill-terracotta text-terracotta" : "text-[#D5CEBC]"}`} />
              ))}
              <span className="ml-2 text-sm text-ink-muted">{selectedTestimonial.rating}/5</span>
            </div>
            <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed mb-5">{selectedTestimonial.story}</p>
            <div className="text-xs text-ink-muted space-y-1 border-t border-[#EAE5D9] pt-4">
              <div><strong>From:</strong> {selectedTestimonial.first_name} · {selectedTestimonial.email}</div>
              {selectedTestimonial.primary_goal && <div><strong>Goal:</strong> {selectedTestimonial.primary_goal}</div>}
              {selectedTestimonial.plan_program_length && <div><strong>Program:</strong> {selectedTestimonial.plan_program_length.replace("_", " ")}</div>}
              {selectedTestimonial.plan_id && <div><strong>Plan ID:</strong> <span className="font-mono">{selectedTestimonial.plan_id}</span></div>}
              <div><strong>Submitted:</strong> {new Date(selectedTestimonial.created_at).toLocaleString()}</div>
              <div><strong>Publishable:</strong> {selectedTestimonial.allow_publish ? "Yes" : "No (private)"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
