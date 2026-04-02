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
        className="inline-flex h-9 w-9 items-center justify-center border border-[var(--line)] bg-[#fff8ee] text-[#7a6148] transition hover:bg-[#fff2df]"
      >
        <FiMoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 min-w-[190px] border border-[var(--line)] bg-[var(--surface-strong)] py-1 shadow-xl">
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
                  ? "cursor-not-allowed text-[#c8ab86]"
                  : "text-[#5f4630] hover:bg-[#fff2df]"
              } ${item.danger ? "hover:text-red-600" : ""}`}
            >
              {item.icon ? <item.icon className={`w-4 h-4 ${item.danger ? "text-red-500" : "text-[#a47e51]"}`} /> : null}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
