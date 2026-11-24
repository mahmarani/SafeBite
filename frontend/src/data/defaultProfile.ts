import { ActivityLevel, HealthProfile, ProductCategory, UserPreferences } from '../types';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Breakfast & Cereal',
  'Spreads & Condiments',
  'Snacks & Bars',
  'Beverages',
  'Dairy & Alternatives',
  'Pantry Staples',
];

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  'Sedentary',
  'Lightly Active',
  'Moderately Active',
  'Very Active',
];

export const MEDICAL_CONDITION_OPTIONS = [
  'Diabetes',
  'High blood pressure',
  'Heart conditions',
  'Kidney conditions',
] as const;

export const ALLERGY_OPTIONS = [
  'Peanuts',
  'Milk',
  'Soy',
  'Gluten',
  'Eggs',
  'Tree nuts',
  'Shellfish',
] as const;

export const DIETARY_PREFERENCE_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'Low sugar',
  'Low sodium',
] as const;

export const HEALTH_GOAL_OPTIONS = [
  'General healthy eating',
  'Weight management',
  'Muscle building',
  'Sugar reduction',
  'Heart health',
  'Balanced nutrition',
] as const;

export const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  personal: {
    fullName: 'Claire Bennett',
    age: '34',
    gender: 'Female',
    heightCm: '168',
    weightKg: '62',
    activityLevel: 'Moderately Active',
  },
  medicalConditions: ['High blood pressure'],
  customMedicalConditions: [],
  allergies: ['Peanuts', 'Tree nuts'],
  customAllergies: [],
  dietaryPreferences: ['Low sugar', 'Low sodium'],
  healthGoals: ['Heart health', 'Sugar reduction', 'Balanced nutrition'],
  updatedAt: '2026-11-15T09:30:00.000Z',
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  notifications: {
    allergenAlerts: true,
    weeklySummary: true,
    productUpdates: false,
    comparisonTips: true,
  },
  privacy: {
    applyProfileByDefault: true,
    saveScanImagesLocally: true,
    anonymizedTelemetryOptIn: false,
  },
};
