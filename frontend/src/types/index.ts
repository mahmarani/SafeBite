export type HealthStatus = 'Healthy' | 'Moderate' | 'Requires attention';

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

export type ProcessingLevel = 'Minimally Processed' | 'Processed' | 'Ultra-Processed';

export interface IngredientItem {
  name: string;
  scientificName?: string;
  category: IngredientCategory;
  status: 'Safe' | 'Caution' | 'Flagged';
  originOrFunction: string;
  explanation: string;
  processedLevel?: ProcessingLevel;
  allergenTags?: string[];
  dietaryConflictTags?: string[];
  conditionTags?: string[];
}

export interface NutritionalInfo {
  servingSize: string;
  calories: number;
  totalFatG: number;
  saturatedFatG: number;
  carbohydratesG: number;
  fiberG: number;
  sugarG: number;
  addedSugarG: number;
  proteinG: number;
  sodiumMg: number;
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

export interface ProductAnalysis {
  id: string;
  productName: string;
  brand: string;
  category: ProductCategory;
  imageUrl?: string;
  visualType: ProductVisualType;
  analysisDate: string; // ISO string
  healthScore: number; // 0 - 100
  healthStatus: HealthStatus;
  summary: string;
  processingLevel: ProcessingLevel;
  ingredients: IngredientItem[];
  nutrition: NutritionalInfo;
  allergens: string[];
  recommendations: string[];
  personalizedProfileApplied: boolean;
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
