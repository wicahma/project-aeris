import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'indigo' | 'emerald' | 'amber' | 'zinc';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'indigo' }) => {
  const variants = {
    indigo: 'bg-brand-primary/10 text-brand-primary border-brand-primary/30',
    emerald: 'bg-brand-accent/10 text-brand-accent border-brand-accent/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    zinc: 'bg-zinc-800 text-zinc-300 border-zinc-700'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-mono font-medium border rounded-full ${variants[variant]}`}>
      {children}
    </span>
  );
};