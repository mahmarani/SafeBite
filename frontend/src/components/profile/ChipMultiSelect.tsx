import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Button } from '../common/Button';

interface ChipMultiSelectProps {
  options: readonly string[];
  selected: string[];
  onToggle: (option: string) => void;
  customItems?: string[];
  onAddCustom?: (value: string) => void;
  onRemoveCustom?: (value: string) => void;
  customPlaceholder?: string;
  customButtonLabel?: string;
  tone?: 'default' | 'warning';
}

export function ChipMultiSelect({
  options,
  selected,
  onToggle,
  customItems,
  onAddCustom,
  onRemoveCustom,
  customPlaceholder = 'Add custom item...',
  customButtonLabel = 'Add',
  tone = 'default',
}: ChipMultiSelectProps) {
  const [draft, setDraft] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draft.trim();
    if (!cleaned || !onAddCustom) return;
    onAddCustom(cleaned);
    setDraft('');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          const selectedClasses =
            tone === 'warning'
              ? 'bg-[#FEF4E4] border-[#E59417] text-[#8F5906]'
              : 'bg-[#E9F7EF] border-[#1D7A46] text-[#135530]';

          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              aria-pressed={isSelected}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-[13px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                isSelected
                  ? selectedClasses
                  : 'bg-white border-[#E8E1D5] text-[#423A34] hover:bg-[#FAF7F2] hover:border-[#C5B9A6]'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-[4px] flex items-center justify-center border ${
                  isSelected
                    ? tone === 'warning'
                      ? 'bg-[#E59417] border-[#E59417] text-white'
                      : 'bg-[#1D7A46] border-[#1D7A46] text-white'
                    : 'border-[#D5C9B6] bg-white'
                }`}
              >
                {isSelected && <Check className="w-3 h-3" strokeWidth={2.5} />}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {customItems && customItems.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {customItems.map((item) => (
            <span
              key={item}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold border ${
                tone === 'warning'
                  ? 'bg-[#FEF4E4] border-[#F4CA85] text-[#8F5906]'
                  : 'bg-[#E9F7EF] border-[#BDE5CE] text-[#135530]'
              }`}
            >
              <span>{item}</span>
              {onRemoveCustom && (
                <button
                  type="button"
                  onClick={() => onRemoveCustom(item)}
                  aria-label={`Remove ${item}`}
                  className="p-0.5 rounded-full hover:bg-black/5 cursor-pointer"
                >
                  <X className="w-3 h-3" strokeWidth={2} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {onAddCustom && (
        <div className="flex flex-col sm:flex-row gap-2 max-w-md pt-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd(e);
              }
            }}
            placeholder={customPlaceholder}
            className="input-field h-[40px] px-3 text-[13px] flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAdd}
            disabled={!draft.trim()}
            className="h-[40px]"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>{customButtonLabel}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
