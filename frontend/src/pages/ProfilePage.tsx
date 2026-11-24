import React, { useEffect, useState } from 'react';
import { RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { Button } from '../components/common/Button';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ChipMultiSelect } from '../components/profile/ChipMultiSelect';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import {
  ACTIVITY_LEVELS,
  ALLERGY_OPTIONS,
  DIETARY_PREFERENCE_OPTIONS,
  HEALTH_GOAL_OPTIONS,
  MEDICAL_CONDITION_OPTIONS,
} from '../data/defaultProfile';
import { ActivityLevel, HealthProfile } from '../types';
import { formatAnalysisDate } from '../utils/healthScoring';
import { validateHealthProfile, ValidationErrors } from '../utils/validation';

function cloneProfile(profile: HealthProfile): HealthProfile {
  return {
    personal: { ...profile.personal },
    medicalConditions: [...profile.medicalConditions],
    customMedicalConditions: [...profile.customMedicalConditions],
    allergies: [...profile.allergies],
    customAllergies: [...profile.customAllergies],
    dietaryPreferences: [...profile.dietaryPreferences],
    healthGoals: [...profile.healthGoals],
    updatedAt: profile.updatedAt,
  };
}

export function ProfilePage() {
  const { healthProfile, updateHealthProfile } = useAppData();
  const { showToast } = useToast();

  const [draft, setDraft] = useState<HealthProfile>(() => cloneProfile(healthProfile));
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    setDraft(cloneProfile(healthProfile));
  }, [healthProfile]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(healthProfile);

  const toggleListItem = (
    field: 'medicalConditions' | 'allergies' | 'dietaryPreferences' | 'healthGoals',
    value: string
  ) => {
    setDraft((prev) => {
      const current = prev[field];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const addCustomItem = (
    field: 'customAllergies' | 'customMedicalConditions',
    standardList: readonly string[],
    value: string
  ) => {
    const cleaned = value.trim();
    if (!cleaned) return;

    setDraft((prev) => {
      const existsInCustom = prev[field].some(
        (item) => item.toLowerCase() === cleaned.toLowerCase()
      );
      const existsInStandard = standardList.some(
        (item) => item.toLowerCase() === cleaned.toLowerCase()
      );
      if (existsInCustom || existsInStandard) {
        showToast({
          type: 'info',
          title: 'Already listed',
          description: `"${cleaned}" is already available in this section.`,
        });
        return prev;
      }
      return { ...prev, [field]: [...prev[field], cleaned] };
    });
  };

  const removeCustomItem = (
    field: 'customAllergies' | 'customMedicalConditions',
    value: string
  ) => {
    setDraft((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== value),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateHealthProfile(draft);
    setErrors(validation);

    if (Object.keys(validation).length > 0) {
      showToast({
        type: 'error',
        title: 'Please check highlighted fields',
        description: 'Some personal health measurements are outside valid ranges.',
      });
      return;
    }

    updateHealthProfile(draft);
    showToast({
      type: 'success',
      title: 'Health profile saved',
      description: 'Product analyses and personalized warnings now reflect your updated profile.',
    });
  };

  const handleCancel = () => {
    setDraft(cloneProfile(healthProfile));
    setErrors({});
    showToast({
      type: 'info',
      title: 'Changes discarded',
      description: 'Restored your last saved health profile.',
    });
  };

  const bmiValue = (() => {
    const h = Number(draft.personal.heightCm);
    const w = Number(draft.personal.weightKg);
    if (!h || !w || h < 80 || w < 25) return null;
    return (w / Math.pow(h / 100, 2)).toFixed(1);
  })();

  return (
    <DashboardLayout>
      <form onSubmit={handleSave} noValidate className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] sm:text-[30px] leading-[36px] font-extrabold tracking-[-0.02em] text-[#1F1A17]">
              Health Profile
            </h1>
            <p className="mt-1 text-[14px] text-[#5C534A]">
              Configure your personal details, allergies, medical conditions, and dietary goals.
              Last saved{' '}
              <span className="font-data tabular-nums font-semibold text-[#1F1A17]">
                {formatAnalysisDate(healthProfile.updatedAt)}
              </span>
              .
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty}
              onClick={handleCancel}
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.8} />
              <span>Cancel Changes</span>
            </Button>
            <Button type="submit" variant="primary" disabled={!isDirty}>
              <Save className="w-4 h-4" strokeWidth={2} />
              <span>Save Changes</span>
            </Button>
          </div>
        </div>

        <MedicalDisclaimer />

        {/* Section 1: Personal Information */}
        <section className="card-surface p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E8E1D5]">
            <div>
              <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
                Personal Information
              </h2>
              <p className="text-[13px] text-[#6A6057] mt-0.5">
                Baseline biometric and activity details stored locally on your device.
              </p>
            </div>
            {bmiValue && (
              <div className="bg-[#E9F7EF] border border-[#BDE5CE] rounded-[10px] px-3.5 py-2 text-right">
                <div className="font-data text-[10px] font-bold uppercase tracking-[0.05em] text-[#135530]">
                  Calculated BMI
                </div>
                <div className="font-data tabular-nums text-[16px] font-bold text-[#1F1A17]">
                  {bmiValue} kg/m²
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="profile-fullname"
                className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
              >
                Full name
              </label>
              <input
                id="profile-fullname"
                type="text"
                value={draft.personal.fullName}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    personal: { ...prev.personal, fullName: e.target.value },
                  }));
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                }}
                className={`input-field h-[42px] w-full px-3.5 text-[14px] ${
                  errors.fullName ? 'input-field-error' : ''
                }`}
              />
              {errors.fullName && (
                <p className="mt-1 text-[12px] text-[#9B1F1B]">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-age"
                className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
              >
                Age (years)
              </label>
              <input
                id="profile-age"
                type="number"
                min={13}
                max={120}
                value={draft.personal.age}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    personal: { ...prev.personal, age: e.target.value },
                  }));
                  if (errors.age) setErrors((prev) => ({ ...prev, age: '' }));
                }}
                placeholder="e.g., 34"
                className={`input-field h-[42px] w-full px-3.5 text-[14px] font-data tabular-nums ${
                  errors.age ? 'input-field-error' : ''
                }`}
              />
              {errors.age && <p className="mt-1 text-[12px] text-[#9B1F1B]">{errors.age}</p>}
            </div>

            <div>
              <label
                htmlFor="profile-gender"
                className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
              >
                Gender <span className="text-[#6A6057] font-normal">(optional)</span>
              </label>
              <select
                id="profile-gender"
                value={draft.personal.gender}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    personal: { ...prev.personal, gender: e.target.value },
                  }))
                }
                className="input-field h-[42px] w-full px-3 text-[14px] bg-white"
              >
                <option value="">Prefer not to specify</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="profile-height"
                className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
              >
                Height (cm)
              </label>
              <input
                id="profile-height"
                type="number"
                min={80}
                max={260}
                value={draft.personal.heightCm}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    personal: { ...prev.personal, heightCm: e.target.value },
                  }));
                  if (errors.heightCm) setErrors((prev) => ({ ...prev, heightCm: '' }));
                }}
                placeholder="e.g., 168"
                className={`input-field h-[42px] w-full px-3.5 text-[14px] font-data tabular-nums ${
                  errors.heightCm ? 'input-field-error' : ''
                }`}
              />
              {errors.heightCm && (
                <p className="mt-1 text-[12px] text-[#9B1F1B]">{errors.heightCm}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-weight"
                className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
              >
                Weight (kg)
              </label>
              <input
                id="profile-weight"
                type="number"
                min={25}
                max={300}
                value={draft.personal.weightKg}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    personal: { ...prev.personal, weightKg: e.target.value },
                  }));
                  if (errors.weightKg) setErrors((prev) => ({ ...prev, weightKg: '' }));
                }}
                placeholder="e.g., 62"
                className={`input-field h-[42px] w-full px-3.5 text-[14px] font-data tabular-nums ${
                  errors.weightKg ? 'input-field-error' : ''
                }`}
              />
              {errors.weightKg && (
                <p className="mt-1 text-[12px] text-[#9B1F1B]">{errors.weightKg}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-activity"
                className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
              >
                Activity level
              </label>
              <select
                id="profile-activity"
                value={draft.personal.activityLevel}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    personal: {
                      ...prev.personal,
                      activityLevel: e.target.value as ActivityLevel,
                    },
                  }))
                }
                className="input-field h-[42px] w-full px-3 text-[14px] bg-white"
              >
                {ACTIVITY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section 2: Allergies */}
        <section className="card-surface p-5 sm:p-6 space-y-4">
          <div className="pb-3 border-b border-[#E8E1D5]">
            <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">Allergies</h2>
            <p className="text-[13px] text-[#6A6057] mt-0.5">
              Select known food allergies or add custom sensitivities to flag matching ingredients
              immediately on product scorecards.
            </p>
          </div>

          <ChipMultiSelect
            options={ALLERGY_OPTIONS}
            selected={draft.allergies}
            onToggle={(opt) => toggleListItem('allergies', opt)}
            customItems={draft.customAllergies}
            onAddCustom={(val) => addCustomItem('customAllergies', ALLERGY_OPTIONS, val)}
            onRemoveCustom={(val) => removeCustomItem('customAllergies', val)}
            customPlaceholder="Add custom allergy (e.g., Sesame, Sulfites)..."
            customButtonLabel="Add Allergy"
            tone="warning"
          />
        </section>

        {/* Section 3: Medical Information */}
        <section className="card-surface p-5 sm:p-6 space-y-4">
          <div className="pb-3 border-b border-[#E8E1D5]">
            <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
              Medical Information
            </h2>
            <p className="text-[13px] text-[#6A6057] mt-0.5">
              Existing conditions used to surface relevant sugar, sodium, saturated fat, or
              stimulant notes.
            </p>
          </div>

          <ChipMultiSelect
            options={MEDICAL_CONDITION_OPTIONS}
            selected={draft.medicalConditions}
            onToggle={(opt) => toggleListItem('medicalConditions', opt)}
            customItems={draft.customMedicalConditions}
            onAddCustom={(val) =>
              addCustomItem('customMedicalConditions', MEDICAL_CONDITION_OPTIONS, val)
            }
            onRemoveCustom={(val) => removeCustomItem('customMedicalConditions', val)}
            customPlaceholder="Add other condition (e.g., Celiac sensitivity)..."
            customButtonLabel="Add Condition"
            tone="warning"
          />
        </section>

        {/* Section 4 & 5: Dietary Preferences + Health Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="card-surface p-5 sm:p-6 space-y-4">
            <div className="pb-3 border-b border-[#E8E1D5]">
              <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
                Dietary Preferences
              </h2>
              <p className="text-[13px] text-[#6A6057] mt-0.5">
                Highlight ingredient mismatches with your eating pattern.
              </p>
            </div>

            <ChipMultiSelect
              options={DIETARY_PREFERENCE_OPTIONS}
              selected={draft.dietaryPreferences}
              onToggle={(opt) => toggleListItem('dietaryPreferences', opt)}
            />
          </section>

          <section className="card-surface p-5 sm:p-6 space-y-4">
            <div className="pb-3 border-b border-[#E8E1D5]">
              <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
                Health Goals
              </h2>
              <p className="text-[13px] text-[#6A6057] mt-0.5">
                Prioritize insights aligned with your long-term nutrition objectives.
              </p>
            </div>

            <ChipMultiSelect
              options={HEALTH_GOAL_OPTIONS}
              selected={draft.healthGoals}
              onToggle={(opt) => toggleListItem('healthGoals', opt)}
            />
          </section>
        </div>

        {/* Save Bar */}
        <div className="card-surface p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[13px] text-[#5C534A]">
            <ShieldCheck className="w-4 h-4 text-[#1D7A46] shrink-0" strokeWidth={2} />
            <span>
              {isDirty
                ? 'You have unsaved health profile updates.'
                : 'All health profile changes are saved locally.'}
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty}
              onClick={handleCancel}
            >
              Cancel Changes
            </Button>
            <Button type="submit" variant="primary" disabled={!isDirty}>
              <Save className="w-4 h-4" strokeWidth={2} />
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
