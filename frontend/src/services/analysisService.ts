import { INITIAL_MOCK_PRODUCTS } from '../data/mockProducts';
import {
  AnalysisErrorResponse,
  AnalyzeErrorCode,
  HealthProfile,
  PersonalizedWarning,
  PipelineResultResponse,
  ProductAnalysis,
  ProductScanInput,
} from '../types';
import { STORAGE_KEYS, storageService } from './storageService';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://127.0.0.1:8000';

export class AnalyzeApiError extends Error {
  code: AnalyzeErrorCode;
  status: number;
  retryable: boolean;
  scanId?: string | null;

  constructor(
    message: string,
    options: {
      code: AnalyzeErrorCode;
      status: number;
      retryable: boolean;
      scanId?: string | null;
    }
  ) {
    super(message);
    this.name = 'AnalyzeApiError';
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable;
    this.scanId = options.scanId;
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export const analysisService = {
  getAllAnalyses(): ProductAnalysis[] {
    const stored = storageService.get<ProductAnalysis[] | null>(STORAGE_KEYS.ANALYSES, null);
    if (stored === null) {
      const demoSeed = INITIAL_MOCK_PRODUCTS.map((item) => ({ ...item, isDemo: true }));
      storageService.set(STORAGE_KEYS.ANALYSES, demoSeed);
      return demoSeed;
    }
    return stored;
  },

  saveAnalyses(list: ProductAnalysis[]): void {
    storageService.set(STORAGE_KEYS.ANALYSES, list);
  },

  getSavedIds(): string[] {
    return storageService.get<string[]>(STORAGE_KEYS.SAVED_IDS, [
      'prod-whole-grain-cereal',
      'prod-greek-yogurt',
    ]);
  },

  saveSavedIds(ids: string[]): void {
    storageService.set(STORAGE_KEYS.SAVED_IDS, ids);
  },

  getCompareIds(): [string, string] {
    return storageService.get<[string, string]>(STORAGE_KEYS.COMPARE_IDS, [
      'prod-whole-grain-cereal',
      'prod-chocolate-spread',
    ]);
  },

  saveCompareIds(ids: [string, string]): void {
    storageService.set(STORAGE_KEYS.COMPARE_IDS, ids);
  },

  /**
   * Submits an uploaded label image as multipart/form-data to the FastAPI `/analyze`
   * endpoint and returns the evidence-linked `ProductAnalysis`.
   */
  async analyzeProduct(
    asset: {
      file?: File;
      dataUrl: string;
      fileName: string;
      mimeType: string;
    },
    productDetails: ProductScanInput,
    options?: {
      imageUrlToStore?: string;
      onStageChange?: (stepIndex: number) => void;
    }
  ): Promise<ProductAnalysis> {
    options?.onStageChange?.(0);

    const formData = new FormData();
    if (asset.file) {
      formData.append('image', asset.file, asset.fileName || asset.file.name);
    } else {
      const blob = await dataUrlToBlob(asset.dataUrl);
      const fallbackName = asset.fileName || 'label.jpg';
      formData.append('image', blob, fallbackName);
    }

    formData.append('target_stage', 'risk');
    if (productDetails.productName?.trim()) {
      formData.append('product_name', productDetails.productName.trim());
    }
    if (productDetails.brand?.trim()) {
      formData.append('brand', productDetails.brand.trim());
    }
    if (productDetails.category) {
      formData.append('category', productDetails.category);
    }
    formData.append('include_health_profile', String(productDetails.includeHealthProfile));

    // Advance UI stage indicators while the backend OCR -> NLP -> KB pipeline executes
    const stageTimers = [
      window.setTimeout(() => options?.onStageChange?.(1), 350),
      window.setTimeout(() => options?.onStageChange?.(2), 1100),
      window.setTimeout(() => options?.onStageChange?.(3), 2000),
    ];

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });
    } catch {
      stageTimers.forEach((id) => window.clearTimeout(id));
      throw new AnalyzeApiError(
        `Unable to reach the SafeBite analysis server at ${API_BASE_URL}. Please ensure the backend API is running and try again.`,
        {
          code: 'network_error',
          status: 0,
          retryable: true,
        }
      );
    }

    stageTimers.forEach((id) => window.clearTimeout(id));

    let payload: PipelineResultResponse | AnalysisErrorResponse | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const errBody = payload as AnalysisErrorResponse | null;
      const code: AnalyzeErrorCode = errBody?.error ?? 'analysis_failed';
      const retryable = code === 'ocr_provider_unavailable' || response.status >= 500;
      const defaultMsg =
        code === 'unreadable_label'
          ? 'The uploaded label could not be read clearly. Please retake or upload a sharper, well-lit photo.'
          : code === 'ocr_provider_unavailable'
            ? 'The OCR service is temporarily unavailable. Please try again shortly.'
            : 'The uploaded image could not be analyzed. Please check the file and try again.';

