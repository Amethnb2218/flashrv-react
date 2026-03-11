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
    default: "bg-white shadow-sm border border-primary-200/70",
    subtle: "bg-primary-50 border border-primary-100",
    elevated: "bg-white shadow-lg border border-primary-200/70",
  }[variant];

  return (
    <section
      className={`rounded-2xl ${variantClass} ${padded ? (dense ? "p-4" : "p-4 sm:p-8") : ""} ${className}`}
    >
      {(title || right || icon || subtitle) && (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 ${dense ? "mb-2" : "mb-6"}`}>
          <div>
            <div className="flex items-center gap-2">
              {icon && <span className="text-blue-600">{icon}</span>}
              {title && (
                <h2 className="text-xl font-bold text-primary-900">{title}</h2>
              )}
            </div>
            {subtitle && (
              <div className="text-primary-500 text-sm mt-1">{subtitle}</div>
            )}
          </div>
          {right && <div>{right}</div>}
        </div>
      )}
      {divider && <div className="border-b border-primary-100 mb-4" />}
      <div>{children}</div>
    </section>
  );
}
