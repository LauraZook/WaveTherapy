import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Star, Loader2, CheckCircle2, MessageSquareHeart, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";

const PROGRAM_LENGTH_LABEL = { one_day: "One-Time", one_week: "1-Week", thirty_day: "30-Day" };

export default function Testimonial() {
  const [params] = useSearchParams();
  const planId = params.get("plan_id") || "";

  const [form, setForm] = useState({
    first_name: "",
    email: "",
    rating: 5,
    headline: "",
    story: "",
    primary_goal: "",
    allow_publish: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [planContext, setPlanContext] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Prefill from plan_id if present
  useEffect(() => {
    if (!planId) return;
    (async () => {
      try {
        const { data } = await api.get(`/plan/${planId}/testimonial-prefill`);
        if (data) {
          setPlanContext(data);
          setForm((p) => ({
            ...p,
            first_name: p.first_name || data.first_name || "",
            primary_goal: p.primary_goal || data.primary_protocol_title || "",
          }));
          if (data.already_submitted) setAlreadySubmitted(true);
        }
      } catch (_e) {
        // silent — prefill is optional
      }
    })();
  }, [planId]);

  const canSubmit =
    form.first_name.trim() &&
    form.email.trim() &&
    form.headline.trim().length >= 1 &&
    form.story.trim().length >= 10 &&
    form.rating >= 1 &&
    form.rating <= 5;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Please fill in your name, email, a short headline, and a story (at least 10 characters).");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/testimonials", { ...form, plan_id: planId || undefined });
      setDone(true);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        toast.error("Too many submissions from this connection — please try again in an hour.");
      } else {
        toast.error(err?.response?.data?.detail || "Could not submit testimonial. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="bg-paper py-16 md:py-24 min-h-[60vh]">
        <div className="max-w-xl mx-auto px-6 text-center animate-fade-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sage/20 text-sage mb-5">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <p className="text-xs tracking-[0.25em] uppercase text-sage font-semibold mb-2">Thank you</p>
          <h1 className="font-serif text-3xl md:text-4xl text-ink mb-3">Your story has been submitted.</h1>
          <p className="text-sm text-ink-muted leading-relaxed mb-8">
            We deeply appreciate you taking the time. Your experience helps the next Wave Therapy customer
            understand what's possible. The CuraWaves team will review and reach out if we have questions.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="https://curawaves.com/collections/all"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-ocean hover:bg-ocean-dark text-white text-sm font-medium px-5 py-3 rounded-full transition-colors"
            >
              Visit the CuraWaves shop <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-white border border-[#EAE5D9] hover:border-ocean text-ink-muted hover:text-ocean text-sm font-medium px-5 py-3 rounded-full transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper py-10 md:py-16 min-h-[60vh]">
      <div className="max-w-2xl mx-auto px-6 animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-terracotta/15 text-terracotta mb-3">
            <MessageSquareHeart className="w-6 h-6" />
          </div>
          <p className="text-xs tracking-[0.25em] uppercase text-sage font-semibold mb-2">Share your story</p>
          <h1 className="font-serif text-3xl md:text-4xl text-ink">
            {planContext?.first_name ? `Hi ${planContext.first_name}, how did Wave Therapy go?` : "Share your Wave Therapy story"}
          </h1>
          <p className="text-sm text-ink-muted mt-3 max-w-md mx-auto leading-relaxed">
            We&apos;d love to hear about your first 30 days. Your testimonial helps others on the same
            journey know what&apos;s possible.
          </p>
          {planContext?.primary_protocol_title && (
            <p className="text-xs text-ocean mt-3 inline-block bg-ocean-light/60 border border-ocean/15 rounded-full px-3 py-1">
              {PROGRAM_LENGTH_LABEL[planContext.program_length] || planContext.program_length} · {planContext.primary_protocol_title}
            </p>
          )}
          {alreadySubmitted && (
            <p className="text-xs text-terracotta mt-3 bg-terracotta-light/60 border border-terracotta/20 rounded-lg px-4 py-2 inline-block">
              We already have a testimonial linked to this plan — feel free to submit another one with any updates.
            </p>
          )}
        </div>

        <form
          onSubmit={submit}
          data-testid="testimonial-form"
          className="bg-white rounded-3xl p-8 md:p-10 border border-[#EAE5D9] shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5"
        >
          {/* Rating */}
          <div className="block">
            <span className="text-xs uppercase tracking-wider text-ink-muted">Your rating</span>
            <div className="mt-2 flex items-center gap-1" data-testid="testimonial-rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  data-testid={`testimonial-star-${n}`}
                  onClick={() => setF("rating", n)}
                  aria-label={`Rate ${n} of 5`}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      n <= form.rating ? "fill-terracotta text-terracotta" : "text-[#D5CEBC]"
                    }`}
                  />
                </button>
              ))}
              <span className="text-sm text-ink-muted ml-2">{form.rating}/5</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-ink-muted">First name</span>
              <input
                data-testid="testimonial-first-name"
                required
                className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
                value={form.first_name}
                onChange={(e) => setF("first_name", e.target.value)}
                placeholder="Jane"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-ink-muted">Email</span>
              <input
                data-testid="testimonial-email"
                type="email"
                required
                className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
                value={form.email}
                onChange={(e) => setF("email", e.target.value)}
                placeholder="you@example.com"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink-muted">Headline</span>
            <input
              data-testid="testimonial-headline"
              required
              maxLength={160}
              className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
              value={form.headline}
              onChange={(e) => setF("headline", e.target.value)}
              placeholder="e.g. Sleep is finally back, and my migraines have eased"
            />
            <span className="text-xs text-ink-muted mt-1 block">A short one-line summary of your experience.</span>
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink-muted">Your story</span>
            <textarea
              data-testid="testimonial-story"
              required
              minLength={10}
              maxLength={5000}
              className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none min-h-[160px] leading-relaxed"
              value={form.story}
              onChange={(e) => setF("story", e.target.value)}
              placeholder="What was your experience over the last 30 days? What changed? What surprised you? Any specific protocols or codes that worked for you?"
            />
            <span className="text-xs text-ink-muted mt-1 block">{form.story.length}/5000 characters</span>
          </label>

          {!planContext && (
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-ink-muted">What did you use Wave Therapy for? (optional)</span>
              <input
                data-testid="testimonial-goal"
                className="mt-1 w-full bg-cream border border-sand-300 rounded-lg px-4 py-3 focus:border-ocean focus:ring-2 focus:ring-ocean/20 outline-none"
                value={form.primary_goal}
                onChange={(e) => setF("primary_goal", e.target.value)}
                placeholder="e.g. Pain & Inflammation, Detox, Recovery"
              />
            </label>
          )}

          <label className="flex items-start gap-3 p-4 bg-cream/60 border border-[#EAE5D9] rounded-xl cursor-pointer">
            <input
              data-testid="testimonial-publish"
              type="checkbox"
              className="mt-1 w-4 h-4 accent-ocean"
              checked={form.allow_publish}
              onChange={(e) => setF("allow_publish", e.target.checked)}
            />
            <span className="text-sm text-ink-muted leading-relaxed">
              You may share my testimonial on the CuraWaves website and marketing materials using my first name only.
              <span className="block text-xs mt-1">Uncheck if you&apos;d prefer your feedback stay private.</span>
            </span>
          </label>

          <button
            type="submit"
            data-testid="testimonial-submit"
            disabled={!canSubmit || submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-terracotta hover:bg-[#B86847] disabled:opacity-50 text-white font-medium py-3.5 rounded-full transition-colors"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <>Submit testimonial <ArrowRight className="w-4 h-4" /></>}
          </button>

          <p className="text-xs text-ink-muted text-center leading-relaxed">
            Wave Therapy is for education &amp; investigative use only. Personal results vary —
            individual testimonials are not medical claims.
          </p>
        </form>
      </div>
    </div>
  );
}
