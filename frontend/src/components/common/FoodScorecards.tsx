import { NutritionalInfo, ProcessingLevel } from '../../types';
import {
  getGradeMeta,
  getNutrientTrafficLights,
  getProcessingTier,
  GRADE_META_MAP,
  HealthGrade,
} from '../../utils/healthScoring';

const ALL_GRADES: HealthGrade[] = ['A', 'B', 'C', 'D', 'E'];

/**
 * Full A-E visual letter scale inspired by modern food scorecards,
 * with the product's active letter magnified and elevated.
 */
export function HealthGradeScale({
  score,
  grade,
  compact = false,
}: {
  score: number | null;
  grade?: HealthGrade | null;
  compact?: boolean;
}) {
  const meta = getGradeMeta(score, grade);

  return (
    <div
      className="inline-flex items-center select-none"
      role="img"
      aria-label={
        score === null
          ? 'Health Grade Unknown, insufficient nutrition data'
          : `SafeBite Grade ${meta.grade}, score ${score} out of 100`
      }
    >
      {ALL_GRADES.map((letter, index) => {
        const isActive = letter === meta.grade;
        const letterColor = GRADE_META_MAP[letter].color;
        const rounded =
          index === 0
            ? 'rounded-l-[7px]'
            : index === ALL_GRADES.length - 1
              ? 'rounded-r-[7px]'
              : '';

        if (isActive) {
          return (
            <span
              key={letter}
              style={{ backgroundColor: letterColor }}
              className={`relative z-10 inline-flex items-center justify-center rounded-[8px] border-2 border-white font-display font-extrabold text-white shadow-sm ${
                compact ? 'w-7 h-8 text-[15px] -mx-0.5' : 'w-9 h-10 text-[18px] -mx-0.5'
              }`}
            >
              {letter}
            </span>
          );
        }

        return (
          <span
            key={letter}
            style={{ backgroundColor: letterColor }}
            className={`inline-flex items-center justify-center font-display font-bold text-white/80 opacity-75 ${rounded} ${
              compact ? 'w-5 h-6 text-[11px]' : 'w-6 h-7 text-[12px]'
            }`}
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Compact square grade tile for lists, tables, and history rows.
 */
export function HealthGradeTile({
  score,
  grade,
  size = 'md',
}: {
  score: number | null;
  grade?: HealthGrade | null;
  size?: 'sm' | 'md';
}) {
  const meta = getGradeMeta(score, grade);
  return (
    <span
      style={{ backgroundColor: meta.color }}
      title={
        score === null
          ? `Grade ? — ${meta.label}`
          : `Grade ${meta.grade} (${score}/100) — ${meta.label}`
      }
      className={`inline-flex items-center justify-center rounded-[8px] font-display font-extrabold text-white shrink-0 shadow-xs ${
        size === 'sm' ? 'w-7 h-7 text-[13px]' : 'w-8 h-8 text-[15px]'
      }`}
    >
      {meta.grade}
    </span>
  );
}

/**
 * Numbered food processing badge (1 = Minimally Processed, 3 = Processed, 4 = Ultra-Processed).
 */
export function ProcessingLevelTile({
  level,
  tier,
  size = 'md',
}: {
  level: ProcessingLevel;
  tier?: 1 | 3 | 4 | null;
  size?: 'sm' | 'md';
}) {
  const meta = getProcessingTier(level, tier);
  return (
    <span
      title={`Processing Tier ${meta.tier}: ${meta.title}`}
      className="inline-flex flex-col items-center justify-center shrink-0 select-none"
    >
      <span
        className={`font-data font-bold uppercase tracking-[0.06em] text-[#6A6057] leading-none mb-0.5 ${
          size === 'sm' ? 'text-[8px]' : 'text-[9px]'
        }`}
      >
        TIER
      </span>
      <span
        style={{ backgroundColor: meta.color }}
        className={`inline-flex items-center justify-center rounded-[7px] font-display font-extrabold text-white shadow-xs ${
          size === 'sm' ? 'w-6 h-6 text-[12px]' : 'w-8 h-9 text-[17px]'
        }`}
      >
        {meta.tier}
      </span>
    </span>
  );
}

/**
 * Compact inline traffic-light summary dots (Fat · Sat. Fat · Sugar · Sodium) for list rows.
 */
export function MiniTrafficDots({
  nutrition,
  nutrientLevels,
}: {
  nutrition: NutritionalInfo;
  nutrientLevels?: Record<string, 'low' | 'moderate' | 'high' | 'unknown'>;
}) {
  const items = getNutrientTrafficLights(nutrition, nutrientLevels);
  return (
    <div
      className="inline-flex items-center gap-1.5"
      title={items.map((i) => `${i.label}: ${i.levelLabel} (${i.valueText})`).join(' · ')}
    >
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1 text-[11px] font-data text-[#6A6057]"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.dotColor }}
            aria-hidden="true"
          />
          <span className="sr-only">
            {item.label}: {item.levelLabel}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Full Traffic-Light Nutrient Levels card showing green / amber / red indicator rows
 * for Total Fat, Saturated Fat, Sugars, and Sodium/Salt.
 */
export function NutrientTrafficLightCard({ nutrition }: { nutrition: NutritionalInfo }) {
  const items = getNutrientTrafficLights(nutrition).filter((item) => item.level !== 'unknown');

  if (items.length === 0) return null;

  return (
    <section className="card-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E8E1D5] flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
            Nutrient Levels at a Glance
          </h2>
          <p className="text-[13px] text-[#6A6057] mt-0.5">
            Per serving ({nutrition.servingSize}) evaluated on a 3-tier traffic-light scale.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-data font-medium text-[#6A6057]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1F9D55]" />
            Low
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E59417]" />
            Moderate
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC3B35]" />
            High
          </span>
        </div>
      </div>

      <div className="divide-y divide-[#EFE9DF]">
        {items.map((item) => (
          <div
            key={item.key}
            className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#FAF7F2]/80 transition-colors"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span
                className="w-4 h-4 rounded-full shrink-0 ring-4 ring-white shadow-xs"
                style={{ backgroundColor: item.dotColor }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p
                  className="text-[14px] font-semibold truncate"
                  style={{ color: item.textColor }}
                >
                  {item.description}
                </p>
                <p className="text-[12px] text-[#6A6057]">{item.label}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-data tabular-nums text-[14px] font-bold text-[#1F1A17]">
                {item.valueText}
              </span>
              <span
                style={{ backgroundColor: item.pillBg, color: item.textColor }}
                className="rounded-full px-2.5 py-0.5 font-data text-[11px] font-semibold whitespace-nowrap"
              >
                {item.levelLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
