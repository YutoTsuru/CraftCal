"use client";

import React from "react";

export function BackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* subtle grid */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, rgba(203,213,225,0.06) 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, rgba(203,213,225,0.06) 32px)` }} />

      {/* moving blurred gradient */}
      <div className="absolute -bottom-20 left-1/4 w-[60vw] h-[40vh] rounded-full blur-3xl opacity-40 bg-gradient-to-r from-sky-200 via-purple-200 to-amber-200 animate-decor-motion" />
    </div>
  );
}

export default BackgroundDecor;
