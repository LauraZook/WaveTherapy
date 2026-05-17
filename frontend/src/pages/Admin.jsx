import React, { useState } from "react";
import { Loader2, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";

export default function Admin() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sendingReminders, setSendingReminders] = useState(false);

  const login = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/submissions", { headers: { "x-admin-token": token } });
      setSubmissions(data.submissions);
      setAuthed(true);
    } catch (e) {
      toast.error("Invalid admin token");
    } finally { setLoading(false); }
  };

  const sendReminders = async () => {
    setSendingReminders(true);
    try {
      const { data } = await api.post("/admin/send-reminders", {}, { headers: { "x-admin-token": token } });
      toast.success(`Sent ${data.reminders_sent} reminder(s).`);
    } catch (e) {
      toast.error("Could not send reminders");
    } finally { setSendingReminders(false); }
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
    <div className="bg-paper py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl text-ink">Submissions</h1>
            <p className="text-sm text-ink-muted">{submissions.length} total plans generated</p>
          </div>
          <button
            data-testid="admin-send-reminders"
            onClick={sendReminders}
            disabled={sendingReminders}
            className="inline-flex items-center gap-2 bg-terracotta hover:bg-[#B86847] text-white text-sm px-4 py-2.5 rounded-full disabled:opacity-50"
          >
            {sendingReminders ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send due reminders
          </button>
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
                <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-muted">No submissions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
