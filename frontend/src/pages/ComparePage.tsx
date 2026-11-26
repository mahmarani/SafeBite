import { useEffect, useMemo } from 'react';
import { ArrowLeftRight, CheckCircle2, GitCompareArrows, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import {
  HealthGradeScale,
  ProcessingLevelTile,
} from '../components/common/FoodScorecards';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';
import { ProductVisual } from '../components/common/ProductVisual';
import { HealthStatusBadge } from '../components/common/StatusBadge';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAppData } from '../context/AppDataContext';
import { analysisService } from '../services/analysisService';
import {
  getGradeMeta,
  getNutrientTrafficLights,
} from '../utils/healthScoring';

interface CompareMetricRow {
  label: string;
  valueA: string;
  valueB: string;
  dotA?: string;
  dotB?: string;
  better: 'A' | 'B' | 'tie';
}

export function ComparePage() {
  const { analyses, compareIds, setCompareSelection } = useAppData();

  const [selectedAId, selectedBId] = useMemo(() => {
    if (analyses.length < 2) return ['', ''];
    const validA = analyses.some((a) => a.id === compareIds[0])
      ? compareIds[0]
      : analyses[0].id;
    const validB =
      analyses.some((a) => a.id === compareIds[1]) && compareIds[1] !== validA
        ? compareIds[1]
        : analyses.find((a) => a.id !== validA)?.id || analyses[1].id;
    return [validA, validB];
  }, [analyses, compareIds]);

  useEffect(() => {
    if (
      selectedAId &&
      selectedBId &&
      (selectedAId !== compareIds[0] || selectedBId !== compareIds[1])
    ) {
      setCompareSelection([selectedAId, selectedBId]);
    }
  }, [selectedAId, selectedBId, compareIds, setCompareSelection]);

  const productA = analyses.find((a) => a.id === selectedAId);
  const productB = analyses.find((a) => a.id === selectedBId);

  const comparisonSummary = useMemo(() => {
    if (!productA || !productB) return null;
    return analysisService.generateComparisonSummary(productA, productB);
  }, [productA, productB]);

  const metricRows = useMemo<CompareMetricRow[]>(() => {
    if (!productA || !productB) return [];

    const lowerWins = (a: number | null, b: number | null): 'A' | 'B' | 'tie' => {
      if (a === null || b === null) return 'tie';
      if (Math.abs(a - b) < 0.05) return 'tie';
      return a < b ? 'A' : 'B';
    };

    const higherWins = (a: number | null, b: number | null): 'A' | 'B' | 'tie' => {
      if (a === null || b === null) return 'tie';
      if (Math.abs(a - b) < 0.05) return 'tie';
      return a > b ? 'A' : 'B';
    };

    const lightsA = Object.fromEntries(
      getNutrientTrafficLights(productA.nutrition, productA.nutrientLevels).map((item) => [
        item.key,
        item.dotColor,
      ])
    );
    const lightsB = Object.fromEntries(
      getNutrientTrafficLights(productB.nutrition, productB.nutrientLevels).map((item) => [
        item.key,
        item.dotColor,
      ])
    );

    const concernsA = productA.ingredients.filter((i) => i.category === 'Requires attention').length;
    const concernsB = productB.ingredients.filter((i) => i.category === 'Requires attention').length;

    const fmtVal = (val: number | null, unit: string) => (val !== null ? `${val} ${unit}` : 'Unknown');

    return [
      {
        label: 'Health Score & Grade',
        valueA:
          productA.healthScore !== null
            ? `Grade ${getGradeMeta(productA.healthScore).grade} (${productA.healthScore}/100)`
            : 'Unknown',
        valueB:
          productB.healthScore !== null
            ? `Grade ${getGradeMeta(productB.healthScore).grade} (${productB.healthScore}/100)`
            : 'Unknown',
        better: higherWins(productA.healthScore, productB.healthScore),
      },
      {
        label: 'Calories (per serving)',
        valueA: fmtVal(productA.nutrition.calories, 'kcal'),
        valueB: fmtVal(productB.nutrition.calories, 'kcal'),
        better: lowerWins(productA.nutrition.calories, productB.nutrition.calories),
      },
      {
        label: 'Total Sugar',
        valueA:
          productA.nutrition.sugarG !== null
            ? `${productA.nutrition.sugarG} g${productA.nutrition.addedSugarG !== null ? ` (${productA.nutrition.addedSugarG}g added)` : ''}`
            : 'Unknown',
        valueB:
          productB.nutrition.sugarG !== null
            ? `${productB.nutrition.sugarG} g${productB.nutrition.addedSugarG !== null ? ` (${productB.nutrition.addedSugarG}g added)` : ''}`
            : 'Unknown',
        dotA: lightsA.sugars,
        dotB: lightsB.sugars,
        better: lowerWins(productA.nutrition.sugarG, productB.nutrition.sugarG),
      },
      {
        label: 'Sodium / Salt',
        valueA: fmtVal(productA.nutrition.sodiumMg, 'mg'),
        valueB: fmtVal(productB.nutrition.sodiumMg, 'mg'),
        dotA: lightsA.sodium,
        dotB: lightsB.sodium,
        better: lowerWins(productA.nutrition.sodiumMg, productB.nutrition.sodiumMg),
      },
      {
        label: 'Saturated Fat',
        valueA: fmtVal(productA.nutrition.saturatedFatG, 'g'),
        valueB: fmtVal(productB.nutrition.saturatedFatG, 'g'),
        dotA: lightsA.saturatedFat,
        dotB: lightsB.saturatedFat,
        better: lowerWins(productA.nutrition.saturatedFatG, productB.nutrition.saturatedFatG),
      },
      {
        label: 'Protein',
        valueA: fmtVal(productA.nutrition.proteinG, 'g'),
        valueB: fmtVal(productB.nutrition.proteinG, 'g'),
        better: higherWins(productA.nutrition.proteinG, productB.nutrition.proteinG),
      },
      {
        label: 'Dietary Fiber',
        valueA: fmtVal(productA.nutrition.fiberG, 'g'),
        valueB: fmtVal(productB.nutrition.fiberG, 'g'),
        better: higherWins(productA.nutrition.fiberG, productB.nutrition.fiberG),
      },
      {
        label: 'Flagged Ingredient Concerns',
        valueA: `${concernsA} ingredient${concernsA === 1 ? '' : 's'}`,
        valueB: `${concernsB} ingredient${concernsB === 1 ? '' : 's'}`,
        better: lowerWins(concernsA, concernsB),
      },
      {
        label: 'Potential Allergens',
        valueA: productA.allergens.length > 0 ? productA.allergens.join(', ') : 'None declared',
        valueB: productB.allergens.length > 0 ? productB.allergens.join(', ') : 'None declared',
        better: lowerWins(productA.allergens.length, productB.allergens.length),
      },
    ];
  }, [productA, productB]);

  const handleSwap = () => {
    if (selectedAId && selectedBId) {
      setCompareSelection([selectedBId, selectedAId]);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-[26px] sm:text-[30px] leading-[36px] font-extrabold tracking-[-0.02em] text-[#1F1A17]">
            Product Comparison
          </h1>
          <p className="mt-1 text-[14px] text-[#5C534A]">
            Compare A–E Health Grades, processing tiers, traffic-light nutrients, and allergens
            side by side.
          </p>
        </div>

        {analyses.length < 2 || !productA || !productB ? (
          <EmptyState
            icon={GitCompareArrows}
            title="At least two analyzed products are required"
            description="Scan or restore at least two products in your history to unlock side-by-side nutritional comparison."
            action={
              <Link to="/scan">
                <Button variant="primary">
                  <ScanLine className="w-4 h-4" strokeWidth={2} />
                  <span>Scan Another Product</span>
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* Selector Bar */}
            <section className="card-surface p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-end">
                <div className="md:col-span-5">
                  <label
                    htmlFor="compare-product-a"
                    className="block text-[11px] font-bold uppercase tracking-[0.05em] font-data text-[#6A6057] mb-1.5"
                  >
                    Product A
                  </label>
                  <select
                    id="compare-product-a"
                    value={productA.id}
                    onChange={(e) => setCompareSelection([e.target.value, productB.id])}
                    className="input-field h-[42px] w-full px-3 text-[14px] bg-white"
                  >
                    {analyses.map((item) => (
                      <option key={item.id} value={item.id} disabled={item.id === productB.id}>
                        {item.productName} (Grade {getGradeMeta(item.healthScore).grade} ·{' '}
                        {item.healthScore}/100)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1 flex justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSwap}
                    aria-label="Swap compared products"
                    className="h-[42px] w-full md:w-10 px-0"
                  >
                    <ArrowLeftRight className="w-4 h-4" strokeWidth={1.8} />
                  </Button>
                </div>

                <div className="md:col-span-5">
                  <label
                    htmlFor="compare-product-b"
                    className="block text-[11px] font-bold uppercase tracking-[0.05em] font-data text-[#6A6057] mb-1.5"
                  >
                    Product B
                  </label>
                  <select
                    id="compare-product-b"
                    value={productB.id}
                    onChange={(e) => setCompareSelection([productA.id, e.target.value])}
                    className="input-field h-[42px] w-full px-3 text-[14px] bg-white"
                  >
                    {analyses.map((item) => (
                      <option key={item.id} value={item.id} disabled={item.id === productA.id}>
                        {item.productName} (Grade {getGradeMeta(item.healthScore).grade} ·{' '}
                        {item.healthScore}/100)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Dynamic Comparison Summary Banner */}
            {comparisonSummary && (
              <section className="card-surface p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-[9px] bg-[#E9F7EF] border border-[#BDE5CE] flex items-center justify-center text-[#1D7A46] shrink-0">
                    <GitCompareArrows className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-[17px] font-bold text-[#1F1A17]">
                      Comparison Summary
                    </h2>
                    <p className="mt-1 text-[14px] leading-[22px] text-[#423A34]">
                      {comparisonSummary.headline}
                    </p>
                    <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {comparisonSummary.keyTakeaways.map((point, idx) => (
                        <li
                          key={idx}
                          className="inset-surface border border-[#EAE1D2] px-3.5 py-2.5 text-[13px] text-[#1F1A17] flex items-start gap-2"
                        >
                          <CheckCircle2
                            className="w-4 h-4 text-[#1D7A46] shrink-0 mt-0.5"
                            strokeWidth={2}
                          />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Side-by-Side Product Scorecard Headers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Product A', product: productA },
                { label: 'Product B', product: productB },
              ].map(({ label, product }) => {
                const isWinner = comparisonSummary?.winnerId === product.id;
                const gradeMeta = getGradeMeta(product.healthScore, product.healthGrade);
                return (
                  <div
                    key={product.id}
                    className={`card-surface overflow-hidden flex flex-col justify-between ${
                      isWinner ? 'ring-2 ring-[#1D7A46]/35 border-[#1D7A46]' : ''
                    }`}
                  >
                    <div
                      style={{
                        backgroundColor: gradeMeta.tintBg,
                        borderBottomColor: gradeMeta.tintBorder,
                      }}
                      className="px-5 py-3 border-b flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-data text-[11px] font-bold uppercase tracking-[0.05em] text-[#5C534A]">
                          {label}
                        </span>
                        {isWinner && (
                          <span className="rounded-full bg-[#1D7A46] px-2.5 py-0.5 font-data text-[10px] font-bold text-white">
                            Higher Score
                          </span>
                        )}
                      </div>
                      <HealthGradeScale
                        score={product.healthScore}
                        grade={product.healthGrade}
                        compact
                      />
                    </div>

                    <div className="p-5 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <ProductVisual
                          visualType={product.visualType}
                          imageUrl={product.imageUrl}
                          productName={product.productName}
                          size="md"
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/analysis/${product.id}`}
                            className="block font-display text-[18px] font-bold text-[#1F1A17] hover:text-[#1D7A46] transition-colors truncate"
                          >
                            {product.productName}
                          </Link>
                          <p className="text-[13px] text-[#6A6057] truncate">
                            {product.brand} · {product.nutrition.servingSize}
                          </p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <HealthStatusBadge status={product.healthStatus} />
                            <span className="font-data tabular-nums text-[13px] font-bold text-[#1F1A17]">
                              {product.healthScore}/100
                            </span>
                          </div>
                        </div>
                      </div>
                      <ProcessingLevelTile level={product.processingLevel} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detailed Metric Comparison Table */}
            <section className="card-surface overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E8E1D5] flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-[17px] font-bold text-[#1F1A17]">
                  Nutritional &amp; Ingredient Breakdown
                </h2>
                <span className="text-[12px] text-[#6A6057]">
                  Favorable metrics highlighted with traffic-light indicators
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[540px]">
                  <thead>
                    <tr className="bg-[#F6F1E8] border-b border-[#E8E1D5] font-data text-[11px] font-bold uppercase tracking-[0.04em] text-[#6A6057]">
                      <th className="py-3 px-5 w-[34%]">Metric</th>
                      <th className="py-3 px-5 w-[33%]">{productA.productName}</th>
                      <th className="py-3 px-5 w-[33%]">{productB.productName}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE9DF] text-[13px]">
                    {metricRows.map((row) => (
                      <tr key={row.label} className="hover:bg-[#FAF7F2]/60">
                        <td className="py-3.5 px-5 font-semibold text-[#1F1A17]">{row.label}</td>
                        <td
                          className={`py-3.5 px-5 font-data tabular-nums ${
                            row.better === 'A'
                              ? 'bg-[#E9F7EF]/80 font-bold text-[#135530]'
                              : 'text-[#423A34]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2">
                              {row.dotA && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: row.dotA }}
                                />
                              )}
                              <span>{row.valueA}</span>
                            </span>
                            {row.better === 'A' && (
                              <span className="text-[11px] font-bold text-[#1D7A46] shrink-0">
                                Better
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className={`py-3.5 px-5 font-data tabular-nums ${
                            row.better === 'B'
                              ? 'bg-[#E9F7EF]/80 font-bold text-[#135530]'
                              : 'text-[#423A34]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2">
                              {row.dotB && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: row.dotB }}
                                />
                              )}
                              <span>{row.valueB}</span>
                            </span>
                            {row.better === 'B' && (
                              <span className="text-[11px] font-bold text-[#1D7A46] shrink-0">
                                Better
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <MedicalDisclaimer compact />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
