import { AlertCircle, AlertTriangle, CheckCircle2, Info, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HealthProfile, PersonalizedWarning } from '../../types';
import { Button } from '../common/Button';

interface PersonalizedInsightsProps {
  warnings: PersonalizedWarning[];
  profile: HealthProfile;
  profileApplied: boolean;
}

export function PersonalizedInsights({
  warnings,
  profile,
  profileApplied,
}: PersonalizedInsightsProps) {
  const hasConfiguredCriteria =
    profile.allergies.length > 0 ||
    profile.customAllergies.length > 0 ||
    profile.medicalConditions.length > 0 ||
    profile.customMedicalConditions.length > 0 ||
    profile.dietaryPreferences.length > 0 ||
    profile.healthGoals.length > 0;

  return (
    <section className="card-surface p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8E1D5]">
        <div>
          <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
            Matching With Your Health Profile
          </h2>
          <p className="text-[13px] text-[#6A6057] mt-0.5">
            Evaluated directly against your saved allergies, medical conditions, dietary
            preferences, and goals.
          </p>
        </div>
        <Link to="/profile">
          <Button variant="secondary" size="sm">
            <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.8} />
            <span>Edit Preferences</span>
          </Button>
        </Link>
      </div>

      {!profileApplied ? (
        <div className="mt-4 inset-surface border border-[#E8E1D5] p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#1D7A46] shrink-0 mt-0.5" strokeWidth={1.8} />
          <div>
            <p className="text-[14px] font-bold text-[#1F1A17]">
              General Analysis Mode Used
            </p>
            <p className="text-[13px] text-[#5C534A] mt-0.5">
              Personal health profile matching was unchecked during this scan. Re-scan with your
              health profile enabled to check for personal allergen or condition conflicts.
            </p>
          </div>
        </div>
      ) : !hasConfiguredCriteria ? (
        <div className="mt-4 inset-surface border border-[#E8E1D5] p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#1D7A46] shrink-0 mt-0.5" strokeWidth={1.8} />
          <div>
            <p className="text-[14px] font-bold text-[#1F1A17]">
              Complete Your Health Profile for Tailored Alerts
            </p>
            <p className="text-[13px] text-[#5C534A] mt-0.5">
              Add allergies, dietary preferences, or medical considerations in your Health Profile
              to surface product-specific warnings here.
            </p>
          </div>
        </div>
      ) : warnings.length === 0 ? (
        <div className="mt-4 rounded-[11px] bg-[#E9F7EF] border border-[#BDE5CE] p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#1D7A46] shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="text-[14px] font-bold text-[#135530]">
              Great Fit — No Profile Conflicts Detected
            </p>
            <p className="text-[13px] text-[#28593C] mt-0.5">
              Based on your active health profile, this product does not trigger your listed
              allergies, medical thresholds, or dietary restrictions.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {warnings.map((warning) => {
            const styles =
              warning.severity === 'high'
                ? {
                    container: 'bg-[#FDECEC] border-[#F7BEBC]',
                    title: 'text-[#9B1F1B]',
                    body: 'text-[#662624]',
                    icon: (
                      <AlertCircle
                        className="w-5 h-5 text-[#D43832] shrink-0 mt-0.5"
                        strokeWidth={2}
                      />
                    ),
                    tag: 'bg-white border-[#F7BEBC] text-[#9B1F1B]',
                  }
                : warning.severity === 'moderate'
                  ? {
                      container: 'bg-[#FEF8E6] border-[#F6DC93]',
                      title: 'text-[#8F6208]',
                      body: 'text-[#634812]',
                      icon: (
                        <AlertTriangle
                          className="w-5 h-5 text-[#E59417] shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                      ),
                      tag: 'bg-white border-[#F6DC93] text-[#8F6208]',
                    }
                  : {
                      container: 'bg-[#E9F7EF] border-[#BDE5CE]',
                      title: 'text-[#135530]',
                      body: 'text-[#28593C]',
                      icon: (
                        <Info
                          className="w-5 h-5 text-[#1D7A46] shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                      ),
                      tag: 'bg-white border-[#BDE5CE] text-[#135530]',
                    };

            return (
              <div
                key={warning.id}
                className={`rounded-[11px] border p-4 flex items-start gap-3 ${styles.container}`}
              >
                {styles.icon}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className={`text-[14px] font-bold ${styles.title}`}>
                      {warning.title}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-data text-[11px] font-semibold whitespace-nowrap ${styles.tag}`}
                    >
                      {warning.triggerLabel}
                    </span>
                  </div>
                  <p className={`mt-1 text-[13px] leading-[20px] ${styles.body}`}>
                    {warning.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