      throw new AnalyzeApiError(errBody?.message || defaultMsg, {
        code,
        status: response.status,
        retryable,
        scanId: errBody?.scan_id,
      });
    }

    const pipelineResult = payload as PipelineResultResponse | null;
    if (!pipelineResult?.product_analysis) {
      throw new AnalyzeApiError(
        'The analysis server returned an incomplete response without product details.',
        {
          code: 'analysis_failed',
          status: response.status,
          retryable: true,
          scanId: pipelineResult?.scan_id,
        }
      );
    }

    options?.onStageChange?.(3);

    return {
      ...pipelineResult.product_analysis,
      imageUrl: options?.imageUrlToStore ?? '',
      isDemo: false,
      scanId: pipelineResult.scan_id,
    };
  },

  /**
   * Generates personalized warnings strictly when the user's HealthProfile actually contains
   * a matching allergy, medical condition, dietary preference, or relevant health goal.
   */
  evaluatePersonalizedWarnings(
    product: ProductAnalysis,
    profile: HealthProfile | null
  ): PersonalizedWarning[] {
    if (!profile) return [];

    const warnings: PersonalizedWarning[] = [];
    const allAllergies = [
      ...profile.allergies,
      ...profile.customAllergies,
    ].map((a) => a.trim()).filter(Boolean);

    const allConditions = [
      ...profile.medicalConditions,
      ...profile.customMedicalConditions,
    ].map((c) => c.trim()).filter(Boolean);

    const allIngredientText = product.ingredients
      .map((i) => `${i.name} ${i.scientificName ?? ''} ${i.originOrFunction}`)
      .join(' ')
      .toLowerCase();

    // 1. Allergen matches (standard + custom)
    for (const allergy of allAllergies) {
      const lower = allergy.toLowerCase();
      const matchedInProductAllergens = product.allergens.some(
        (a) => a.toLowerCase() === lower || a.toLowerCase().includes(lower)
      );
      const matchedInIngredientTags = product.ingredients.some(
        (ing) =>
          ing.allergenTags?.some((t) => t.toLowerCase() === lower) ||
          ing.name.toLowerCase().includes(lower)
      );
      const matchedInText = allIngredientText.includes(lower);

      if (matchedInProductAllergens || matchedInIngredientTags || matchedInText) {
        warnings.push({
          id: `warn-allergy-${lower}`,
          type: 'allergy',
          severity: 'high',
          title: `Allergen Conflict: ${allergy}`,
          message: `This product contains or lists ingredients associated with "${allergy}", which is flagged in your health profile.`,
          triggerLabel: `Allergy: ${allergy}`,
        });
      }
    }

    // 2. Medical condition matches
    const sodiumMg = product.nutrition.sodiumMg;
    const sugarG = product.nutrition.sugarG;
    const addedSugarG = product.nutrition.addedSugarG;
    const fiberG = product.nutrition.fiberG;
    const saturatedFatG = product.nutrition.saturatedFatG;
    const proteinG = product.nutrition.proteinG;

    for (const condition of allConditions) {
      const lower = condition.toLowerCase();

      if (lower.includes('high blood pressure') || lower.includes('hypertension')) {
        const hasCaffeine = allIngredientText.includes('caffeine');
        if ((sodiumMg !== null && sodiumMg >= 250) || hasCaffeine) {
          warnings.push({
            id: `warn-med-bp`,
            type: 'medical',
            severity: 'high',
            title: 'Blood Pressure Consideration',
            message: hasCaffeine
              ? `Contains high stimulant caffeine${sodiumMg !== null ? ` alongside ${sodiumMg} mg sodium per serving` : ''}, which may conflict with your blood pressure profile.`
              : `Contains ${sodiumMg} mg sodium per serving, representing a notable share of a sodium-conscious daily budget.`,
            triggerLabel: condition,
          });
        }
      } else if (lower.includes('diabetes')) {
        if ((sugarG !== null && sugarG >= 12) || (addedSugarG !== null && addedSugarG >= 6)) {
          warnings.push({
            id: 'warn-med-diabetes',
            type: 'medical',
            severity: 'high',
            title: 'Glycemic Load Caution',
            message: `Delivers ${sugarG ?? 'unknown'}g total sugar${addedSugarG !== null ? ` (${addedSugarG}g added)` : ''}${fiberG !== null ? ` with ${fiberG}g fiber` : ''} per serving, which may cause a rapid blood glucose rise.`,
            triggerLabel: condition,
          });
        }
      } else if (lower.includes('heart')) {
        if (
          (saturatedFatG !== null && saturatedFatG >= 3.5) ||
          (sodiumMg !== null && sodiumMg >= 280) ||
          allIngredientText.includes('palm')
        ) {
          warnings.push({
            id: 'warn-med-heart',
            type: 'medical',
            severity: 'moderate',
            title: 'Cardiovascular Profile Alert',
            message: `Contains ${saturatedFatG ?? 'unknown'}g saturated fat and ${sodiumMg ?? 'unknown'} mg sodium per serving. Heart-health guidelines favor lower saturated fat and minimally processed fats.`,
            triggerLabel: condition,
          });
        }
      } else if (lower.includes('kidney')) {
        const hasPhosphate = allIngredientText.includes('phosphate');
        if ((sodiumMg !== null && sodiumMg >= 240) || hasPhosphate) {
          warnings.push({
            id: 'warn-med-kidney',
            type: 'medical',
            severity: 'moderate',
            title: 'Renal Nutrition Flag',
            message: hasPhosphate
              ? 'Contains phosphate-based additives and elevated sodium. Consult your renal dietitian before regular consumption.'
              : `Elevated sodium (${sodiumMg} mg per serving) warrants careful portion tracking for kidney health.`,
            triggerLabel: condition,
          });
        }
      } else {
        // Custom condition tag match against ingredients
        const tagged = product.ingredients.some((i) =>
          i.conditionTags?.some((t) => t.toLowerCase().includes(lower))
        );
        if (tagged) {
          warnings.push({
            id: `warn-med-${lower}`,
            type: 'medical',
            severity: 'moderate',
            title: `Condition Note: ${condition}`,
            message: `One or more ingredients in this product may warrant review relative to "${condition}".`,
            triggerLabel: condition,
          });
        }
      }
    }

    // 3. Dietary preference checks
    for (const pref of profile.dietaryPreferences) {
      const lower = pref.toLowerCase();
      const ingredientConflict = product.ingredients.find((ing) =>
        ing.dietaryConflictTags?.some((t) => t.toLowerCase() === lower)
      );

      if (ingredientConflict) {
        warnings.push({
          id: `warn-diet-${lower}`,
          type: 'dietary',
          severity: 'moderate',
          title: `Dietary Preference Mismatch: ${pref}`,
          message: `"${ingredientConflict.name}" conflicts with your "${pref}" dietary preference.`,
          triggerLabel: pref,
        });
      } else if (lower === 'low sugar' && sugarG !== null && sugarG >= 10) {
        warnings.push({
          id: 'warn-diet-low-sugar',
          type: 'dietary',
          severity: 'moderate',
          title: 'Exceeds Low-Sugar Preference',
          message: `Contains ${sugarG}g sugar per serving${addedSugarG !== null ? ` (${addedSugarG}g added)` : ''}, above typical low-sugar thresholds.`,
          triggerLabel: 'Low sugar',
        });
      } else if (lower === 'low sodium' && sodiumMg !== null && sodiumMg >= 200) {
        warnings.push({
          id: 'warn-diet-low-sodium',
          type: 'dietary',
          severity: 'moderate',
          title: 'Exceeds Low-Sodium Preference',
          message: `Contains ${sodiumMg} mg sodium per serving, above the 140 mg low-sodium labeling benchmark.`,
          triggerLabel: 'Low sodium',
        });
      }
    }

    // 4. Positive alignment or gentle goal guidance (strictly tied to selected goals)
    if (
      profile.healthGoals.includes('Sugar reduction') &&
      addedSugarG !== null &&
      addedSugarG >= 10
    ) {
      if (!warnings.some((w) => w.id === 'warn-diet-low-sugar')) {
        warnings.push({
          id: 'warn-goal-sugar',
          type: 'goal',
          severity: 'info',
          title: 'Goal Alignment: Sugar Reduction',
          message: `With ${addedSugarG}g added sugar per serving, frequent consumption may slow your sugar reduction target.`,
          triggerLabel: 'Goal: Sugar reduction',
        });
      }
    }

    if (
      profile.healthGoals.includes('Muscle building') &&
      proteinG !== null &&
      proteinG >= 15
    ) {
      warnings.push({
        id: 'warn-goal-protein',
        type: 'goal',
        severity: 'info',
        title: 'Strong Match: Muscle Building',
        message: `Delivers ${proteinG}g protein per serving, supporting your muscle building goal.`,
        triggerLabel: 'Goal: Muscle building',
      });
    }

    return warnings;
  },

  /**
   * Dynamically synthesizes a comparison summary for any two selected products.
   */
  generateComparisonSummary(
    a: ProductAnalysis,
    b: ProductAnalysis
  ): {
    headline: string;
    winnerId: string | null;
    keyTakeaways: string[];
  } {
    let headline = '';
    let winnerId: string | null = null;

    if (a.healthScore !== null && b.healthScore !== null) {
      const scoreDiff = Math.abs(a.healthScore - b.healthScore);
      const higher = a.healthScore >= b.healthScore ? a : b;
      const lower = a.healthScore >= b.healthScore ? b : a;
      if (scoreDiff <= 3) {
        headline = `${a.productName} (${a.healthScore}) and ${b.productName} (${b.healthScore}) carry nearly identical overall health scores, though their macronutrient profiles differ meaningfully.`;
      } else {
        headline = `${higher.productName} leads by ${scoreDiff} points (${higher.healthScore} vs. ${lower.healthScore}), offering a cleaner overall nutritional profile than ${lower.productName}.`;
        winnerId = higher.id;
      }
    } else {
      headline = `Comparing ${a.productName} and ${b.productName}. One or both products have incomplete nutrition data for an overall score.`;
    }

    const takeaways: string[] = [];

    // Sugar comparison
    if (a.nutrition.sugarG !== null && b.nutrition.sugarG !== null) {
      const sugarDiff = Math.abs(a.nutrition.sugarG - b.nutrition.sugarG);
      if (sugarDiff >= 3) {
        const lowerSugar = a.nutrition.sugarG < b.nutrition.sugarG ? a : b;
        const higherSugar = a.nutrition.sugarG < b.nutrition.sugarG ? b : a;
        takeaways.push(
          `Sugar: ${lowerSugar.productName} has ${sugarDiff.toFixed(1).replace(/\.0$/, '')}g less sugar per serving (${lowerSugar.nutrition.sugarG}g vs. ${higherSugar.nutrition.sugarG}g).`
        );
      }
    }

    // Sodium comparison
    if (a.nutrition.sodiumMg !== null && b.nutrition.sodiumMg !== null) {
      const sodiumDiff = Math.abs(a.nutrition.sodiumMg - b.nutrition.sodiumMg);
      if (sodiumDiff >= 50) {
        const lowerSodium = a.nutrition.sodiumMg < b.nutrition.sodiumMg ? a : b;
        const higherSodium = a.nutrition.sodiumMg < b.nutrition.sodiumMg ? b : a;
        takeaways.push(
          `Sodium: ${lowerSodium.productName} contains ${sodiumDiff} mg less sodium (${lowerSodium.nutrition.sodiumMg} mg vs. ${higherSodium.nutrition.sodiumMg} mg).`
        );
      }
    }

    // Protein & Fiber comparison
    if (a.nutrition.proteinG !== null && b.nutrition.proteinG !== null) {
      const proteinDiff = Math.abs(a.nutrition.proteinG - b.nutrition.proteinG);
      if (proteinDiff >= 3) {
        const moreProtein = a.nutrition.proteinG > b.nutrition.proteinG ? a : b;
        takeaways.push(
          `Protein: ${moreProtein.productName} delivers ${proteinDiff.toFixed(1).replace(/\.0$/, '')}g more protein per serving (${moreProtein.nutrition.proteinG}g).`
        );
      }
    }

    if (a.nutrition.fiberG !== null && b.nutrition.fiberG !== null) {
      const fiberDiff = Math.abs(a.nutrition.fiberG - b.nutrition.fiberG);
      if (fiberDiff >= 2) {
        const moreFiber = a.nutrition.fiberG > b.nutrition.fiberG ? a : b;
        takeaways.push(
          `Fiber: ${moreFiber.productName} provides ${fiberDiff.toFixed(1).replace(/\.0$/, '')}g more dietary fiber (${moreFiber.nutrition.fiberG}g).`
        );
      }
    }

    // Ingredient concerns
    const aConcerns = a.ingredients.filter((i) => i.category === 'Requires attention').length;
    const bConcerns = b.ingredients.filter((i) => i.category === 'Requires attention').length;
    if (aConcerns !== bConcerns) {
      const cleaner = aConcerns < bConcerns ? a : b;
      const flagged = aConcerns < bConcerns ? b : a;
      takeaways.push(
        `Ingredient Quality: ${cleaner.productName} has fewer flagged ingredients (${Math.min(aConcerns, bConcerns)} vs. ${Math.max(aConcerns, bConcerns)} in ${flagged.productName}).`
      );
    }

    if (takeaways.length === 0) {
      takeaways.push(
        `Both products share closely matched macro values; review individual allergen disclosures (${a.allergens.length} vs. ${b.allergens.length}) to choose the best personal fit.`
      );
    }

    return {
      headline,
      winnerId,
      keyTakeaways: takeaways.slice(0, 4),
    };
  },
};
