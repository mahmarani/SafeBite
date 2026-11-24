import { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  GitCompareArrows,
  ScanLine,
  ShieldAlert,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IngredientTable } from '../components/analysis/IngredientTable';
import { NutritionPanel } from '../components/analysis/NutritionPanel';
import { PersonalizedInsights } from '../components/analysis/PersonalizedInsights';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import {
  HealthGradeScale,
  NutrientTrafficLightCard,
  ProcessingLevelTile,
} from '../components/common/FoodScorecards';
import { HealthScoreCircularGauge } from '../components/common/HealthScoreGauge';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';
import { ProductVisual } from '../components/common/ProductVisual';
import { HealthStatusBadge } from '../components/common/StatusBadge';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { analysisService } from '../services/analysisService';
import {
  formatAnalysisDate,
  getGradeMeta,
  getProcessingTier,
} from '../utils/healthScoring';

export function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getAnalysisById,
    healthProfile,
    isSavedAnalysis,
    toggleSavedAnalysis,
    addProductToCompare,
  } = useAppData();
  const { showToast } = useToast();

  const product = id ? getAnalysisById(id) : undefined;

  const personalizedWarnings = useMemo(() => {
    if (!product || !product.personalizedProfileApplied) return [];
    return analysisService.evaluatePersonalizedWarnings(product, healthProfile);
  }, [product, healthProfile]);

  if (!product) {
    return (
      <DashboardLayout>
        <EmptyState
          icon={ScanLine}
          title="Analysis report not found"
          description="This product analysis may have been deleted from your history or the link is no longer valid."
          action={
            <>
              <Link to="/history">
                <Button variant="secondary">Browse History</Button>
              </Link>
              <Link to="/scan">
                <Button variant="primary">Scan a Product</Button>
              </Link>
            </>
          }
        />
      </DashboardLayout>
    );
  }

  const saved = isSavedAnalysis(product.id);
  const gradeMeta = getGradeMeta(product.healthScore);
  const procMeta = getProcessingTier(product.processingLevel);

  const highWarnings = personalizedWarnings.filter((w) => w.severity === 'high').length;
  const modWarnings = personalizedWarnings.filter((w) => w.severity === 'moderate').length;

  const profileVerdict = !product.personalizedProfileApplied
    ? {
        bg: '#F6F1E8',
        border: '#E8E1D5',
        titleColor: '#1F1A17',
        icon: <ShieldAlert className="w-6 h-6 text-[#6A6057]" strokeWidth={1.8} />,
        title: 'General Scan Mode',
        subtitle: 'Health profile matching was off for this scan',
      }
    : highWarnings > 0
      ? {
          bg: '#FDECEC',
          border: '#F7BEBC',
          titleColor: '#9B1F1B',
          icon: <AlertCircle className="w-6 h-6 text-[#D43832]" strokeWidth={2} />,
          title: `${highWarnings} High-Priority Flag${highWarnings > 1 ? 's' : ''}`,
          subtitle: 'Conflicts with your allergies or medical profile',
        }
      : modWarnings > 0
        ? {
            bg: '#FEF8E6',
            border: '#F6DC93',
            titleColor: '#8F6208',
            icon: <AlertTriangle className="w-6 h-6 text-[#E59417]" strokeWidth={2} />,
            title: `${modWarnings} Moderate Caution${modWarnings > 1 ? 's' : ''}`,
            subtitle: 'Check against your dietary preferences below',
          }
        : {
            bg: '#E9F7EF',
            border: '#BDE5CE',
            titleColor: '#135530',
            icon: <CheckCircle2 className="w-6 h-6 text-[#1D7A46]" strokeWidth={2} />,
            title: 'Matches Your Profile',
            subtitle: 'No allergen or condition conflicts detected',
          };

  const handleToggleSave = () => {
    const nextSaved = toggleSavedAnalysis(product.id);
    showToast({
      type: 'success',
      title: nextSaved ? 'Analysis saved' : 'Removed from saved',
      description: nextSaved
        ? `${product.productName} has been bookmarked in your history.`
        : `${product.productName} was removed from saved items.`,
    });
  };

  const handleCompare = () => {
    addProductToCompare(product.id);
    navigate('/compare');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#5C534A] hover:text-[#1F1A17] transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            <span>Return to Dashboard</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant={saved ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleToggleSave}
            >
              {saved ? (
                <BookmarkCheck className="w-4 h-4 text-[#1D7A46]" strokeWidth={2} />
              ) : (
                <Bookmark className="w-4 h-4" strokeWidth={1.8} />
              )}
              <span>{saved ? 'Saved Analysis' : 'Save Analysis'}</span>
            </Button>

            <Button variant="secondary" size="sm" onClick={handleCompare}>
              <GitCompareArrows className="w-4 h-4" strokeWidth={1.8} />
              <span>Compare Products</span>
            </Button>

            <Link to="/scan">
              <Button variant="primary" size="sm">
                <ScanLine className="w-4 h-4" strokeWidth={2} />
                <span>Scan Another Product</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Product Overview Card */}
        <section className="card-surface p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-3">
              <ProductVisual
                visualType={product.visualType}
                imageUrl={product.imageUrl}
                productName={product.productName}
                size="lg"
              />
            </div>

            <div className="lg:col-span-6 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <HealthStatusBadge status={product.healthStatus} />
                <span className="text-[12px] text-[#6A6057]">
                  {product.category} · Analyzed {formatAnalysisDate(product.analysisDate)}
                </span>
              </div>

              <div>
                <h1 className="font-display text-[24px] sm:text-[30px] leading-[36px] font-extrabold tracking-[-0.02em] text-[#1F1A17]">
                  {product.productName}
                </h1>
                <p className="mt-1 text-[14px] font-medium text-[#5C534A]">
                  {product.brand} <span aria-hidden="true">·</span> Serving:{' '}
                  {product.nutrition.servingSize}
                </p>
              </div>

              <p className="text-[14px] leading-[22px] text-[#423A34]">{product.summary}</p>

              {/* Allergen Disclosure Strip */}
              <div className="pt-1">
                <div className="inset-surface border border-[#E8E1D5] px-3.5 py-2.5 flex flex-wrap items-center gap-2 text-[12px]">
                  <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0" strokeWidth={2} />
                  <span className="font-bold text-[#1F1A17]">Declared Allergens:</span>
                  {product.allergens.length === 0 ? (
                    <span className="text-[#5C534A]">None of the top common allergens declared</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {product.allergens.map((allergen) => (
                        <span
                          key={allergen}
                          className="rounded-full bg-[#FEF4E4] border border-[#F4CA85] px-2.5 py-0.5 font-data text-[11px] font-semibold text-[#925B06]"
                        >
                          {allergen}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 flex flex-col items-center justify-center lg:border-l lg:border-[#E8E1D5] lg:pl-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#E8E1D5]">
              <HealthScoreCircularGauge score={product.healthScore} size={120} />
              <p className="mt-2.5 font-data text-[11px] font-bold uppercase tracking-[0.05em] text-[#6A6057]">
                NutriLens Score
              </p>
            </div>
          </div>
        </section>

        {/* Signature 3-Column Vivid Scorecard Row (Grade A-E · Processing Tier 1-4 · Profile Match) */}
        <section
          aria-label="Key product scorecards"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5"
        >
          {/* Card 1: NutriLens Grade A-E */}
          <div
            style={{
              backgroundColor: gradeMeta.tintBg,
              borderColor: gradeMeta.tintBorder,
            }}
            className="rounded-[14px] border p-5 flex flex-col justify-between gap-4"
          >
            <div className="flex items-center justify-between gap-3">
              <HealthGradeScale score={product.healthScore} />
              <span
                style={{ color: gradeMeta.textColor }}
                className="font-data tabular-nums text-[13px] font-bold"
              >
                {product.healthScore}/100
              </span>
            </div>
            <div>
              <h2
                style={{ color: gradeMeta.textColor }}
                className="font-display text-[16px] font-bold"
              >
                NutriLens Grade {gradeMeta.grade}
              </h2>
              <p className="text-[12px] leading-[18px] text-[#423A34] mt-0.5">
                {gradeMeta.label} — {gradeMeta.subtitle}.
              </p>
            </div>
          </div>

          {/* Card 2: Processing Level 1-4 */}
          <div
            style={{
              backgroundColor: procMeta.tintBg,
              borderColor: procMeta.tintBorder,
            }}
            className="rounded-[14px] border p-5 flex items-center gap-4"
          >
            <ProcessingLevelTile level={product.processingLevel} size="md" />
            <div className="min-w-0">
              <p className="font-data text-[10px] font-bold uppercase tracking-[0.06em] text-[#6A6057]">
                Food Processing
              </p>
              <h2
                style={{ color: procMeta.textColor }}
                className="font-display text-[16px] font-bold mt-0.5"
              >
                {procMeta.title}
              </h2>
              <p className="text-[12px] leading-[18px] text-[#423A34] mt-1">
                {procMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Card 3: Profile Match Verdict */}
          <div
            style={{
              backgroundColor: profileVerdict.bg,
              borderColor: profileVerdict.border,
            }}
            className="rounded-[14px] border p-5 flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-[11px] bg-white/85 flex items-center justify-center shrink-0 shadow-xs">
              {profileVerdict.icon}
            </div>
            <div className="min-w-0">
              <p className="font-data text-[10px] font-bold uppercase tracking-[0.06em] text-[#6A6057]">
                Your Criteria
              </p>
              <h2
                style={{ color: profileVerdict.titleColor }}
                className="font-display text-[16px] font-bold mt-0.5"
              >
                {profileVerdict.title}
              </h2>
              <p className="text-[12px] leading-[18px] text-[#423A34] mt-1">
                {profileVerdict.subtitle}
              </p>
            </div>
          </div>
        </section>

        {/* Split Panel: Traffic-Light Nutrient Levels + Personalized Insights (7 cols) & Nutrition Facts (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <NutrientTrafficLightCard nutrition={product.nutrition} />

            <PersonalizedInsights
              warnings={personalizedWarnings}
              profile={healthProfile}
              profileApplied={product.personalizedProfileApplied}
            />

            {/* Dietary Recommendations */}
            <section className="card-surface p-5 sm:p-6">
              <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
                Dietary Recommendations
              </h2>
              <p className="text-[13px] text-[#6A6057] mt-0.5">
                Practical serving guidance and cleaner pantry pairings.
              </p>
              <ul className="mt-4 space-y-2.5">
                {product.recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="inset-surface border border-[#EAE1D2] px-4 py-3 flex items-start gap-3 text-[13px] leading-[20px] text-[#1F1A17]"
                  >
                    <CheckCircle2
                      className="w-4 h-4 text-[#1D7A46] shrink-0 mt-0.5"
                      strokeWidth={2}
                    />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="lg:col-span-5">
            <NutritionPanel nutrition={product.nutrition} />
          </div>
        </div>

        {/* Full-Width Ingredient Breakdown */}
        <IngredientTable ingredients={product.ingredients} />

        <MedicalDisclaimer />
      </div>
    </DashboardLayout>
  );
}
