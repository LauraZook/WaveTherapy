import React from "react";

export const CodeChip = ({ code }) => {
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
