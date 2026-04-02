import React from "react";

export default function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={
        `btn-secondary relative inline-flex items-center justify-center px-5 py-2.5 font-semibold transition overflow-hidden ${className}`
      }
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}
