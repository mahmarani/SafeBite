import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  GitCompareArrows,
  RotateCcw,
  ScanLine,
  Search,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import {
  HealthGradeTile,
  MiniTrafficDots,
  ProcessingLevelTile,
} from '../components/common/FoodScorecards';
import { Modal } from '../components/common/Modal';
import { ProductVisual } from '../components/common/ProductVisual';
import { HealthStatusBadge } from '../components/common/StatusBadge';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { PRODUCT_CATEGORIES } from '../data/defaultProfile';
import { HealthStatus, ProductAnalysis, ProductCategory } from '../types';
import { formatAnalysisDate } from '../utils/healthScoring';

type StatusFilter = 'All' | HealthStatus | 'Saved';
type SortOption = 'date-desc' | 'date-asc' | 'score-desc' | 'score-asc';

const PAGE_SIZE = 6;

export function HistoryPage() {
  const {
    analyses,
    deleteAnalysis,
    restoreSampleAnalyses,
    isSavedAnalysis,
    toggleSavedAnalysis,
    addProductToCompare,
  } = useAppData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ProductCategory>('All');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [deleteTarget, setDeleteTarget] = useState<ProductAnalysis | null>(null);

  const filteredAnalyses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = analyses.filter((item) => {
      if (query) {
        const matchesText =
          item.productName.toLowerCase().includes(query) ||
          item.brand.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query);
        if (!matchesText) return false;
      }

      if (statusFilter === 'Saved') {
        if (!isSavedAnalysis(item.id)) return false;
      } else if (statusFilter !== 'All' && item.healthStatus !== statusFilter) {
        return false;
      }

      if (categoryFilter !== 'All' && item.category !== categoryFilter) {
        return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.analysisDate).getTime() - new Date(b.analysisDate).getTime();
        case 'score-desc':
          return (b.healthScore ?? -1) - (a.healthScore ?? -1);
        case 'score-asc':
          return (a.healthScore ?? 999) - (b.healthScore ?? 999);
        case 'date-desc':
        default:
          return new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime();
      }
    });
  }, [analyses, searchQuery, statusFilter, categoryFilter, sortBy, isSavedAnalysis]);

  const visibleItems = filteredAnalyses.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAnalyses.length;

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const name = deleteTarget.productName;
    deleteAnalysis(deleteTarget.id);
    setDeleteTarget(null);
    showToast({
      type: 'info',
      title: 'Analysis deleted',
      description: `${name} was removed and dashboard statistics updated.`,
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setCategoryFilter('All');
    setSortBy('date-desc');
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] sm:text-[30px] leading-[36px] font-extrabold tracking-[-0.02em] text-[#1F1A17]">
              Analysis History
            </h1>
            <p className="mt-1 text-[14px] text-[#5C534A]">
              Search, filter, bookmark, and manage all previously evaluated food products.
            </p>
          </div>
          <Link to="/scan">
            <Button variant="primary">
              <ScanLine className="w-4 h-4" strokeWidth={2} />
              <span>Scan Product</span>
            </Button>
          </Link>
        </div>

        {/* Search & Filters Toolbar */}
        <section className="card-surface p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <Search
                className="w-4 h-4 text-[#8A7F74] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Search by product name or brand..."
                aria-label="Search analyzed products"
                className="input-field h-[42px] w-full pl-10 pr-3.5 text-[14px]"
              />
            </div>

            <div className="md:col-span-4">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value as 'All' | ProductCategory);
                  setVisibleCount(PAGE_SIZE);
                }}
                aria-label="Filter by product category"
                className="input-field h-[42px] w-full px-3 text-[14px] bg-white"
              >
                <option value="All">All categories</option>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort products"
                className="input-field h-[42px] w-full px-3 text-[14px] bg-white"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="score-desc">Highest score</option>
                <option value="score-asc">Lowest score</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label="Filter by health status"
            >
              {(['All', 'Healthy', 'Moderate', 'Requires attention', 'Saved'] as StatusFilter[]).map(
                (status) => {
                  const active = statusFilter === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setStatusFilter(status);
                        setVisibleCount(PAGE_SIZE);
                      }}
                      className={`px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#1F1A17] text-[#FAF7F2]'
                          : 'bg-[#FAF7F2] text-[#5C534A] border border-[#E8E1D5] hover:bg-[#F3EDE2] hover:text-[#1F1A17]'
                      }`}
                    >
                      {status}
                    </button>
                  );
                }
              )}
            </div>

            <span className="font-data tabular-nums text-[12px] font-medium text-[#6A6057]">
              Showing {visibleItems.length} of {filteredAnalyses.length} product
              {filteredAnalyses.length === 1 ? '' : 's'}
            </span>
          </div>
        </section>

        {/* Results List or Empty States */}
        {analyses.length === 0 ? (
          <EmptyState
            icon={ScanLine}
            title="Your analysis history is empty"
            description="Scan a food product label to begin building your ingredient library, or reload the demonstration dataset."
            action={
              <>
                <Link to="/scan">
                  <Button variant="primary">Scan a Product</Button>
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => {
                    restoreSampleAnalyses();
                    showToast({
                      type: 'success',
                      title: 'Sample products restored',
                      description: '8 demonstration product analyses are ready to explore.',
                    });
                  }}
                >
                  <RotateCcw className="w-4 h-4" strokeWidth={1.8} />
                  <span>Restore Sample Data</span>
                </Button>
              </>
            }
          />
        ) : filteredAnalyses.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching products found"
            description="Adjust your search query, status filter, or category selection to see your analyzed products."
            action={
              <Button variant="secondary" onClick={handleResetFilters}>
                Clear Filters
              </Button>
            }
          />
        ) : (
          <section className="card-surface overflow-hidden">
            {/* Desktop Table Header */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-5 py-3 bg-[#F6F1E8] border-b border-[#E8E1D5] font-data text-[11px] font-bold uppercase tracking-[0.04em] text-[#6A6057]">
              <div className="col-span-4">Product</div>
              <div className="col-span-2">Grade &amp; Tier</div>
              <div className="col-span-2">Nutrient Lights</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-[#EFE9DF]">
              {visibleItems.map((item) => {
                const saved = isSavedAnalysis(item.id);
                return (
                  <div
                    key={item.id}
                    className="px-5 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center hover:bg-[#FAF7F2]/80 transition-colors"
                  >
                    <div className="lg:col-span-4 flex items-center gap-3.5 min-w-0">
                      <ProductVisual
                        visualType={item.visualType}
                        imageUrl={item.imageUrl}
                        productName={item.productName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/analysis/${item.id}`}
                          className="text-[14px] font-bold text-[#1F1A17] hover:text-[#1D7A46] transition-colors block truncate"
                        >
                          {item.productName}
                        </Link>
                        <div className="text-[12px] text-[#6A6057] truncate mt-0.5">
                          {item.brand} · {item.category} ·{' '}
                          <span className="font-data tabular-nums">
                            {formatAnalysisDate(item.analysisDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2 flex items-center gap-2.5">
                      <HealthGradeTile score={item.healthScore} grade={item.healthGrade} size="sm" />
                      <span className="font-data tabular-nums text-[13px] font-bold text-[#1F1A17]">
                        {item.healthScore !== null ? item.healthScore : '—'}
                      </span>
                      <span className="text-[#D5C9B6]" aria-hidden="true">
                        |
                      </span>
                      <ProcessingLevelTile
                        level={item.processingLevel}
                        tier={item.processingTier}
                        size="sm"
                      />
                    </div>

                    <div className="lg:col-span-2 flex items-center gap-2">
                      <MiniTrafficDots
                        nutrition={item.nutrition}
                        nutrientLevels={item.nutrientLevels}
                      />
                      <span className="text-[11px] text-[#6A6057] hidden xl:inline">
                        Fat · Sat · Sug · Na
                      </span>
                    </div>

                    <div className="lg:col-span-2 flex items-center justify-between lg:justify-start gap-2">
                      <HealthStatusBadge status={item.healthStatus} />
                    </div>

                    <div className="lg:col-span-2 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const nowSaved = toggleSavedAnalysis(item.id);
                          showToast({
                            type: 'success',
                            title: nowSaved ? 'Saved to bookmarks' : 'Removed bookmark',
                          });
                        }}
                        aria-label={saved ? 'Remove bookmark' : 'Save analysis'}
                        title={saved ? 'Saved' : 'Save analysis'}
                        className={`p-2 rounded-[8px] border transition-colors cursor-pointer ${
                          saved
                            ? 'bg-[#E9F7EF] border-[#BDE5CE] text-[#1D7A46]'
                            : 'bg-white border-[#E8E1D5] text-[#6A6057] hover:text-[#1F1A17] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        {saved ? (
                          <BookmarkCheck className="w-4 h-4" strokeWidth={2} />
                        ) : (
                          <Bookmark className="w-4 h-4" strokeWidth={1.6} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          addProductToCompare(item.id);
                          navigate('/compare');
                        }}
                        aria-label={`Compare ${item.productName}`}
                        title="Compare product"
                        className="p-2 rounded-[8px] border border-[#E8E1D5] bg-white text-[#6A6057] hover:text-[#1F1A17] hover:bg-[#F3EDE2] transition-colors cursor-pointer"
                      >
                        <GitCompareArrows className="w-4 h-4" strokeWidth={1.6} />
                      </button>

                      <Link
                        to={`/analysis/${item.id}`}
                        aria-label={`View ${item.productName} details`}
                        title="View details"
                        className="p-2 rounded-[8px] border border-[#BDE5CE] bg-[#E9F7EF] text-[#1D7A46] hover:bg-[#D7F0E1] transition-colors"
                      >
                        <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        aria-label={`Delete ${item.productName}`}
                        title="Delete analysis"
                        className="p-2 rounded-[8px] border border-[#E8E1D5] bg-white text-[#6A6057] hover:text-[#9B1F1B] hover:bg-[#FDECEC] hover:border-[#F7BEBC] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.6} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="p-4 border-t border-[#E8E1D5] bg-[#FAF7F2] text-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                >
                  Load More ({filteredAnalyses.length - visibleItems.length} remaining)
                </Button>
              </div>
            )}
          </section>
        )}
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete product analysis?"
        description={
          deleteTarget
            ? `Are you sure you want to remove "${deleteTarget.productName}" from your analysis history? Dashboard metrics will update immediately.`
            : undefined
        }
        confirmLabel="Delete Analysis"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </DashboardLayout>
  );
}
