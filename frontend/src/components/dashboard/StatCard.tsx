import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  helper: string;
  icon: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const TONE_STYLES = {
  default: {
    iconBg: 'bg-[#F3EDE2] text-[#1F1A17] border-[#E8E1D5]',
    accentBar: 'bg-[#1F1A17]',
  },
  success: {
    iconBg: 'bg-[#E9F7EF] text-[#1D7A46] border-[#BDE5CE]',
    accentBar: 'bg-[#1D7A46]',
  },
  warning: {
    iconBg: 'bg-[#FEF8E6] text-[#D99B16] border-[#F6DC93]',
    accentBar: 'bg-[#E59417]',
  },
  danger: {
    iconBg: 'bg-[#FDECEC] text-[#D43832] border-[#F7BEBC]',
    accentBar: 'bg-[#D43832]',
  },
};

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'default',
}: StatCardProps) {
  const style = TONE_STYLES[tone];

  return (
    <div className="card-surface overflow-hidden flex flex-col justify-between">
      <div className={`h-1 w-full ${style.accentBar}`} />
      <div className="p-5 flex flex-col justify-between gap-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[13px] font-semibold text-[#5C534A]">{label}</span>
          <span
            className={`w-9 h-9 rounded-[9px] border flex items-center justify-center shrink-0 ${style.iconBg}`}
          >
            <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </span>
        </div>
        <div>
          <div className="font-data tabular-nums text-[30px] leading-[36px] font-bold text-[#1F1A17]">
            {value}
          </div>
          <p className="mt-1 text-[12px] text-[#6A6057]">{helper}</p>
        </div>
      </div>
    </div>
  );
}
