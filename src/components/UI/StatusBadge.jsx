import React from "react";
import { FiClock, FiCheck, FiX, FiPause } from "react-icons/fi";

const statusMap = {
  PENDING: {
    label: "En attente",
    icon: <FiClock className="w-4 h-4 mr-1" />,
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  APPROVED: {
    label: "Approuvé",
    icon: <FiCheck className="w-4 h-4 mr-1" />,
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  REJECTED: {
    label: "Refusé",
    icon: <FiX className="w-4 h-4 mr-1" />,
    className: "bg-rose-50 text-rose-800 border-rose-200",
  },
  SUSPENDED: {
    label: "Suspendu",
    icon: <FiPause className="w-4 h-4 mr-1" />,
    className: "bg-orange-50 text-orange-800 border-orange-200",
  },
};

export default function StatusBadge({
  status = "PENDING",
  size = "md", // sm | md
  pill = true,
  className = "",
}) {
  const config = statusMap[status] || statusMap.PENDING;
  const sizeClass = size === "sm"
    ? "px-2 py-0.5 text-xs"
    : "px-3 py-1 text-sm";
  const pillClass = pill ? "rounded-full" : "rounded-lg";
  return (
    <span
      className={`inline-flex items-center font-semibold border ${sizeClass} ${pillClass} ${config.className} ${className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
