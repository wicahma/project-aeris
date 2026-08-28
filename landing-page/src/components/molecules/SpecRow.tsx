import React from 'react';

interface SpecRowProps {
  metric: string;
  aerisValue: string;
  competitorValue: string;
  highlight?: boolean;
}

export const SpecRow: React.FC<SpecRowProps> = ({
  metric,
  aerisValue,
  competitorValue,
  highlight = false
}) => {
  return (
    <tr className={`border-b border-zinc-800 text-sm font-mono ${highlight ? 'bg-brand-primary/5' : ''}`}>
      <td className="py-3.5 px-4 font-medium text-white">{metric}</td>
      <td className="py-3.5 px-4 font-semibold text-brand-accent">{aerisValue}</td>
      <td className="py-3.5 px-4 text-dark-muted">{competitorValue}</td>
    </tr>
  );
};