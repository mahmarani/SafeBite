import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card-surface p-10 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-[11px] bg-[#E9F7EF] border border-[#BDE5CE] flex items-center justify-center text-[#1D7A46] mb-4">
        <Icon className="w-6 h-6" strokeWidth={1.75} />
      </div>
      <h3 className="font-display text-[18px] font-bold text-[#1F1A17]">{title}</h3>
      <p className="mt-2 max-w-md text-[14px] leading-[22px] text-[#5C534A]">{description}</p>
      {action && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>
      )}
    </div>
  );
}
