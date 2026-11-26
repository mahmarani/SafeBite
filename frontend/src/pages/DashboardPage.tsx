import { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitCompareArrows,
  HeartPulse,
  ScanLine,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';
import { RecentAnalysisRow } from '../components/dashboard/RecentAnalysisRow';
import { StatCard } from '../components/dashboard/StatCard';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { analysisService } from '../services/analysisService';
import {
  getHealthGradeFromScore,
  GRADE_META_MAP,
  HealthGrade,
} from '../utils/healthScoring';

const GRADES_ORDER: HealthGrade[] = ['A', 'B', 'C', 'D', 'E'];

export function DashboardPage() {
  const { user } = useAuth();
  const { analyses, stats, healthProfile } = useAppData();

  const recentAnalyses = useMemo(() => {
    return [...analyses]
      .sort((a, b) => new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime())
      .slice(0, 5);
  }, [analyses]);

  const gradeDistribution = useMemo(() => {
    const counts: Record<HealthGrade, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (const item of analyses) {
      const grade = getHealthGradeFromScore(item.healthScore, item.healthGrade);
      if (grade !== '?') {
        counts[grade] += 1;
      }
    }
    return counts;
  }, [analyses]);

  const insightItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      detail: string;
      tone: 'success' | 'warning' | 'danger' | 'neutral';
      linkTo: string;
      linkLabel: string;
    }> = [];

    if (analyses.length === 0) return items;

    let allergenConflictCount = 0;
    let firstConflictProduct = null as (typeof analyses)[0] | null;
    for (const product of analyses) {
      const warnings = analysisService.evaluatePersonalizedWarnings(product, healthProfile);
      if (warnings.some((w) => w.type === 'allergy')) {
        allergenConflictCount += 1;
        if (!firstConflictProduct) firstConflictProduct = product;
      }
    }

    if (allergenConflictCount > 0 && firstConflictProduct) {
      items.push({
        id: 'insight-allergens',
        title: `${allergenConflictCount} product${allergenConflictCount > 1 ? 's' : ''} match your listed allergies`,
        detail: `${firstConflictProduct.productName} and similar entries trigger allergens saved in your health profile.`,
        tone: 'danger',
        linkTo: `/analysis/${firstConflictProduct.id}`,
        linkLabel: 'Review flagged item',
      });
    }

    const sodiumProducts = analyses.filter((p) => p.nutrition.sodiumMg !== null);
    const avgSodium =
      sodiumProducts.length > 0
        ? Math.round(
            sodiumProducts.reduce((sum, p) => sum + (p.nutrition.sodiumMg ?? 0), 0) /
              sodiumProducts.length
          )
        : 0;
    if (
      sodiumProducts.length > 0 &&
      (healthProfile.medicalConditions.includes('High blood pressure') ||
        healthProfile.dietaryPreferences.includes('Low sodium'))
    ) {
      const highSodiumCount = sodiumProducts.filter(
        (p) => (p.nutrition.sodiumMg ?? 0) >= 250
      ).length;
      items.push({
        id: 'insight-sodium',
        title: `Average sodium across scans: ${avgSodium} mg`,
        detail:
          highSodiumCount > 0
            ? `${highSodiumCount} analyzed item${highSodiumCount > 1 ? 's exceed' : ' exceeds'} 250 mg sodium per serving against your blood pressure / low-sodium profile.`
            : 'All analyzed items stay within moderate-to-low sodium thresholds per serving.',
        tone: highSodiumCount > 0 ? 'warning' : 'success',
        linkTo: '/history',
        linkLabel: 'Filter history',
      });
    }

    const healthyRatio = Math.round((stats.healthyCount / analyses.length) * 100);
    items.push({
      id: 'insight-average',
      title: `Pantry quality average: ${stats.averageScore}/100`,
      detail: `${healthyRatio}% of your scanned products fall in the Healthy tier (80–100), with ${stats.savedCount} bookmarked staples.`,
      tone: stats.averageScore >= 75 ? 'success' : 'neutral',
      linkTo: '/compare',
      linkLabel: 'Compare products',
    });

    return items;
  }, [analyses, healthProfile, stats.averageScore, stats.healthyCount, stats.savedCount]);

  const firstName = (user?.fullName || healthProfile.personal.fullName || 'there').split(' ')[0];
  const activeAllergyCount =
    healthProfile.allergies.length + healthProfile.customAllergies.length;
  const activeConditionCount =
    healthProfile.medicalConditions.length + healthProfile.customMedicalConditions.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] sm:text-[30px] leading-[36px] font-extrabold tracking-[-0.02em] text-[#1F1A17]">
              Good to see you, {firstName}
            </h1>
            <p className="mt-1 text-[14px] text-[#5C534A]">
              Live ingredient overview calculated from {stats.totalScanned} analyzed product
              {stats.totalScanned === 1 ? '' : 's'}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/compare">
              <Button variant="secondary" size="md">
                <GitCompareArrows className="w-4 h-4" strokeWidth={1.8} />
                <span>Compare Products</span>
              </Button>
            </Link>
            <Link to="/scan">
              <Button variant="primary" size="md">
                <ScanLine className="w-4 h-4" strokeWidth={2} />
                <span>New Label Scan</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          <StatCard
            label="Total Products Scanned"
            value={stats.totalScanned}
            helper={`Average score ${stats.averageScore}/100`}
            icon={ScanLine}
            tone="default"
          />
          <StatCard
            label="Healthy Products"
            value={stats.healthyCount}
            helper="Grades A–B · Score 80–100"
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label="Moderate / Caution"
            value={stats.moderateCount}
            helper="Grade C · Score 60–79"
            icon={AlertTriangle}
            tone="warning"
          />
          <StatCard
            label="Requires Attention"
            value={stats.requiresAttentionCount}
            helper="Grades D–E · Score 0–59"
            icon={AlertCircle}
            tone="danger"
          />
        </div>

        {/* Visual A-E Grade Distribution Strip */}
        {analyses.length > 0 && (
          <section className="card-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-display text-[15px] font-bold text-[#1F1A17]">
                Pantry Health Grade Distribution (A–E)
              </h2>
              <span className="text-[12px] text-[#6A6057]">
                Live breakdown across all analyzed products
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {GRADES_ORDER.map((grade) => {
                const count = gradeDistribution[grade];
                const meta = GRADE_META_MAP[grade];
                const pct = Math.round((count / analyses.length) * 100);
                return (
                  <div
                    key={grade}
                    style={{
                      backgroundColor: count > 0 ? meta.tintBg : '#FAF7F2',
                      borderColor: count > 0 ? meta.tintBorder : '#EFE9DF',
                    }}
                    className="rounded-[10px] border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: meta.color }}
                        className="w-7 h-7 rounded-[7px] inline-flex items-center justify-center font-display text-[13px] font-extrabold text-white shrink-0"
                      >
                        {grade}
                      </span>
                      <span className="font-data tabular-nums text-[16px] font-bold text-[#1F1A17]">
                        {count}
                      </span>
                    </div>
                    <span className="font-data tabular-nums text-[11px] font-semibold text-[#6A6057]">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Main 12-col Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Recent Product Analyses */}
          <section className="lg:col-span-8 card-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E8E1D5] flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
                  Recent Product Analyses
                </h2>
                <p className="text-[13px] text-[#6A6057]">
                  Includes Health Grade, traffic-light nutrient dots, and quick inspection links.
                </p>
              </div>
              <Link
                to="/history"
                className="text-[13px] font-semibold text-[#1D7A46] hover:text-[#155D35] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
            </div>

            {recentAnalyses.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={ScanLine}
                  title="No products scanned yet"
                  description="Upload a photo of an ingredient label to generate your first nutritional scorecard and grade."
                  action={
                    <Link to="/scan">
                      <Button variant="primary">Scan First Product</Button>
                    </Link>
                  }
                />
              </div>
            ) : (
              <div>
                {recentAnalyses.map((product) => (
                  <RecentAnalysisRow key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>

          {/* Right Rail: Quick Scan + Health Insights */}
          <div className="lg:col-span-4 space-y-6">
            <section className="card-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[17px] font-bold text-[#1F1A17]">
                    Quick Product Scan
                  </h2>
                  <p className="mt-1 text-[13px] leading-[19px] text-[#5C534A]">
                    Upload a JPG or PNG nutrition label to evaluate ingredients in seconds.
                  </p>
                </div>
                <span className="w-9 h-9 rounded-[9px] bg-[#E9F7EF] border border-[#BDE5CE] flex items-center justify-center text-[#1D7A46] shrink-0">
                  <ScanLine className="w-5 h-5" strokeWidth={1.8} />
                </span>
              </div>

              <div className="mt-4 inset-surface border border-[#EAE1D2] px-3.5 py-3 text-[12px] text-[#423A34] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[#5C534A]">Active allergies tracked</span>
                  <span className="font-data tabular-nums font-bold text-[#1F1A17]">
                    {activeAllergyCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5C534A]">Medical considerations</span>
                  <span className="font-data tabular-nums font-bold text-[#1F1A17]">
                    {activeConditionCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5C534A]">Dietary preferences</span>
                  <span className="font-data tabular-nums font-bold text-[#1F1A17]">
                    {healthProfile.dietaryPreferences.length}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Link to="/scan">
                  <Button variant="primary" fullWidth>
                    <ScanLine className="w-4 h-4" strokeWidth={2} />
                    <span>Upload Label Image</span>
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="ghost" fullWidth size="sm">
                    <HeartPulse className="w-4 h-4" strokeWidth={1.8} />
                    <span>Update Health Profile</span>
                  </Button>
                </Link>
              </div>
            </section>

            {/* Health Insights */}
            <section className="card-surface p-5">
              <h2 className="font-display text-[17px] font-bold text-[#1F1A17]">
                Health Insights
              </h2>
              <p className="mt-0.5 text-[13px] text-[#6A6057]">
                Derived live from your scanned items and profile settings.
              </p>

              {insightItems.length === 0 ? (
                <p className="mt-4 text-[13px] text-[#6A6057]">
                  Scan your first food product to populate personalized health insights here.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {insightItems.map((insight) => {
                    const bgClass =
                      insight.tone === 'danger'
                        ? 'bg-[#FDECEC] border-[#F7BEBC]'
                        : insight.tone === 'warning'
                          ? 'bg-[#FEF8E6] border-[#F6DC93]'
                          : 'bg-[#E9F7EF] border-[#BDE5CE]';

                    return (
                      <div
                        key={insight.id}
                        className={`rounded-[11px] border p-3.5 ${bgClass}`}
                      >
                        <div className="flex items-start gap-2.5">
                          {insight.tone === 'danger' ? (
                            <ShieldAlert
                              className="w-4 h-4 text-[#D43832] shrink-0 mt-0.5"
                              strokeWidth={2}
                            />
                          ) : insight.tone === 'warning' ? (
                            <AlertTriangle
                              className="w-4 h-4 text-[#E59417] shrink-0 mt-0.5"
                              strokeWidth={2}
                            />
                          ) : (
                            <CheckCircle2
                              className="w-4 h-4 text-[#1D7A46] shrink-0 mt-0.5"
                              strokeWidth={2}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold text-[#1F1A17]">
                              {insight.title}
                            </p>
                            <p className="mt-1 text-[12px] leading-[18px] text-[#423A34]">
                              {insight.detail}
                            </p>
                            <Link
                              to={insight.linkTo}
                              className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#1F1A17] hover:underline"
                            >
                              <span>{insight.linkLabel}</span>
                              <ArrowRight className="w-3 h-3" strokeWidth={2} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
