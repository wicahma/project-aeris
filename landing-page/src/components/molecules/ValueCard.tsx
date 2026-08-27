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
    <div className="bg-zinc-900 border-2 border-zinc-700 p-6 transition-all duration-200 hover:border-indigo-500 hover:-translate-y-1 shadow-[4px_4px_0px_0px_#27272a] hover:shadow-[6px_6px_0px_0px_#6366f1] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="p-3 bg-zinc-950 border-2 border-zinc-800 text-indigo-400">
            <Icon className="w-6 h-6" />
          </div>
          {stepNumber && (
            <span className="font-mono font-black text-2xl text-zinc-700">
              {stepNumber}
            </span>
          )}
        </div>
        
        <h3 className="text-lg font-black font-sans text-white mb-2 uppercase tracking-tight">{title}</h3>
        <p className="text-xs font-sans text-zinc-400 leading-relaxed">{description}</p>
      </div>

      {badgeText && (
        <div className="pt-6 mt-4 border-t border-zinc-800 flex justify-start">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-950/80 text-indigo-400 border border-indigo-500/40">
            {badgeText}
          </span>
        </div>
      )}
    </div>
  );
};