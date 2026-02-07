import React from "react";

export default function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={
        `relative inline-flex items-center justify-center px-5 py-2.5 rounded-2xl font-semibold border border-blue-200 shadow-xl bg-gradient-to-br from-white/80 via-blue-50/80 to-slate-100/60 text-blue-700 hover:bg-blue-50 focus:ring-4 focus:ring-blue-100/40 transition overflow-hidden ${className}`
      }
      style={{ boxShadow: '0 2px 16px 0 #3b82f622, 0 0 12px 1px #a21caf11' }}
      {...props}
    >
      {/* Glow effect */}
      <span className="absolute inset-0 z-0 rounded-2xl blur-lg opacity-30 pointer-events-none bg-gradient-to-br from-blue-400/20 via-fuchsia-400/10 to-amber-200/10 animate-pulse-slow" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
