export type HealthStatus = 'Healthy' | 'Moderate' | 'Requires attention' | 'Unknown';

export type IngredientCategory =
  | 'Beneficial'
  | 'Neutral'
  | 'Requires attention'
  | 'Potential allergen';

export type ProductCategory =
  | 'Breakfast & Cereal'
  | 'Spreads & Condiments'
  | 'Snacks & Bars'
  | 'Beverages'
  | 'Dairy & Alternatives'
  | 'Pantry Staples';

export type ProcessingLevel =
  | 'Minimally Processed'
  | 'Processed'
  | 'Ultra-Processed'
  | 'Unknown';

export interface IngredientItem {
  name: string;
  scientificName?: string | null;
  category: IngredientCategory;
  status: 'Safe' | 'Caution' | 'Flagged';
  originOrFunction: string;
  explanation: string;
  processedLevel?: ProcessingLevel | null;
  allergenTags?: string[];
  dietaryConflictTags?: string[];
  conditionTags?: string[];
  confidence?: number | null;
  sourceSection?: string | null;
  canonicalName?: string | null;
}

export interface NutritionalInfo {
  servingSize: string;
  calories: number | null;
  totalFatG: number | null;
  saturatedFatG: number | null;
  carbohydratesG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  addedSugarG: number | null;
  proteinG: number | null;
  sodiumMg: number | null;
}

export interface RiskWarningEvidence {
  rule_id: string;
  category: 'nutrient_threshold' | 'allergen' | 'additive' | 'missing_data';
  level: 'high' | 'moderate' | 'info' | 'unknown';
  source_field: string;
  nutrient?: string | null;
  value?: number | null;
  unit?: string | null;
  basis?: string | null;
  threshold?: number | null;
  confidence: number;
  evidence?: string | null;
  message: string;
}

export interface AnalysisEvidence {
  ocrText: string;
  ocrBlockCount: number;
  correctedSections: Record<string, string>;
  corrections: Array<{
    original: string;
    corrected: string;
    score: number;
    section?: string | null;
    start: number;
    end: number;
  }>;
  normalizations: Array<{
    original: string;
    canonical: string;
  }>;
  riskWarnings: RiskWarningEvidence[];
}

export interface PersonalizedWarning {
  id: string;
  type: 'allergy' | 'medical' | 'dietary' | 'goal';
  severity: 'high' | 'moderate' | 'info';
  title: string;
  message: string;
  triggerLabel: string;
}

export type ProductVisualType =
  | 'cereal'
  | 'chocolate-spread'
  | 'protein-bar'
  | 'orange-juice'
  | 'greek-yogurt'
  | 'potato-chips'
  | 'peanut-butter'
  | 'energy-drink'
  | 'uploaded'
  | 'generic';

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ProductAnalysis {
  id: string;
  productName: string;
  brand: string;
  category: ProductCategory;
  imageUrl?: string | null;
  visualType: ProductVisualType;
  analysisDate: string; // ISO string
  healthScore: number | null; // 0 - 100 or null when insufficient data
  healthGrade?: HealthGrade | null;
  healthStatus: HealthStatus;
  summary: string;
  processingLevel: ProcessingLevel;
  processingTier?: 1 | 3 | 4 | null;
  ingredients: IngredientItem[];
  nutrition: NutritionalInfo;
  allergens: string[];
  recommendations: string[];
  personalizedProfileApplied: boolean;
  isDemo?: boolean;
  scanId?: string | null;
  pipelineStatus?: 'complete' | 'partial' | null;
  extractionConfidence?: number | null;
  nutrientLevels?: Record<string, 'low' | 'moderate' | 'high' | 'unknown'>;
  evidence?: AnalysisEvidence | null;
}

export type AnalyzeErrorCode =
  | 'invalid_image'
  | 'unsupported_image'
  | 'unreadable_label'
  | 'ocr_provider_unavailable'
  | 'analysis_failed'
  | 'network_error';

export interface AnalysisErrorResponse {
  error: AnalyzeErrorCode;
  message: string;
  scan_id?: string | null;
}

export interface PipelineResultResponse {
  schema_version: string;
  scan_id: string;
  status: 'complete' | 'partial' | 'unreadable';
  stage: string;
  extraction_confidence?: number | null;
  product_analysis?: ProductAnalysis | null;
  warnings?: string[];
}

export interface ProductScanInput {
  productName?: string;
  brand?: string;
  category?: ProductCategory;
  includeHealthProfile: boolean;
  fileName?: string;
  fileSize?: number;
}

export type ActivityLevel =
  | 'Sedentary'
  | 'Lightly Active'
  | 'Moderately Active'
  | 'Very Active';

export interface HealthProfile {
  personal: {
    fullName: string;
    age: string;
    gender: string;
    heightCm: string;
    weightKg: string;
    activityLevel: ActivityLevel;
  };
  medicalConditions: string[];
  customMedicalConditions: string[];
  allergies: string[];
  customAllergies: string[];
  dietaryPreferences: string[];
  healthGoals: string[];
  updatedAt: string;
}

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface UserPreferences {
  notifications: {
    allergenAlerts: boolean;
    weeklySummary: boolean;
    productUpdates: boolean;
    comparisonTips: boolean;
  };
  privacy: {
    applyProfileByDefault: boolean;
    saveScanImagesLocally: boolean;
    anonymizedTelemetryOptIn: boolean;
  };
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
}
