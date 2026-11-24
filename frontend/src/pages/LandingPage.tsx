import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  GitCompareArrows,
  HeartPulse,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import {
  HealthGradeScale,
  ProcessingLevelTile,
} from '../components/common/FoodScorecards';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';
import { ProductVisual } from '../components/common/ProductVisual';
import { IngredientCategoryBadge } from '../components/common/StatusBadge';
import { PublicLayout } from '../components/layout/PublicLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { INITIAL_MOCK_PRODUCTS } from '../data/mockProducts';
import {
  getGradeMeta,
  getNutrientTrafficLights,
  getProcessingTier,
} from '../utils/healthScoring';

const PREVIEW_PRODUCTS = [
  INITIAL_MOCK_PRODUCTS[0], // Sprouted Whole Grain Oat Cereal (88 · Grade A)
  INITIAL_MOCK_PRODUCTS[3], // Dark Cacao & Almond Protein Bar (71 · Grade C)
  INITIAL_MOCK_PRODUCTS[5], // Velvet Hazelnut Chocolate Spread (38 · Grade E)
];

export function LandingPage() {
  const { isAuthenticated, loginDemo } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [previewIdx, setPreviewIdx] = useState(0);

  const previewProduct = PREVIEW_PRODUCTS[previewIdx];
  const gradeMeta = getGradeMeta(previewProduct.healthScore);
  const procMeta = getProcessingTier(previewProduct.processingLevel);
  const trafficItems = getNutrientTrafficLights(previewProduct.nutrition);

  const handleTryDemo = () => {
    if (!isAuthenticated) {
      loginDemo();
      showToast({
        type: 'success',
        title: 'Demo session ready',
        description: 'Signed in as Claire Bennett with 8 sample product analyses.',
      });
    }
    navigate('/dashboard');
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6">
            <p className="font-data text-[12px] font-bold uppercase tracking-[0.06em] text-[#1D7A46]">
              Personalized Food &amp; Ingredient Intelligence
            </p>
            <h1 className="mt-3 font-display text-[34px] sm:text-[44px] leading-[42px] sm:leading-[52px] font-extrabold tracking-[-0.025em] text-[#1F1A17] text-balance">
              Decode every food label at a single glance.
            </h1>
            <p className="mt-4 text-[16px] leading-[26px] text-[#5C534A] max-w-xl">
              Upload any packaged food label to see instant A–E health grades, food processing
              tiers, traffic-light nutrient levels, and allergen alerts matched to your personal
              health profile.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" onClick={handleTryDemo}>
                <span>{isAuthenticated ? 'Go to Dashboard' : 'Explore Demo Workspace'}</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </Button>
              {!isAuthenticated && (
                <Link to="/register">
                  <Button variant="secondary" size="lg">
                    <span>Create Free Account</span>
                  </Button>
                </Link>
              )}
            </div>

            {/* Vivid Grade Scale Legend */}
            <div className="mt-8 pt-6 border-t border-[#E8E1D5]">
              <p className="text-[12px] font-semibold text-[#6A6057] mb-3">
                Instant 5-tier NutriLens Grade scale
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { g: 'A', label: '88–100', color: '#1D7A46', bg: '#E9F7EF', text: '#135530' },
                  { g: 'B', label: '80–87', color: '#5A9E2F', bg: '#F1F9E8', text: '#3A6B1B' },
                  { g: 'C', label: '65–79', color: '#D99B16', bg: '#FEF8E6', text: '#8F6208' },
                  { g: 'D', label: '50–64', color: '#E06520', bg: '#FEF0E7', text: '#9E3E0B' },
                  { g: 'E', label: '0–49', color: '#D43832', bg: '#FDECEC', text: '#9B1F1B' },
                ].map((tier) => (
                  <div
                    key={tier.g}
                    style={{ backgroundColor: tier.bg }}
                    className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5"
                  >
                    <span
                      style={{ backgroundColor: tier.color }}
                      className="w-5 h-5 rounded-[5px] inline-flex items-center justify-center font-display text-[11px] font-extrabold text-white"
                    >
                      {tier.g}
                    </span>
                    <span
                      style={{ color: tier.text }}
                      className="font-data tabular-nums text-[11px] font-semibold"
                    >
                      {tier.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Vivid Product Scorecard Preview */}
          <div className="lg:col-span-6">
            <div className="card-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E8E1D5]">
                <span className="font-data text-[11px] font-bold uppercase tracking-[0.05em] text-[#6A6057]">
                  Live Sample Scorecard
                </span>
                <div className="flex items-center gap-1 bg-[#F6F1E8] p-1 rounded-[9px] border border-[#E8E1D5]">
                  {['Oat Cereal', 'Protein Bar', 'Choc Spread'].map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setPreviewIdx(idx)}
                      className={`px-2.5 py-1 rounded-[7px] text-[12px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        previewIdx === idx
                          ? 'bg-[#1F1A17] text-[#FAF7F2] shadow-xs'
                          : 'text-[#5C534A] hover:text-[#1F1A17]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Header */}
              <div className="mt-4 flex items-center gap-4">
                <ProductVisual
                  visualType={previewProduct.visualType}
                  productName={previewProduct.productName}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[19px] font-bold text-[#1F1A17] truncate">
                    {previewProduct.productName}
                  </h2>
                  <p className="text-[13px] text-[#6A6057] truncate">
                    {previewProduct.brand} · {previewProduct.category}
                  </p>
                </div>
              </div>

              {/* Vivid 2-Card Grade + Processing Strip */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  style={{
                    backgroundColor: gradeMeta.tintBg,
                    borderColor: gradeMeta.tintBorder,
                  }}
                  className="rounded-[11px] border p-3.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <p
                      style={{ color: gradeMeta.textColor }}
                      className="text-[12px] font-bold"
                    >
                      Grade {gradeMeta.grade} · {previewProduct.healthScore}/100
                    </p>
                    <p className="text-[11px] text-[#5C534A] mt-0.5">
                      {previewProduct.healthStatus}
                    </p>
                  </div>
                  <HealthGradeScale score={previewProduct.healthScore} compact />
                </div>

                <div
                  style={{
                    backgroundColor: procMeta.tintBg,
                    borderColor: procMeta.tintBorder,
                  }}
                  className="rounded-[11px] border p-3.5 flex items-center gap-3"
                >
                  <ProcessingLevelTile level={previewProduct.processingLevel} size="sm" />
                  <div className="min-w-0">
                    <p
                      style={{ color: procMeta.textColor }}
                      className="text-[12px] font-bold truncate"
                    >
                      {procMeta.title}
                    </p>
                    <p className="text-[11px] text-[#5C534A] truncate mt-0.5">
                      Processing Tier {procMeta.tier} of 4
                    </p>
                  </div>
                </div>
              </div>

              {/* Traffic-Light Nutrient Grid */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {trafficItems.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-[9px] bg-[#FAF7F2] border border-[#EFE9DF] px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.dotColor }}
                      />
                      <span className="text-[12px] font-medium text-[#1F1A17] truncate">
                        {item.label}
                      </span>
                    </div>
                    <span className="font-data tabular-nums text-[12px] font-bold text-[#1F1A17] shrink-0">
                      {item.valueText}
                    </span>
                  </div>
                ))}
              </div>

              {/* Sample Ingredients */}
              <div className="mt-4 pt-4 border-t border-[#EFE9DF] space-y-2">
                {previewProduct.ingredients.slice(0, 3).map((ing) => (
                  <div
                    key={ing.name}
                    className="flex items-center justify-between gap-3 text-[13px]"
                  >
                    <span className="font-medium text-[#1F1A17] truncate">{ing.name}</span>
                    <IngredientCategoryBadge category={ing.category} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white border-y border-[#E8E1D5]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl">
            <h2 className="font-display text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] text-[#1F1A17]">
              Structured label evaluation in three steps
            </h2>
            <p className="mt-2 text-[15px] text-[#5C534A]">
              Designed for rapid everyday grocery choices with unmistakable visual clarity.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                accent: '#1D7A46',
                bg: '#E9F7EF',
                title: 'Upload a product label',
                description:
                  'Drag and drop or select a JPG or PNG photo of any nutrition facts panel or ingredient declaration.',
              },
              {
                step: '02',
                accent: '#E59417',
                bg: '#FEF8E6',
                title: 'Read vivid food scorecards',
                description:
                  'Instantly see A–E Health Grades, processing tiers, traffic-light nutrient dots, and ingredient breakdowns.',
              },
              {
                step: '03',
                accent: '#D43832',
                bg: '#FDECEC',
                title: 'Match to your health profile',
                description:
                  'Surface warnings tailored strictly to your saved allergies, medical conditions, dietary needs, and goals.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-[14px] border border-[#E8E1D5] bg-[#FAF7F2] p-6"
              >
                <span
                  style={{ backgroundColor: item.bg, color: item.accent }}
                  className="inline-flex items-center justify-center rounded-[7px] px-2.5 py-1 font-data tabular-nums text-[12px] font-bold"
                >
                  {item.step}
                </span>
                <h3 className="mt-3 font-display text-[18px] font-bold text-[#1F1A17]">
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[22px] text-[#5C534A]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section id="capabilities" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: ScanLine,
              bg: '#E9F7EF',
              color: '#1D7A46',
              title: 'Label Scanner',
              copy: 'Validate and preview nutrition label photos with step-by-step extraction progress.',
            },
            {
              icon: HeartPulse,
              bg: '#FDECEC',
              color: '#D43832',
              title: 'Health Profile Engine',
              copy: 'Configure allergies, blood pressure, diabetes, dietary preferences, and goals once.',
            },
            {
              icon: GitCompareArrows,
              bg: '#FEF8E6',
              color: '#D99B16',
              title: 'Side-by-Side Compare',
              copy: 'Benchmark grades, sugar, sodium, saturated fat, fiber, protein, and allergens.',
            },
            {
              icon: ShieldCheck,
              bg: '#F3EDE2',
              color: '#1F1A17',
              title: 'Persistent History',
              copy: 'Search, filter, bookmark, and review previously analyzed foods across sessions.',
            },
          ].map((cap) => (
            <div key={cap.title} className="card-surface p-6">
              <div
                style={{ backgroundColor: cap.bg, color: cap.color }}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center"
              >
                <cap.icon className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <h3 className="mt-4 font-display text-[17px] font-bold text-[#1F1A17]">
                {cap.title}
              </h3>
              <p className="mt-1.5 text-[14px] leading-[22px] text-[#5C534A]">{cap.copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 card-surface p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-[22px] font-bold text-[#1F1A17]">
              Ready to evaluate your pantry with instant clarity?
            </h2>
            <p className="mt-1.5 text-[14px] text-[#5C534A]">
              Jump straight into the interactive workspace with 8 pre-analyzed everyday foods or
              create a custom account to personalize your profile.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px] font-medium text-[#1F1A17]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#1D7A46]" strokeWidth={2} />
                No external accounts required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#1D7A46]" strokeWidth={2} />
                Local session persistence
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button variant="primary" size="lg" onClick={handleTryDemo}>
              <span>Launch Demo Workspace</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <MedicalDisclaimer compact />
        </div>
      </section>
    </PublicLayout>
  );
}
