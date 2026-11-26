import { HealthStatus, NutritionalInfo, ProcessingLevel } from '../types';

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'E';
export type HealthGradeOrUnknown = HealthGrade | '?';
export type TrafficLevel = 'low' | 'moderate' | 'high' | 'unknown';

export interface GradeVisualMeta {
  grade: HealthGradeOrUnknown;
  label: string;
  subtitle: string;
  color: string;
  tintBg: string;
  tintBorder: string;
  textColor: string;
}

export interface ProcessingTierMeta {
  tier: 1 | 2 | 3 | 4 | '?';
  title: string;
  subtitle: string;
  color: string;
  tintBg: string;
  tintBorder: string;
  textColor: string;
}

export interface NutrientTrafficItem {
  key: 'fat' | 'saturatedFat' | 'sugars' | 'sodium';
  label: string;
  valueText: string;
  level: TrafficLevel;
  levelLabel: 'Low' | 'Moderate' | 'High' | 'Unknown';
  description: string;
  dotColor: string;
  textColor: string;
  pillBg: string;
}

/**
 * Provisional frontend demonstration thresholds (not medically validated standards):
 * 80-100: Healthy
 * 60-79: Moderate
 * 0-59: Requires attention
 */
export function getHealthStatusFromScore(score: number | null): HealthStatus {
  if (score === null) return 'Unknown';
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'Moderate';
  return 'Requires attention';
}

export function getHealthGradeFromScore(
  score: number | null,
  explicitGrade?: HealthGrade | null
): HealthGradeOrUnknown {
  if (explicitGrade) return explicitGrade;
  if (score === null) return '?';
  if (score >= 88) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'E';
}

export const GRADE_META_MAP: Record<HealthGrade, GradeVisualMeta> = {
  A: {
    grade: 'A',
    label: 'Excellent Nutritional Quality',
    subtitle: 'Clean whole-food profile with strong nutrient density',
    color: '#1D7A46',
    tintBg: '#E9F7EF',
    tintBorder: '#BDE5CE',
    textColor: '#135530',
  },
  B: {
    grade: 'B',
    label: 'Good Nutritional Quality',
    subtitle: 'Balanced everyday choice with minimal concerns',
    color: '#5A9E2F',
    tintBg: '#F1F9E8',
    tintBorder: '#CDE7B0',
    textColor: '#3A6B1B',
  },
  C: {
    grade: 'C',
    label: 'Moderate Nutritional Quality',
    subtitle: 'Acceptable occasionally; check sugar or fat trade-offs',
    color: '#D99B16',
    tintBg: '#FEF8E6',
    tintBorder: '#F6DC93',
    textColor: '#8F6208',
  },
  D: {
    grade: 'D',
    label: 'Lower Nutritional Quality',
    subtitle: 'Elevated sodium, sugar, or refined fats per serving',
    color: '#E06520',
    tintBg: '#FEF0E7',
    tintBorder: '#F7C6A6',
    textColor: '#9E3E0B',
  },
  E: {
    grade: 'E',
    label: 'Requires Attention',
    subtitle: 'High added sugar, sodium, or ultra-processed additives',
    color: '#D43832',
    tintBg: '#FDECEC',
    tintBorder: '#F7BEBC',
    textColor: '#9B1F1B',
  },
};

export const UNKNOWN_GRADE_META: GradeVisualMeta = {
  grade: '?',
  label: 'Insufficient Nutrition Data',
  subtitle: 'Per-100g nutrition values could not be verified from this label',
  color: '#8A7F74',
  tintBg: '#F6F1E8',
  tintBorder: '#E2D8C8',
  textColor: '#5C534A',
};

export function getGradeMeta(
  score: number | null,
  explicitGrade?: HealthGrade | null
): GradeVisualMeta {
  const grade = getHealthGradeFromScore(score, explicitGrade);
  if (grade === '?') return UNKNOWN_GRADE_META;
  return GRADE_META_MAP[grade];
}

export function getProcessingTier(
  level: ProcessingLevel,
  explicitTier?: 1 | 3 | 4 | null
): ProcessingTierMeta {
  const resolvedLevel: ProcessingLevel =
    explicitTier === 1
      ? 'Minimally Processed'
      : explicitTier === 3
        ? 'Processed'
        : explicitTier === 4
          ? 'Ultra-Processed'
          : level;

  switch (resolvedLevel) {
    case 'Minimally Processed':
      return {
        tier: 1,
        title: 'Minimally processed',
        subtitle: 'Whole or gently prepared botanical & dairy staples',
        color: '#1D7A46',
        tintBg: '#E9F7EF',
        tintBorder: '#BDE5CE',
        textColor: '#135530',
      };
    case 'Processed':
      return {
        tier: 3,
        title: 'Processed food',
        subtitle: 'Combined with culinary oils, salt, or concentrated extracts',
        color: '#E06520',
        tintBg: '#FEF0E7',
        tintBorder: '#F7C6A6',
        textColor: '#9E3E0B',
      };
    case 'Ultra-Processed':
      return {
        tier: 4,
        title: 'Ultra-processed food',
        subtitle: 'Contains refined industrial formulations or synthetic additives',
        color: '#D43832',
        tintBg: '#FDECEC',
        tintBorder: '#F7BEBC',
        textColor: '#9B1F1B',
      };
    case 'Unknown':
      return {
        tier: '?',
        title: 'Processing level unknown',
        subtitle: 'Insufficient ingredient data to classify processing tier',
        color: '#8A7F74',
        tintBg: '#F6F1E8',
        tintBorder: '#E2D8C8',
        textColor: '#5C534A',
      };
  }
}

