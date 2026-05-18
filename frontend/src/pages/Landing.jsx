import React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Activity, Droplets, Shield, Zap, Brain,
  ArrowRight, Heart, Waves, Quote, ChevronRight,
} from "lucide-react";
import { PROTOCOLS_META, PROTOCOL_ORDER } from "../lib/api";

const Icons = { Sparkles, Activity, Droplets, Shield, Zap, Brain };

const HERO_IMG = "https://curawaves.com/cdn/shop/files/Product_image_WT_1020x693.jpg?v=1696906574";
const FREEDOM_IMG = "https://curawaves.com/cdn/shop/files/Rocks_2_453x640.jpg?v=1778559745";

const FREEDOM = [
  { letter: "F", title: "Faith. Hope. Love.", body: "Our bodies are divinely designed to heal naturally. Grow your faith, hope and receive more love." },
  { letter: "R", title: "Restoration", body: "For transformative results, give your body what it needs (and doesn't) to release + restore." },
  { letter: "E", title: "Electric Health", body: "Our cells need to be energized and rejuvenated for cellular communication with Wave Therapy." },
  { letter: "E", title: "Emotional Balance", body: "Stress harms our health, while laughter improves it. Find the balance." },
  { letter: "D", title: "Detoxification", body: "Feel the benefits of more vitality and longevity by removing toxins." },
  { letter: "O", title: "Oxygenation", body: "Create a richer oxygen environment for your cells with deep breathing." },
  { letter: "M", title: "Mindfulness", body: "Studies show we can literally rewire our brains. Be intentional with your thoughts and words." },
];

const TESTIMONIALS = [
  { name: "Kim P.", location: "Mesa, AZ",
    quote: "With their guidance, they helped me create a program specific to me. In less than a year, I'd cleared major infections naturally." },
  { name: "Dr. Coleen Murphy ND, LAc", location: "San Juan Capistrano, CA",
    quote: "I've used my CuraWaves machine for years. Steady improvements in vitality and reduction in muscle tension. The frequency settings are easy to target specific concerns." },
  { name: "Coach Mark", location: "Laguna Niguel, CA",
    quote: "Wave Therapy accelerated my healing after surgeries. Both surgeons were amazed at how soon I was back on my feet." },
];

const bentoSpans = ["md:col-span-7", "md:col-span-5", "md:col-span-4", "md:col-span-4", "md:col-span-4", "md:col-span-12"];

