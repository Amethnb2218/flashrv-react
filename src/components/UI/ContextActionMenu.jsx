import React, { useEffect, useRef, useState } from "react";
import { FiMoreHorizontal } from "react-icons/fi";

export default function ContextActionMenu({ items = [], label = "Actions" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onOutsideClick = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const visibleItems = items.filter((item) => !item?.hidden);
  if (visibleItems.length === 0) return null;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-primary-200 bg-white text-primary-600 hover:bg-primary-50 hover:border-primary-300 transition shadow-sm"
      >
        <FiMoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 min-w-[190px] rounded-xl border border-primary-200 bg-white shadow-xl py-1">
          {visibleItems.map((item) => (
            <button
              key={item.key || item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                if (!item.disabled && item.onClick) item.onClick();
              }}
              disabled={item.disabled}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition ${
                item.disabled
                  ? "text-primary-300 cursor-not-allowed"
                  : "text-primary-700 hover:bg-primary-50"
              } ${item.danger ? "hover:text-red-600" : ""}`}
            >
              {item.icon ? <item.icon className={`w-4 h-4 ${item.danger ? "text-red-500" : "text-primary-400"}`} /> : null}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
