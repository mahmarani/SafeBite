import { AlertCircle, AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { HealthStatus, IngredientCategory } from '../../types';

export function HealthStatusBadge({ status }: { status: HealthStatus }) {
  if (status === 'Healthy') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E9F7EF] border border-[#BDE5CE] px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] text-[#135530] whitespace-nowrap shrink-0 font-data">
        <CheckCircle2 className="w-3.5 h-3.5 text-[#1D7A46]" strokeWidth={2} />
        <span>Healthy</span>
      </span>
    );
  }

  if (status === 'Moderate') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF8E6] border border-[#F6DC93] px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] text-[#8F6208] whitespace-nowrap shrink-0 font-data">
        <AlertTriangle className="w-3.5 h-3.5 text-[#D99B16]" strokeWidth={2} />
        <span>Moderate</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDECEC] border border-[#F7BEBC] px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] text-[#9B1F1B] whitespace-nowrap shrink-0 font-data">
      <AlertCircle className="w-3.5 h-3.5 text-[#D43832]" strokeWidth={2} />
      <span>Requires attention</span>
    </span>
  );
}

export function IngredientCategoryBadge({ category }: { category: IngredientCategory }) {
  switch (category) {
    case 'Beneficial':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F7EF] border border-[#BDE5CE] px-2.5 py-0.5 text-[11px] font-semibold text-[#135530] whitespace-nowrap shrink-0 font-data">
          <CheckCircle2 className="w-3 h-3 text-[#1D7A46]" strokeWidth={2} />
          <span>Beneficial</span>
        </span>
      );
    case 'Neutral':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F6F1E8] border border-[#E2D8C8] px-2.5 py-0.5 text-[11px] font-semibold text-[#5C534A] whitespace-nowrap shrink-0 font-data">
          <Info className="w-3 h-3 text-[#7A6F64]" strokeWidth={2} />
          <span>Neutral</span>
        </span>
      );
    case 'Potential allergen':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF4E4] border border-[#F4CA85] px-2.5 py-0.5 text-[11px] font-semibold text-[#925B06] whitespace-nowrap shrink-0 font-data">
          <ShieldAlert className="w-3 h-3 text-[#E59417]" strokeWidth={2} />
          <span>Potential allergen</span>
        </span>
      );
    case 'Requires attention':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FDECEC] border border-[#F7BEBC] px-2.5 py-0.5 text-[11px] font-semibold text-[#9B1F1B] whitespace-nowrap shrink-0 font-data">
          <AlertCircle className="w-3 h-3 text-[#D43832]" strokeWidth={2} />
          <span>Requires attention</span>
        </span>
      );
  }
}
