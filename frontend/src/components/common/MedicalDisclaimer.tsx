import { Info } from 'lucide-react';

export function MedicalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`inset-surface border border-[#E8E1D5] flex items-start gap-3 ${
        compact ? 'px-4 py-2.5' : 'px-4 py-3.5'
      }`}
    >
      <Info className="w-4 h-4 text-[#1D7A46] shrink-0 mt-0.5" strokeWidth={2} />
      <p className="text-[12px] leading-[18px] text-[#5C534A]">
        <span className="font-semibold text-[#1F1A17]">Informational Prototype Notice: </span>
        NutriLens scores, A–E Health Grades, processing tiers, and traffic-light nutrient levels
        use provisional frontend demonstration thresholds and do not constitute medical advice.
        Always verify physical labels and consult a healthcare professional for allergies or
        medical conditions.
      </p>
    </div>
  );
}
