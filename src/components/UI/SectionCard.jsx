import React from "react";

export default function SectionCard({
  icon,
  title,
  subtitle,
  right,
  children,
  variant = "default", // default | subtle | elevated
  padded = true,
  divider = false,
  dense = false,
  className = "",
}) {
  const variantClass = {
    default: "app-panel",
    subtle: "app-panel-muted",
    elevated: "app-panel",
  }[variant];

  return (
    <section
      className={`${variantClass} ${padded ? (dense ? "p-4" : "p-4 sm:p-8") : ""} ${className}`}
    >
      {(title || right || icon || subtitle) && (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 ${dense ? "mb-2" : "mb-6"}`}>
          <div>
            <div className="flex items-center gap-2">
              {icon && <span className="text-[#c96a0b]">{icon}</span>}
              {title && (
                <h2 className="text-xl font-bold text-[#2a1808]">{title}</h2>
              )}
            </div>
            {subtitle && (
              <div className="mt-1 text-sm text-[#7a6148]">{subtitle}</div>
            )}
          </div>
          {right && <div>{right}</div>}
        </div>
      )}
      {divider && <div className="mb-4 border-b border-[var(--line)]" />}
      <div>{children}</div>
    </section>
  );
}
