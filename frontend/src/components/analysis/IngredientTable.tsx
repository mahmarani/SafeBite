import { useMemo, useState } from 'react';
import { IngredientCategory, IngredientItem } from '../../types';
import { IngredientCategoryBadge } from '../common/StatusBadge';

const FILTER_OPTIONS: Array<'All' | IngredientCategory> = [
  'All',
  'Beneficial',
  'Neutral',
  'Requires attention',
  'Potential allergen',
];

export function IngredientTable({ ingredients }: { ingredients: IngredientItem[] }) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | IngredientCategory>('All');

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: ingredients.length };
    for (const item of ingredients) {
      map[item.category] = (map[item.category] || 0) + 1;
    }
    return map;
  }, [ingredients]);

  const filtered = useMemo(() => {
    if (selectedCategory === 'All') return ingredients;
    return ingredients.filter((item) => item.category === selectedCategory);
  }, [ingredients, selectedCategory]);

  return (
    <section className="card-surface overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-[#E8E1D5] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
            Ingredient Breakdown
          </h2>
          <p className="text-[13px] text-[#6A6057] mt-0.5">
            Listed in order of label weight with origin, processing tier, and safety notes.
          </p>
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Filter ingredients by category"
        >
          {FILTER_OPTIONS.map((option) => {
            const count = counts[option] || 0;
            const active = selectedCategory === option;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(option)}
                className={`px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#1F1A17] text-[#FAF7F2]'
                    : 'bg-[#FAF7F2] text-[#5C534A] border border-[#E8E1D5] hover:bg-[#F3EDE2] hover:text-[#1F1A17]'
                }`}
              >
                <span>{option}</span>
                <span
                  className={`ml-1.5 font-data tabular-nums ${
                    active ? 'text-[#D6CCBE]' : 'text-[#8A7F74]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-[14px] text-[#6A6057]">
          No ingredients fall under the &ldquo;{selectedCategory}&rdquo; category for this product.
        </div>
      ) : (
        <div className="divide-y divide-[#EFE9DF]">
          {filtered.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="px-5 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-start justify-between gap-3 hover:bg-[#FAF7F2]/80 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-data tabular-nums text-[12px] font-semibold text-[#8A7F74] w-5 shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-[14px] font-bold text-[#1F1A17]">{item.name}</h3>
                  {item.scientificName && (
                    <span className="text-[12px] italic text-[#6A6057]">
                      ({item.scientificName})
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#6A6057] mt-0.5 sm:pl-7">
                  {item.originOrFunction}
                  {item.processedLevel ? ` · ${item.processedLevel}` : ''}
                </p>
                <p className="text-[13px] leading-[20px] text-[#423A34] mt-2 sm:pl-7">
                  {item.explanation}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 sm:pl-7 lg:pl-0">
                <IngredientCategoryBadge category={item.category} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
