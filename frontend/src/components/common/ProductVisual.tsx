import { useState } from 'react';
import { Package } from 'lucide-react';
import { ProductVisualType } from '../../types';

interface ProductVisualProps {
  visualType: ProductVisualType;
  imageUrl?: string | null;
  productName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-11 h-11 rounded-[9px]',
  md: 'w-16 h-16 rounded-[11px]',
  lg: 'w-full aspect-[4/3] rounded-[12px]',
};

function FoodPackagingArtwork({ type }: { type: ProductVisualType }) {
  switch (type) {
    case 'cereal':
      return (
        <svg viewBox="0 0 160 120" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="120" fill="#FFF5E1" />
          <circle cx="132" cy="24" r="34" fill="#FDE6B5" />
          <rect x="42" y="14" width="76" height="92" rx="10" fill="#FFFFFF" stroke="#E2D3B8" strokeWidth="1.5" />
          <rect x="42" y="14" width="76" height="28" rx="10" fill="#1D7A46" />
          <rect x="42" y="34" width="76" height="8" fill="#1D7A46" />
          <circle cx="80" cy="70" r="21" fill="#FFF5E1" stroke="#E59417" strokeWidth="1.8" />
          <path d="M80 54 C73 63, 73 76, 80 84 C87 76, 87 63, 80 54 Z" fill="#E59417" />
          <path d="M70 62 C74 66, 76 69, 80 72 M90 62 C86 66, 84 69, 80 72" stroke="#1D7A46" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <line x1="58" y1="96" x2="102" y2="96" stroke="#D9C7A7" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'greek-yogurt':
      return (
        <svg viewBox="0 0 160 120" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="120" fill="#EAF5FC" />
          <circle cx="30" cy="96" r="34" fill="#D5EBFA" />
          <path d="M44 38 L116 38 L108 98 C107 103, 103 105, 98 105 L62 105 C57 105, 53 103, 52 98 Z" fill="#FFFFFF" stroke="#C3DDF0" strokeWidth="1.5" />
          <rect x="38" y="28" width="84" height="12" rx="4" fill="#1C5D99" />
          <rect x="52" y="52" width="56" height="28" rx="6" fill="#EAF5FC" />
          <circle cx="80" cy="66" r="8" fill="#1D7A46" />
          <circle cx="80" cy="66" r="3.5" fill="#FFFFFF" />
          <line x1="62" y1="91" x2="98" y2="91" stroke="#9EC4E2" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'peanut-butter':
      return (
        <svg viewBox="0 0 160 120" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="120" fill="#FDF2DF" />
          <rect x="48" y="34" width="64" height="70" rx="14" fill="#C97B2B" stroke="#9A5918" strokeWidth="1.5" />
          <rect x="54" y="18" width="52" height="16" rx="5" fill="#1F1A17" />
          <rect x="52" y="52" width="56" height="34" rx="5" fill="#FFFDF8" />
          <ellipse cx="74" cy="69" rx="8" ry="5.5" fill="#E59417" />
          <ellipse cx="86" cy="69" rx="8" ry="5.5" fill="#C97B2B" />
        </svg>
      );
    case 'protein-bar':
      return (
        <svg viewBox="0 0 160 120" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="120" fill="#F4EDE4" />
          <path d="M20 44 L32 49 L32 71 L20 76 Z" fill="#3B281E" />
          <path d="M140 44 L128 49 L128 71 L140 76 Z" fill="#3B281E" />
          <rect x="32" y="40" width="96" height="40" rx="7" fill="#FFFFFF" stroke="#D9CBB8" strokeWidth="1.5" />
          <rect x="32" y="40" width="32" height="40" rx="7" fill="#3B281E" />
          <rect x="56" y="40" width="8" height="40" fill="#3B281E" />
          <circle cx="48" cy="60" r="7" fill="#E59417" />
          <line x1="74" y1="54" x2="116" y2="54" stroke="#1F1A17" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="74" y1="66" x2="102" y2="66" stroke="#1D7A46" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'orange-juice':
      return (
        <svg viewBox="0 0 160 120" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="120" fill="#FFF3DC" />
          <circle cx="128" cy="92" r="30" fill="#FDE0A6" />
          <path d="M62 24 L98 24 L106 42 L106 100 C106 104, 103 107, 99 107 L61 107 C57 107, 54 104, 54 100 L54 42 Z" fill="#FFFFFF" stroke="#EBC482" strokeWidth="1.5" />
          <rect x="68" y="14" width="24" height="10" rx="3" fill="#1D7A46" />
          <rect x="55" y="54" width="50" height="46" rx="4" fill="#FFA726" fillOpacity="0.28" />
          <circle cx="80" cy="77" r="14" fill="#F57C00" />
          <path d="M80 63 L80 91 M66 77 L94 77" stroke="#FFF3DC" strokeWidth="1.6" />
        </svg>
      );
    case 'chocolate-spread':
      return (
        <svg viewBox="0 0 160 120" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="120" fill="#FCEEEB" />
          <rect x="46" y="34" width="68" height="70" rx="16" fill="#4A2C22" stroke="#331D16" strokeWidth="1.5" />
          <rect x="54" y="18" width="52" height="16" rx="4" fill="#FFFFFF" stroke="#E8E1D5" strokeWidth="1.5" />
          <rect x="50" y="52" width="60" height="34" rx="5" fill="#FFFFFF" />
          <circle cx="80" cy="69" r="10" fill="#FDECEC" />
          <circle cx="80" cy="69" r="5.5" fill="#D43832" />
        </svg>
      );
    case 'potato-chips':
      return (
        <svg viewBox="0 0 160 120" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="120" fill="#FEF4E4" />
          <path d="M46 20 L114 20 L118 100 L42 100 Z" fill="#FFFDF8" stroke="#E5CFA8" strokeWidth="1.5" />
          <rect x="44" y="20" width="72" height="12" fill="#E06520" />
          <rect x="42" y="88" width="76" height="12" fill="#E06520" />
          <ellipse cx="80" cy="60" rx="20" ry="13" fill="#FCD34D" stroke="#D97706" strokeWidth="1.8" />
          <ellipse cx="80" cy="60" rx="10" ry="5.5" fill="#F59E0B" fillOpacity="0.45" />
        </svg>
      );
    case 'energy-drink':
      return (
        <svg viewBox="0 0 160 120" className="w-full h-full" aria-hidden="true">
          <rect width="160" height="120" fill="#FDECEC" />
          <rect x="56" y="20" width="48" height="84" rx="9" fill="#FFFFFF" stroke="#F4B8B5" strokeWidth="1.5" />
          <rect x="64" y="15" width="32" height="5" rx="2" fill="#6A6057" />
          <rect x="56" y="34" width="48" height="54" fill="#1F1A17" />
          <path d="M84 44 L71 63 L80 63 L76 78 L90 58 L81 58 Z" fill="#F97316" />
        </svg>
      );
    default:
      return (
        <div className="w-full h-full bg-[#F3EDE2] flex flex-col items-center justify-center text-[#1D7A46]">
          <Package className="w-6 h-6" strokeWidth={1.6} />
        </div>
      );
  }
}

export function ProductVisual({
  visualType,
  imageUrl,
  productName,
  size = 'md',
  className = '',
}: ProductVisualProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={`overflow-hidden border border-[#E8E1D5] bg-[#F6F1E8] shrink-0 flex items-center justify-center ${SIZE_CLASSES[size]} ${className}`}
    >
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={productName}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <FoodPackagingArtwork type={visualType} />
      )}
    </div>
  );
}
