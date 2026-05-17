import React from "react";

// Single-channel codes use a different keystroke sequence than the default AUTO programs.
// Map: code → ordered keystroke tokens to render on the chip.
const SPECIAL_KEYSTROKES = {
  444: ["10", "SELECT", "444", "RUN"],
  161: ["30", "SELECT", "161", "RUN"],
};

export const CodeChip = ({ code }) => {
  const special = SPECIAL_KEYSTROKES[code];

  if (special) {
    return (
      <div className="inline-flex items-center gap-1.5 font-mono text-sm bg-white p-2 pr-3 rounded-lg border border-[#EAE5D9] flex-wrap">
        {special.map((token, i) => {
          const isCode = token === String(code);
          const isAction = token === "SELECT" || token === "RUN";
          return (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-gray-400">›</span>}
              <span
                className={
                  isCode
                    ? "bg-ocean-light text-ocean font-bold px-3 py-1 rounded text-base"
                    : isAction
                    ? "bg-sage text-white px-2.5 py-1 rounded text-xs tracking-wider"
                    : "bg-amber-50 text-amber-700 px-2.5 py-1 rounded text-xs tracking-wider"
                }
              >
                {token}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 font-mono text-sm bg-white p-2 pr-3 rounded-lg border border-[#EAE5D9]">
      <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded text-xs tracking-wider">AUTO</span>
      <span className="text-gray-400">›</span>
      <span className="bg-ocean-light text-ocean font-bold px-3 py-1 rounded text-base">{code}</span>
      <span className="text-gray-400">›</span>
      <span className="bg-sage text-white px-2.5 py-1 rounded text-xs tracking-wider">RUN</span>
    </div>
  );
};

export default CodeChip;
