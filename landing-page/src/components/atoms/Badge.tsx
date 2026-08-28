import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'indigo' | 'emerald' | 'amber' | 'zinc';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'indigo' }) => {
  const variants = {
    indigo: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/30',
    emerald: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
    zinc: 'bg-zinc-900 text-zinc-300 border-zinc-800'
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 text-[11px] font-mono font-medium border rounded-full ${variants[variant]}`}>
      {children}
    </span>
  );
};