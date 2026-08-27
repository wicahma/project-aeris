import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'indigo' | 'emerald' | 'amber' | 'zinc';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'indigo' }) => {
  const variants = {
    indigo: 'bg-indigo-950/80 text-indigo-400 border-indigo-500/50',
    emerald: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50',
    amber: 'bg-amber-950/80 text-amber-400 border-amber-500/50',
    zinc: 'bg-zinc-900 text-zinc-300 border-zinc-700'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider uppercase border-2 ${variants[variant]}`}>
      {children}
    </span>
  );
};