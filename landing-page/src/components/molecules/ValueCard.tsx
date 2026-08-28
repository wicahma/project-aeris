import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ValueCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badgeText?: string;
  stepNumber?: string;
}

export const ValueCard: React.FC<ValueCardProps> = ({
  icon: Icon,
  title,
  description,
  badgeText,
  stepNumber
}) => {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 transition-all duration-300 hover:border-indigo-500/50 hover:bg-zinc-900/90 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-indigo-400 group-hover:text-indigo-300 transition-colors">
            <Icon className="w-5 h-5" />
          </div>
          {stepNumber && (
            <span className="font-mono font-bold text-xl text-zinc-700">
              {stepNumber}
            </span>
          )}
        </div>
        
        <h3 className="text-lg font-bold font-sans text-white mb-2 tracking-tight">{title}</h3>
        <p className="text-xs font-sans text-zinc-400 leading-relaxed">{description}</p>
      </div>

      {badgeText && (
        <div className="pt-6 mt-4 border-t border-zinc-800/60 flex justify-start">
          <span className="text-[10px] font-mono font-medium px-2.5 py-0.5 bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 rounded-full">
            {badgeText}
          </span>
        </div>
      )}
    </div>
  );
};