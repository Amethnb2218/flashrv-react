import React from 'react';

export default function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    yellow: 'bg-gold-100 text-yellow-800 border-gold-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    gray: 'bg-primary-100 text-primary-800 border-primary-300',
  };
  const colorClass = colorMap[color] || colorMap.gray;

  return (
    <div className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl border shadow-md ${colorClass}`}>
      {Icon && <Icon className="w-7 h-7 sm:w-8 sm:h-8 mb-2" />}
      <div className="text-xl sm:text-2xl font-bold font-poppins mb-1">{value}</div>
      <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide sm:tracking-widest font-poppins text-center">{label}</div>
    </div>
  );
}