export default function Landing() {
  return (
    <div className="bg-paper">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 pt-12 md:pt-20 pb-12 md:pb-20 grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7 stagger">
            <p className="text-xs tracking-[0.25em] uppercase text-sage font-semibold mb-4 inline-flex items-center gap-2">
              <Waves className="w-3.5 h-3.5" /> NASA-backed square wave technology
            </p>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl text-ink leading-[1.05] font-light">
              Your personalized path to <em className="text-ocean not-italic font-medium">freedom from pain</em> and greater vitality.
            </h1>
            <p className="mt-6 text-lg text-ink-muted max-w-xl leading-relaxed">
              Answer the Wave Therapy questionnaire for a free personalized plan to get started &amp; feel better each day.
              The program draws from 500+ frequencies and 100+ pre-programmed codes — tailored to your unique goals.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/onboarding"
                data-testid="hero-cta-button"
                className="bg-ocean hover:bg-ocean-dark text-white text-base font-medium px-7 py-3.5 rounded-full inline-flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                Build my plan <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/reassess"
                data-testid="hero-reassess-link"
                className="text-ink-muted hover:text-ocean text-sm inline-flex items-center gap-1 transition-colors"
              >
                Returning for 30-day re-assessment? <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-5 text-xs text-ink-muted/80">
              <span className="inline-flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-terracotta" /> Built for practitioners, athletes & families</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Proudly made in the USA</span>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 bg-ocean-light rounded-tl-[80px] rounded-br-[80px] -rotate-2"></div>
              <img
                src={HERO_IMG}
                alt="Wave Therapy machine"
                className="relative w-full rounded-tl-[80px] rounded-br-[80px] object-cover border border-[#EAE5D9]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Protocols Bento */}
      <section id="protocols" className="max-w-7xl mx-auto px-6 py-14 md:py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-xs tracking-[0.25em] uppercase text-sage font-semibold mb-3">Six Protocol Pathways</p>
          <h2 className="font-serif text-4xl md:text-5xl text-ink leading-tight">
            Six protocols. Hundreds of waves. One plan crafted for you.
          </h2>
          <p className="mt-4 text-ink-muted">
            Your AI-generated program selects exact <span className="font-mono text-ocean">AUTO &gt; Code &gt; RUN</span> sessions from the official Wave Therapy catalog.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {PROTOCOL_ORDER.map((key, idx) => {
            const p = PROTOCOLS_META[key];
            const Icon = Icons[p.icon];
            return (
              <div
                key={key}
                data-testid={`protocol-card-${key}`}
                className={`relative bg-white border border-[#EAE5D9] rounded-2xl p-7 md:p-8 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 shadow-sm group overflow-hidden ${bentoSpans[idx]}`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity">
                  <img src={p.image} alt="" className="w-full h-full object-cover rounded-bl-[100px]" />
                </div>
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-5 ${
                    p.accent === "ocean" ? "bg-ocean-light text-ocean" :
                    p.accent === "terracotta" ? "bg-terracotta-light text-terracotta" :
                    "bg-[#EAF1ED] text-sage"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-2xl md:text-3xl text-ink mb-2">{p.title}</h3>
                  <p className="text-sm text-ink-muted leading-relaxed max-w-md">{p.blurb}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FREEDOM section */}
      <section className="bg-[#F5F2EB] py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-10 items-start">
          <div className="md:col-span-5">
            <p className="text-xs tracking-[0.25em] uppercase text-terracotta font-semibold mb-3">The Method</p>
            <h2 className="font-serif text-4xl md:text-5xl text-ink leading-tight">
              The F.R.E.E.D.O.M. healing framework
            </h2>
            <p className="mt-4 text-ink-muted">
              Wave Therapy is a powerful tool inside a broader healing framework that aids the body in healing itself — spiritual connection, restoration, electric health, emotional balance, detox, oxygenate and mindfulness.
            </p>
            <img src={FREEDOM_IMG} alt="Stacked stones — balance and natural healing" className="mt-6 w-full max-h-[560px] object-cover rounded-2xl border border-[#EAE5D9]" />
          </div>
          <div className="md:col-span-7 flex flex-col gap-3">
            {FREEDOM.map((f, i) => (
              <div
                key={i}
                className="bg-white border border-[#EAE5D9] rounded-xl p-5 md:p-6 flex items-start gap-5 hover:border-ocean/40 hover:shadow-sm transition-all"
              >
                <span className="font-serif text-5xl md:text-6xl text-ocean leading-none shrink-0 w-12 md:w-14 text-center">
                  {f.letter}
                </span>
                <div className="flex-1 pt-1">
                  <div className="text-base font-semibold text-ink">{f.title}</div>
                  <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-14 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-xs tracking-[0.25em] uppercase text-sage font-semibold mb-3">How your plan works</p>
          <h2 className="font-serif text-4xl md:text-5xl text-ink leading-tight">Easy to Use. Flexible Options.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {[
            { step: "1", title: "Enter the sequence", body: "On your Wave Therapy device press AUTO, then the recommended Code number, then RUN to begin." },
            { step: "2", title: "Pause anytime", body: "Press any number key (1–9) to pause mid-session. Press RUN to resume exactly where you left off." },
            { step: "3", title: "Follow your plan", body: "Your AI-generated schedule shares which codes to run, when, and for how long along with tips and modifications." },
          ].map((s) => (
            <div key={s.step} className="bg-white border border-[#EAE5D9] rounded-2xl p-7 shadow-sm">
              <div className="text-5xl font-serif text-terracotta mb-3">{s.step}</div>
              <h3 className="font-semibold text-ink mb-1.5 text-xl">{s.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#F5F2EB] py-14 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-serif text-3xl md:text-4xl text-ink mb-8 text-center">Real stories from the CuraWaves community</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white border border-[#EAE5D9] rounded-2xl p-7">
                <Quote className="w-6 h-6 text-terracotta mb-3" />
                <p className="text-ink-muted text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4 pt-4 border-t border-[#EAE5D9]">
                  <div className="text-sm font-semibold text-ink">{t.name}</div>
                  <div className="text-xs text-ink-muted">{t.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-6 py-14 md:py-20">
        <div className="grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-6 order-2 md:order-1">
            <div className="relative">
              <div className="absolute -inset-3 bg-terracotta-light rounded-tr-[60px] rounded-bl-[60px] rotate-1"></div>
              <img
                src="https://curawaves.com/cdn/shop/products/ScreenShot2022-01-17at10.59.02PM_893x479.png?v=1642489164"
                alt="Heart drawn in beach sand"
                className="relative w-full h-72 md:h-80 object-cover rounded-tr-[60px] rounded-bl-[60px] border border-[#EAE5D9]"
              />
            </div>
          </div>
          <div className="md:col-span-6 order-1 md:order-2 text-center md:text-left">
            <p className="text-xs tracking-[0.25em] uppercase text-terracotta font-semibold mb-3">Your next step</p>
            <h2 className="font-serif text-4xl md:text-5xl text-ink leading-tight">Take one step toward feeling great.</h2>
            <p className="mt-4 text-ink-muted max-w-xl">
              The questionnaire takes about 3 minutes. Your plan arrives instantly with day-by-day codes you can run on your Wave Therapy machine.
            </p>
            <Link
              to="/onboarding"
              data-testid="footer-cta-button"
              className="mt-8 bg-ocean hover:bg-ocean-dark text-white text-base font-medium px-8 py-4 rounded-full inline-flex items-center gap-2 transition-all active:scale-95"
            >
              Begin my health questionnaire <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
