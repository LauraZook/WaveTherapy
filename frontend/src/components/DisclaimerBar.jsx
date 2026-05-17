import React from "react";
import { AlertCircle } from "lucide-react";

export const DisclaimerBar = () => {
  return (
    <div
      data-testid="disclaimer-banner"
      className="sticky top-0 z-50 w-full bg-[#FDF1E5] text-[#7A5A3A] text-xs md:text-sm border-b border-[#EAE5D9]"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-center">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>
          For education &amp; investigative use only. Wave Therapy is a health &amp; wellness device — not intended to diagnose, treat, cure or prevent any disease.
        </span>
      </div>
    </div>
  );
};

export default DisclaimerBar;
