import React from 'react';

export default function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    yellow: 'bg-[#fff1d8] text-[#8a4c0b] border-[#e7cfaf]',
    green: 'bg-[#eef7ef] text-[#335c3f] border-[#c9ddc9]',
    blue: 'bg-[#f3eadc] text-[#5f4630] border-[#e7cfaf]',
    purple: 'bg-[#f6eee2] text-[#6b523c] border-[#e7cfaf]',
    red: 'bg-[#fff0ea] text-[#9d4f0d] border-[#e7cfaf]',
    gray: 'bg-[#fff8ee] text-[#2a1808] border-[#e7cfaf]',
  };
  const colorClass = colorMap[color] || colorMap.gray;

  return (
    <div className={`flex flex-col items-center justify-center border p-4 shadow-sm sm:p-6 ${colorClass}`}>
      {Icon && <Icon className="mb-2 h-7 w-7 sm:h-8 sm:w-8" />}
      <div className="text-xl sm:text-2xl font-bold font-poppins mb-1">{value}</div>
      <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide sm:tracking-widest font-poppins text-center">{label}</div>
    </div>
  );
}
