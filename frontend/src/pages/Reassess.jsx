import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";

export default function Reassess() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", symptoms_update: "", severity: 5, notes: "" });
  const [loading, setLoading] = useState(false);
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/reassess", form);
      toast.success("Updated program generated.");
      navigate(`/plan/${data.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not generate updated plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-paper py-16 min-h-[60vh]">
      <div className="max-w-xl mx-auto px-6">
        <div className="text-center mb-8">
          <RotateCw className="w-6 h-6 text-ocean mx-auto mb-3" />
          <h1 className="font-serif text-4xl text-ink">30-day re-assessment</h1>
          <p className="text-ink-muted mt-2 text-sm">Update us on your symptoms — we&apos;ll refresh your CuraWaves program.</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-3xl p-8 md:p-10 border border-[#EAE5D9] shadow-sm space-y-5">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink-muted">Email used in original questionnaire</span>
            <input
              data-testid="reassess-email"
              type="email" required
              className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
              value={form.email}
              onChange={(e) => setF("email", e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink-muted">How are your symptoms now?</span>
            <textarea
              data-testid="reassess-symptoms"
              required
              className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none min-h-[120px]"
              value={form.symptoms_update}
              onChange={(e) => setF("symptoms_update", e.target.value)}
              placeholder="What's improved, what's still bothering you, what's new"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink-muted">Current severity: <span className="text-ocean font-semibold">{form.severity}/10</span></span>
            <input
              data-testid="reassess-severity"
              type="range" min={1} max={10}
              className="mt-2 w-full accent-ocean"
              value={form.severity}
              onChange={(e) => setF("severity", parseInt(e.target.value, 10))}
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink-muted">Other notes (optional)</span>
            <input
              data-testid="reassess-notes"
              className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
              value={form.notes}
              onChange={(e) => setF("notes", e.target.value)}
              placeholder="lifestyle, medications, anything new"
            />
          </label>
          <button
            type="submit"
            data-testid="reassess-submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-ocean hover:bg-ocean-dark disabled:opacity-50 text-white font-medium py-3.5 rounded-full transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Generating updated plan…" : "Refresh my program"}
          </button>
        </form>
      </div>
    </div>
  );
}
