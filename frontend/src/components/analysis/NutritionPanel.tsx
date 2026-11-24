import { NutritionalInfo } from '../../types';
import { calculateDailyValuePercent, DAILY_VALUES } from '../../utils/healthScoring';

interface NutrientRowConfig {
  label: string;
  amount: string;
  dv?: number;
  tone?: 'normal' | 'warning' | 'danger' | 'beneficial';
  indent?: boolean;
}

export function NutritionPanel({ nutrition }: { nutrition: NutritionalInfo }) {
  const rows: NutrientRowConfig[] = [
    {
      label: 'Total Fat',
      amount: `${nutrition.totalFatG} g`,
      dv: calculateDailyValuePercent(nutrition.totalFatG, DAILY_VALUES.totalFatG),
      tone: nutrition.totalFatG >= 12 ? 'danger' : nutrition.totalFatG >= 4.5 ? 'warning' : 'normal',
    },
    {
      label: 'Saturated Fat',
      amount: `${nutrition.saturatedFatG} g`,
      dv: calculateDailyValuePercent(nutrition.saturatedFatG, DAILY_VALUES.saturatedFatG),
      tone:
        nutrition.saturatedFatG >= 3.5
          ? 'danger'
          : nutrition.saturatedFatG >= 1.5
            ? 'warning'
            : 'normal',
      indent: true,
    },
    {
      label: 'Sodium',
      amount: `${nutrition.sodiumMg} mg`,
      dv: calculateDailyValuePercent(nutrition.sodiumMg, DAILY_VALUES.sodiumMg),
      tone:
        nutrition.sodiumMg >= 280
          ? 'danger'
          : nutrition.sodiumMg >= 140
            ? 'warning'
            : 'normal',
    },
    {
      label: 'Total Carbohydrate',
      amount: `${nutrition.carbohydratesG} g`,
      dv: calculateDailyValuePercent(nutrition.carbohydratesG, DAILY_VALUES.carbohydratesG),
      tone: 'normal',
    },
    {
      label: 'Dietary Fiber',
      amount: `${nutrition.fiberG} g`,
      dv: calculateDailyValuePercent(nutrition.fiberG, DAILY_VALUES.fiberG),
      tone: nutrition.fiberG >= 4 ? 'beneficial' : 'normal',
      indent: true,
    },
    {
      label: 'Total Sugars',
      amount: `${nutrition.sugarG} g`,
      tone: nutrition.sugarG >= 15 ? 'danger' : nutrition.sugarG >= 6 ? 'warning' : 'normal',
      indent: true,
    },
    {
      label: 'Added Sugars',
      amount: `${nutrition.addedSugarG} g`,
      dv: calculateDailyValuePercent(nutrition.addedSugarG, DAILY_VALUES.addedSugarG),
      tone:
        nutrition.addedSugarG >= 10
          ? 'danger'
          : nutrition.addedSugarG >= 5
            ? 'warning'
            : 'beneficial',
      indent: true,
    },
    {
      label: 'Protein',
      amount: `${nutrition.proteinG} g`,
      dv: calculateDailyValuePercent(nutrition.proteinG, DAILY_VALUES.proteinG),
      tone: nutrition.proteinG >= 10 ? 'beneficial' : 'normal',
    },
  ];

  const getBarColor = (tone: NutrientRowConfig['tone']) => {
    switch (tone) {
      case 'danger':
        return '#DC3B35';
      case 'warning':
        return '#E59417';
      case 'beneficial':
        return '#1D7A46';
      default:
        return '#6A6057';
    }
  };

  return (
    <section className="card-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E8E1D5]">
        <div>
          <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
            Nutrition Facts
          </h2>
          <p className="text-[13px] text-[#6A6057] mt-0.5">
            Serving size: <span className="font-semibold text-[#1F1A17]">{nutrition.servingSize}</span>
          </p>
        </div>
        <div className="text-right shrink-0 bg-[#F6F1E8] border border-[#E8E1D5] rounded-[10px] px-3.5 py-2">
          <div className="font-data tabular-nums text-[24px] leading-none font-bold text-[#1F1A17]">
            {nutrition.calories}
          </div>
          <div className="font-data text-[10px] font-bold uppercase tracking-[0.06em] text-[#6A6057] mt-1">
            KCAL
          </div>
        </div>
      </div>

      {/* Macro Quick Strip */}
      <div className="grid grid-cols-4 gap-2 py-4 border-b border-[#E8E1D5]">
        {[
          { label: 'Protein', val: `${nutrition.proteinG}g`, accent: '#1D7A46' },
          { label: 'Carbs', val: `${nutrition.carbohydratesG}g`, accent: '#D99B16' },
          { label: 'Fat', val: `${nutrition.totalFatG}g`, accent: '#E06520' },
          { label: 'Fiber', val: `${nutrition.fiberG}g`, accent: '#5A9E2F' },
        ].map((macro) => (
          <div key={macro.label} className="inset-surface px-3 py-2.5 text-center border border-[#EAE1D2]">
            <div className="font-data tabular-nums text-[15px] font-bold text-[#1F1A17]">
              {macro.val}
            </div>
            <div className="text-[11px] font-medium text-[#6A6057] mt-0.5 flex items-center justify-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: macro.accent }}
                aria-hidden="true"
              />
              {macro.label}
            </div>
          </div>
        ))}
      </div>

      {/* Nutrient Rows */}
      <div className="mt-3 divide-y divide-[#EFE9DF]">
        <div className="pb-2 flex items-center justify-between font-data text-[10px] font-bold uppercase tracking-[0.06em] text-[#8A7F74]">
          <span>Nutrient</span>
          <div className="flex items-center gap-6">
            <span>Amount</span>
            <span className="w-12 text-right">DV%</span>
          </div>
        </div>
        {rows.map((row) => (
          <div key={row.label} className="py-2.5">
            <div className="flex items-center justify-between gap-4 text-[13px]">
              <span
                className={`${
                  row.indent ? 'pl-4 text-[#5C534A]' : 'font-semibold text-[#1F1A17]'
                }`}
              >
                {row.label}
              </span>
              <div className="flex items-center gap-6 shrink-0">
                <span className="font-data tabular-nums font-semibold text-[#1F1A17]">
                  {row.amount}
                </span>
                <span className="font-data tabular-nums text-[12px] text-[#6A6057] w-12 text-right">
                  {row.dv !== undefined ? `${row.dv}%` : '—'}
                </span>
              </div>
            </div>
            {row.dv !== undefined && (
              <div
                className={`mt-1.5 h-1.5 rounded-full bg-[#F3EDE2] overflow-hidden ${
                  row.indent ? 'ml-4' : ''
                }`}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, row.dv)}%`,
                    backgroundColor: getBarColor(row.tone),
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-[#6A6057] leading-[16px]">
        * Percent Daily Values (DV%) are based on a standard 2,000 calorie reference diet.
      </p>
    </section>
  );
}
