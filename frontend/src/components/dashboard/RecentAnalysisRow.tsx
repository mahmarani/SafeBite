import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductAnalysis } from '../../types';
import { formatAnalysisDate } from '../../utils/healthScoring';
import { HealthGradeTile, MiniTrafficDots } from '../common/FoodScorecards';
import { ProductVisual } from '../common/ProductVisual';
import { HealthStatusBadge } from '../common/StatusBadge';

export function RecentAnalysisRow({ product }: { product: ProductAnalysis }) {
  return (
    <Link
      to={`/analysis/${product.id}`}
      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-[#EFE9DF] last:border-b-0 hover:bg-[#FAF7F2] transition-colors"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <ProductVisual
          visualType={product.visualType}
          imageUrl={product.imageUrl}
          productName={product.productName}
          size="sm"
        />
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[#1F1A17] group-hover:text-[#1D7A46] transition-colors truncate">
            {product.productName}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#6A6057] mt-0.5">
            <span className="truncate">{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span>{product.category}</span>
            <span aria-hidden="true">·</span>
            <span className="font-data tabular-nums">
              {formatAnalysisDate(product.analysisDate)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0">
        <div className="hidden md:flex items-center gap-2.5 pr-1">
          <MiniTrafficDots nutrition={product.nutrition} />
        </div>
        <div className="flex items-center gap-2">
          <HealthGradeTile score={product.healthScore} size="sm" />
          <span className="font-data tabular-nums text-[13px] font-bold text-[#1F1A17] w-11">
            {product.healthScore}/100
          </span>
        </div>
        <HealthStatusBadge status={product.healthStatus} />
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1D7A46] group-hover:text-[#155D35] whitespace-nowrap">
          <span>View</span>
          <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
        </span>
      </div>
    </Link>
  );
}
