import React from "react";

export const Footer = () => {
  return (
    <footer className="bg-[#F5F2EB] border-t border-[#EAE5D9] mt-24 py-12 text-sm text-ink-muted" data-testid="site-footer">
      <div className="max-w-5xl mx-auto px-6">
        {/* Coaching CTA */}
        <div className="mb-10 bg-white border border-[#EAE5D9] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <h3 className="font-serif text-2xl text-ink mb-1">Want to talk through your plan?</h3>
            <p className="text-ink-muted leading-relaxed">
              To discuss your Wave Therapy personalized plan with a CuraWaves Health Coach, please book a virtual coaching session with our team.
            </p>
          </div>
          <a
            href="https://curawaves.com/products/wellness-consultation-concierge-services"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="book-coaching-cta"
            className="bg-ocean hover:bg-ocean-dark text-white text-sm font-medium px-6 py-3 rounded-full inline-flex items-center justify-center gap-2 transition-colors shrink-0 active:scale-95"
          >
            Book a coaching session
          </a>
        </div>

        <h3 className="font-serif text-2xl text-ink mb-3">Important Disclaimer</h3>
        <p className="leading-relaxed mb-4">
          The Wave Therapy device and CuraWaves educational materials are provided for <strong>educational and investigative use only</strong>. They are <strong>not</strong>
          intended to diagnose, treat, cure, or prevent any disease. The personalized programs generated on this site are AI-informed educational suggestions
          based on the official Wave Therapy code catalog — they are not medical advice. Always consult a qualified healthcare provider before starting
          any new wellness routine, especially if you are pregnant, have a pacemaker or implanted electronic device, are managing a serious illness,
          or are taking prescription medication.
        </p>
        <p className="text-xs text-ink-muted/80 mt-6">© {new Date().getFullYear()} CuraWaves. Wave Therapy is proudly manufactured in the USA.</p>
      </div>
    </footer>
  );
};

export default Footer;
