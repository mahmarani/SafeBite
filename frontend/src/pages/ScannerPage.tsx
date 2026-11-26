import React, { useState } from 'react';
import { AlertCircle, Check, HeartPulse, RefreshCw, ScanLine } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { MedicalDisclaimer } from '../components/common/MedicalDisclaimer';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ImageDropzone, UploadedImageAsset } from '../components/scanner/ImageDropzone';
import { ANALYSIS_PROGRESS_STEPS, ProcessingSteps } from '../components/scanner/ProcessingSteps';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { PRODUCT_CATEGORIES } from '../data/defaultProfile';
import { AnalyzeApiError } from '../services/analysisService';
import { ProductCategory } from '../types';

export function ScannerPage() {
  const { addScannedAnalysis, healthProfile, preferences } = useAppData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<UploadedImageAsset | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory | ''>('');
  const [includeProfile, setIncludeProfile] = useState(
    preferences.privacy.applyProfileByDefault
  );

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisError, setAnalysisError] = useState<{
    message: string;
    code?: string;
    retryable?: boolean;
  } | null>(null);

  const runAnalysis = async () => {
    if (!asset) {
      setUploadError('Please upload a JPG, JPEG, or PNG ingredient label image before analyzing.');
      return;
    }

    setUploadError(null);
    setAnalysisError(null);
    setIsAnalyzing(true);
    setCurrentStep(0);

    try {
      const created = await addScannedAnalysis(
        asset,
        {
          productName: productName.trim() || undefined,
          brand: brand.trim() || undefined,
          category: category || undefined,
          includeHealthProfile: includeProfile,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
        },
        (step) => setCurrentStep(step)
      );

      showToast({
        type: 'success',
        title: 'Analysis complete',
        description:
          created.healthScore !== null
            ? `${created.productName} scored ${created.healthScore}/100 (${created.healthStatus}).`
            : `${created.productName} analyzed (${created.healthStatus} — partial nutrition data).`,
      });

      navigate(`/analysis/${created.id}`);
    } catch (err) {
      if (err instanceof AnalyzeApiError) {
        setAnalysisError({
          message: err.message,
          code: err.code,
          retryable: err.retryable,
        });
        showToast({
          type: 'error',
          title: err.code === 'unreadable_label' ? 'Label Unreadable' : 'Analysis Failed',
          description: err.message,
        });
      } else {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred during analysis.';
        setAnalysisError({
          message,
          code: 'analysis_failed',
          retryable: true,
        });
        showToast({
          type: 'error',
          title: 'Analysis Failed',
          description: message,
        });
      }
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    void runAnalysis();
  };

  const activeProfileCriteriaCount =
    healthProfile.allergies.length +
    healthProfile.customAllergies.length +
    healthProfile.medicalConditions.length +
    healthProfile.customMedicalConditions.length +
    healthProfile.dietaryPreferences.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-[26px] sm:text-[30px] leading-[36px] font-extrabold tracking-[-0.02em] text-[#1F1A17]">
            Product Ingredient Scanner
          </h1>
          <p className="mt-1 text-[14px] text-[#5C534A]">
            Upload an image of a nutrition panel or ingredient list to generate an A–E grade,
            traffic-light nutrient summary, and personalized report.
          </p>
        </div>

        {analysisError && !isAnalyzing && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-[12px] border border-[#F7BEBC] bg-[#FDECEC] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#D43832] shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-[14px] font-bold text-[#9B1F1B]">
                  {analysisError.code === 'unreadable_label'
                    ? 'Label could not be read clearly'
                    : 'Could not complete label analysis'}
                </p>
                <p className="text-[13px] text-[#7A1D19] mt-0.5">{analysisError.message}</p>
              </div>
            </div>
            {analysisError.retryable && asset && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void runAnalysis()}
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Retry</span>
              </Button>
            )}
          </div>
        )}

        {isAnalyzing ? (
          <div className="py-6">
            <ProcessingSteps
              currentStepIndex={Math.min(currentStep, ANALYSIS_PROGRESS_STEPS.length - 1)}
              includeProfile={includeProfile}
            />
          </div>
        ) : (
          <form onSubmit={handleAnalyze} noValidate>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Image Upload Interface */}
              <div className="lg:col-span-7 card-surface p-5 sm:p-6 space-y-5">
                <div>
                  <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
                    1. Upload Product Label Image
                  </h2>
                  <p className="text-[13px] text-[#6A6057] mt-0.5">
                    Ensure the ingredient declaration is sharp and evenly lit for best readability.
                  </p>
                </div>

                <ImageDropzone
                  asset={asset}
                  error={uploadError}
                  onSelectAsset={(nextAsset) => {
                    setAsset(nextAsset);
                    setUploadError(null);
                  }}
                  onRemoveAsset={() => {
                    setAsset(null);
                    setUploadError(null);
                  }}
                  onError={(msg) => setUploadError(msg)}
                  disabled={isAnalyzing}
                />

                <div className="inset-surface border border-[#E8E1D5] p-4 text-[13px] text-[#423A34]">
                  <p className="font-bold text-[#1F1A17]">Tips for clear label scans</p>
                  <ul className="mt-1.5 space-y-1 text-[12px] text-[#5C534A] list-disc pl-4">
                    <li>Capture the complete ingredients paragraph and nutrition facts table.</li>
                    <li>Avoid harsh glare on glossy wrappers or metallic pouches.</li>
                    <li>
                      Optionally enter the product name or category on the right to tailor the
                      demonstration analysis.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Optional Product Details + Health Profile Option */}
              <div className="lg:col-span-5 space-y-6">
                <div className="card-surface p-5 sm:p-6 space-y-4">
                  <div>
                    <h2 className="font-display text-[18px] font-bold text-[#1F1A17]">
                      2. Product Details{' '}
                      <span className="text-[13px] font-normal text-[#6A6057]">(Optional)</span>
                    </h2>
                    <p className="text-[13px] text-[#6A6057] mt-0.5">
                      Provide metadata to organize this item in your history.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="scan-product-name"
                      className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
                    >
                      Product name
                    </label>
                    <input
                      id="scan-product-name"
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g., Artisan Honey Almond Granola"
                      className="input-field h-[42px] w-full px-3.5 text-[14px]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="scan-brand"
                      className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
                    >
                      Brand
                    </label>
                    <input
                      id="scan-brand"
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g., Verdant Harvest"
                      className="input-field h-[42px] w-full px-3.5 text-[14px]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="scan-category"
                      className="block text-[13px] font-semibold text-[#1F1A17] mb-1.5"
                    >
                      Product category
                    </label>
                    <select
                      id="scan-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ProductCategory | '')}
                      className="input-field h-[42px] w-full px-3 text-[14px] bg-white"
                    >
                      <option value="">Auto-detect category</option>
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-3 border-t border-[#E8E1D5]">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={includeProfile}
                        onClick={() => setIncludeProfile((prev) => !prev)}
                        className={`mt-0.5 w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          includeProfile
                            ? 'bg-[#1D7A46] border-[#1D7A46] text-white'
                            : 'bg-white border-[#D5C9B6]'
                        }`}
                      >
                        {includeProfile && <Check className="w-3 h-3" strokeWidth={2.5} />}
                      </button>
                      <div className="min-w-0">
                        <span className="block text-[14px] font-semibold text-[#1F1A17]">
                          Include my health profile for personalized analysis.
                        </span>
                        <span className="block text-[12px] text-[#6A6057] mt-0.5">
                          Currently evaluating {activeProfileCriteriaCount} active health profile
                          criteria.{' '}
                          <Link
                            to="/profile"
                            className="text-[#1D7A46] font-semibold hover:underline"
                          >
                            Review profile
                          </Link>
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" variant="primary" size="lg" fullWidth>
                      <ScanLine className="w-4 h-4" strokeWidth={2} />
                      <span>Analyze Ingredients</span>
                    </Button>
                  </div>
                </div>

                {/* Active Profile Summary Pod */}
                <div className="rounded-[14px] bg-[#E9F7EF] border border-[#BDE5CE] p-5">
                  <div className="flex items-center gap-2.5 text-[#135530]">
                    <HeartPulse className="w-4 h-4 text-[#1D7A46]" strokeWidth={2} />
                    <h3 className="font-display text-[15px] font-bold">
                      Personalization Context
                    </h3>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-[18px] text-[#28593C]">
                    {includeProfile
                      ? 'Warnings will only be surfaced when ingredients or nutritional thresholds match your saved allergies, conditions, or dietary preferences.'
                      : 'Personalized alerts are paused for this scan. Standard A–E scoring and traffic-light checks will still run.'}
                  </p>
                </div>
              </div>
            </div>
          </form>
        )}

        <MedicalDisclaimer compact />
      </div>
    </DashboardLayout>
  );
}