/**
 * Dynamic per-serving traffic-light evaluation for Total Fat, Saturated Fat, Sugars, and Sodium.
 * Prefers backend `nutrientLevels` when provided; treats missing (`null`) values as `unknown`.
 */
export function getNutrientTrafficLights(
  nutrition: NutritionalInfo,
  nutrientLevels?: Record<string, TrafficLevel>
): NutrientTrafficItem[] {
  const buildTone = (level: TrafficLevel) => {
    if (level === 'unknown') {
      return {
        levelLabel: 'Unknown' as const,
        dotColor: '#A89E92',
        textColor: '#5C534A',
        pillBg: '#F6F1E8',
      };
    }
    if (level === 'low') {
      return {
        levelLabel: 'Low' as const,
        dotColor: '#1F9D55',
        textColor: '#135530',
        pillBg: '#E9F7EF',
      };
    }
    if (level === 'moderate') {
      return {
        levelLabel: 'Moderate' as const,
        dotColor: '#E59417',
        textColor: '#925B06',
        pillBg: '#FEF6E4',
      };
    }
    return {
      levelLabel: 'High' as const,
      dotColor: '#DC3B35',
      textColor: '#9B1F1B',
      pillBg: '#FDECEC',
    };
  };

  const fatLevel: TrafficLevel =
    nutrientLevels?.total_fat_g ??
    (nutrition.totalFatG === null
      ? 'unknown'
      : nutrition.totalFatG >= 12
        ? 'high'
        : nutrition.totalFatG >= 4.5
          ? 'moderate'
          : 'low');
  const satFatLevel: TrafficLevel =
    nutrientLevels?.saturated_fat_g ??
    (nutrition.saturatedFatG === null
      ? 'unknown'
      : nutrition.saturatedFatG >= 3.5
        ? 'high'
        : nutrition.saturatedFatG >= 1.5
          ? 'moderate'
          : 'low');
  const sugarLevel: TrafficLevel =
    nutrientLevels?.sugars_g ??
    (nutrition.sugarG === null
      ? 'unknown'
      : nutrition.sugarG >= 15
        ? 'high'
        : nutrition.sugarG >= 6
          ? 'moderate'
          : 'low');
  const sodiumLevel: TrafficLevel =
    nutrientLevels?.sodium_mg ??
    (nutrition.sodiumMg === null
      ? 'unknown'
      : nutrition.sodiumMg >= 280
        ? 'high'
        : nutrition.sodiumMg >= 140
          ? 'moderate'
          : 'low');

  const describe = (name: string, level: TrafficLevel) => {
    if (level === 'unknown') return `${name} data not found on label`;
    return `${name} in ${level} quantity`;
  };

  return [
    {
      key: 'fat',
      label: 'Total Fat',
      valueText: nutrition.totalFatG !== null ? `${nutrition.totalFatG} g` : 'Unknown',
      level: fatLevel,
      description: describe('Fat', fatLevel),
      ...buildTone(fatLevel),
    },
    {
      key: 'saturatedFat',
      label: 'Saturated Fat',
      valueText: nutrition.saturatedFatG !== null ? `${nutrition.saturatedFatG} g` : 'Unknown',
      level: satFatLevel,
      description: describe('Saturated fat', satFatLevel),
      ...buildTone(satFatLevel),
    },
    {
      key: 'sugars',
      label: 'Sugars',
      valueText: nutrition.sugarG !== null ? `${nutrition.sugarG} g` : 'Unknown',
      level: sugarLevel,
      description: describe('Sugars', sugarLevel),
      ...buildTone(sugarLevel),
    },
    {
      key: 'sodium',
      label: 'Sodium / Salt',
      valueText: nutrition.sodiumMg !== null ? `${nutrition.sodiumMg} mg` : 'Unknown',
      level: sodiumLevel,
      description: describe('Sodium', sodiumLevel),
      ...buildTone(sodiumLevel),
    },
  ];
}

export function getScoreColor(score: number | null): string {
  return getGradeMeta(score).color;
}

export function getStatusStyles(status: HealthStatus): {
  bg: string;
  text: string;
  border: string;
  bar: string;
} {
  switch (status) {
    case 'Healthy':
      return {
        bg: '#E9F7EF',
        text: '#135530',
        border: '#BDE5CE',
        bar: '#1D7A46',
      };
    case 'Moderate':
      return {
        bg: '#FEF8E6',
        text: '#8F6208',
        border: '#F6DC93',
        bar: '#E59417',
      };
    case 'Requires attention':
      return {
        bg: '#FDECEC',
        text: '#9B1F1B',
        border: '#F7BEBC',
        bar: '#D43832',
      };
    case 'Unknown':
      return {
        bg: '#F6F1E8',
        text: '#5C534A',
        border: '#E2D8C8',
        bar: '#8A7F74',
      };
  }
}

export function formatAnalysisDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const DAILY_VALUES = {
  totalFatG: 78,
  saturatedFatG: 20,
  carbohydratesG: 275,
  fiberG: 28,
  addedSugarG: 50,
  proteinG: 50,
  sodiumMg: 2300,
} as const;

export function calculateDailyValuePercent(
  value: number | null,
  reference: number
): number | undefined {
  if (value === null || reference <= 0) return undefined;
  return Math.round((value / reference) * 100);
}
