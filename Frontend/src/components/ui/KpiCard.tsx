"use client";

import React from "react";

type KpiCardProps = {
  title: string;
  value: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger';
};

const KpiCard: React.FC<KpiCardProps> = ({ title, value, trend, icon, color = 'primary' }) => {
  const colorClasses = {
    primary: {
      bg: 'bg-sky-50', // Corresponds to primary-50
      text: 'text-sky-600',
    },
    success: {
      bg: 'bg-green-50',
      text: 'text-green-700',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
    },
    danger: {
      bg: 'bg-red-50',
      text: 'text-red-700',
    },
  };

  const trendClasses = {
    up: 'bg-green-50 text-green-700',
    down: 'bg-red-50 text-red-700',
    neutral: 'bg-gray-100 text-gray-600',
  }

  const selectedColor = colorClasses[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${selectedColor.bg}`}>
          <span className={`text-2xl ${selectedColor.text}`}>{icon}</span>
        </div>
        {trend && (
          <div className={`flex items-center px-2 py-1 rounded-full text-sm font-medium ${trendClasses[trend.direction]}`}>
            {trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '–'} {trend.value}
          </div>
        )}
      </div>
      
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

export default KpiCard;
