import { Leaf } from 'lucide-react';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <span className="w-8 h-8 rounded-[9px] bg-[#1D7A46] flex items-center justify-center text-white shrink-0 shadow-xs">
        <Leaf className="w-4 h-4" strokeWidth={2} />
      </span>
      {!compact && (
        <span className="font-display text-[19px] font-bold tracking-[-0.025em] text-[#1F1A17]">
          Nutri<span className="text-[#1D7A46]">Lens</span>
        </span>
      )}
    </span>
  );
}
