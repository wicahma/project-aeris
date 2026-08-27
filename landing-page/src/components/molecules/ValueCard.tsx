import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ValueCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badgeText?: string;
}

export const ValueCard: React.FC<ValueCardProps> = ({
  icon: Icon,
  title,
  description,
  badgeText
}) => {
  return (
    <div className="bg-dark-card border-2 border-dark-border rounded-xl p-6 transition-all duration-200 hover:border-brand-primary hover:-translate-y-1 shadow-neubrutalism-dark flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-brand-primary">
            <Icon className="w-6 h-6" />
          </div>
          {badgeText && (
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              {badgeText}
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold font-sans text-white mb-2">{title}</h3>
        <p className="text-sm font-sans text-dark-muted leading-relaxed">{description}</p>
      </div>
    </div>
  );
};