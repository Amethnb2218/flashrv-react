import React from 'react';

export default function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
  };
  const colorClass = colorMap[color] || colorMap.gray;

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-xl border shadow-md ${colorClass}`}>
      {Icon && <Icon className="w-8 h-8 mb-2" />}
      <div className="text-2xl font-bold font-poppins mb-1">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-widest font-poppins text-center">{label}</div>
    </div>
  );
}