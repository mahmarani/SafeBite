import { getScoreColor } from '../../utils/healthScoring';

interface CircularGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function HealthScoreCircularGauge({
  score,
  size = 112,
  strokeWidth = 9,
  label = 'Health Score',
}: CircularGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const strokeColor = getScoreColor(clamped);

  return (
    <div
      className="relative inline-flex flex-col items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${clamped} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F3EDE2"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-data tabular-nums text-[28px] leading-none font-bold text-[#1F1A17]">
          {clamped}
        </span>
        <span className="font-data text-[11px] font-medium text-[#6A6057] mt-1">/ 100</span>
      </div>
    </div>
  );
}

export function HealthScoreBar({
  score,
  showValue = true,
  heightClass = 'h-2',
}: {
  score: number;
  showValue?: boolean;
  heightClass?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = getScoreColor(clamped);

  return (
    <div className="flex items-center gap-3 w-full">
      <div className={`flex-1 rounded-full bg-[#F3EDE2] overflow-hidden ${heightClass}`}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      {showValue && (
        <span className="font-data tabular-nums text-[13px] font-bold text-[#1F1A17] w-8 text-right shrink-0">
          {clamped}
        </span>
      )}
    </div>
  );
}
