import React from "react";

export const Footer = () => {
  return (
    <footer className="bg-[#F5F2EB] border-t border-[#EAE5D9] mt-24 py-12 text-sm text-ink-muted" data-testid="site-footer">
      <div className="max-w-5xl mx-auto px-6">
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
