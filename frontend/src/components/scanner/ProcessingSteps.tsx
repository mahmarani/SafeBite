import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

export const ANALYSIS_PROGRESS_STEPS = [
  {
    title: 'Image uploaded',
    detail: 'Verifying label resolution and frame orientation',
  },
  {
    title: 'Extracting ingredients',
    detail: 'Parsing ingredient list order and compound names',
  },
  {
    title: 'Evaluating nutritional information',
    detail: 'Calculating serving density, sugar, sodium, and traffic-light levels',
  },
  {
    title: 'Generating health assessment',
    detail: 'Computing A–E Health Grade, processing tier, and profile alerts',
  },
];

interface ProcessingStepsProps {
  currentStepIndex: number;
  includeProfile: boolean;
}

export function ProcessingSteps({ currentStepIndex, includeProfile }: ProcessingStepsProps) {
  const progressPercent = Math.min(
    100,
    Math.round(((currentStepIndex + 1) / ANALYSIS_PROGRESS_STEPS.length) * 100)
  );

  return (
    <div className="card-surface p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-[20px] font-bold text-[#1F1A17]">
            Analyzing Product Label
          </h2>
          <p className="mt-1 text-[14px] text-[#5C534A]">
            {includeProfile
              ? 'Cross-referencing ingredients with your saved health profile.'
              : 'Evaluating general nutritional profile and ingredient composition.'}
          </p>
        </div>
        <span className="font-data tabular-nums text-[16px] font-bold text-[#1D7A46] shrink-0">
          {progressPercent}%
        </span>
      </div>

      <div className="mt-5 h-2.5 rounded-full bg-[#F3EDE2] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#1D7A46] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ol className="mt-6 space-y-3">
        {ANALYSIS_PROGRESS_STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex;

          return (
            <li
              key={step.title}
              className={`flex items-start gap-3.5 p-3.5 rounded-[10px] border transition-colors ${
                isActive
                  ? 'bg-[#E9F7EF] border-[#BDE5CE]'
                  : isCompleted
                    ? 'bg-white border-[#E8E1D5]'
                    : 'bg-[#FAF7F2] border-transparent opacity-70'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-[#1D7A46]" strokeWidth={2} />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 text-[#1D7A46] animate-spin" strokeWidth={2} />
                ) : (
                  <Circle className="w-5 h-5 text-[#C5B9A6]" strokeWidth={1.6} />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-[14px] font-semibold ${
                    isActive || isCompleted ? 'text-[#1F1A17]' : 'text-[#6A6057]'
                  }`}
                >
                  {index + 1}. {step.title}
                </p>
                <p className="text-[13px] text-[#5C534A] mt-0.5">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
