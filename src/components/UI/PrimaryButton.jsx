import React from "react";

export default function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={
        `relative inline-flex items-center justify-center px-5 py-2.5 rounded-2xl font-semibold shadow-xl bg-gradient-to-br from-blue-600 via-blue-500 to-fuchsia-500 text-white hover:from-blue-700 hover:to-fuchsia-600 focus:ring-4 focus:ring-blue-200/40 transition overflow-hidden ${className}`
      }
      style={{ boxShadow: '0 2px 16px 0 #3b82f655, 0 0 12px 1px #a21caf33' }}
      {...props}
    >
      {/* Glow effect */}
      <span className="absolute inset-0 z-0 rounded-2xl blur-lg opacity-40 pointer-events-none bg-gradient-to-br from-blue-400/40 via-fuchsia-400/20 to-amber-200/10 animate-pulse-slow" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
