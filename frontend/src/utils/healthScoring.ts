import { HealthStatus, NutritionalInfo, ProcessingLevel } from '../types';

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'E';
export type TrafficLevel = 'low' | 'moderate' | 'high';

export interface GradeVisualMeta {
  grade: HealthGrade;
  label: string;
  subtitle: string;
  color: string;
  tintBg: string;
  tintBorder: string;
  textColor: string;
}

export interface ProcessingTierMeta {
  tier: 1 | 2 | 3 | 4;
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
  levelLabel: 'Low' | 'Moderate' | 'High';
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
export function getHealthStatusFromScore(score: number): HealthStatus {
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'Moderate';
  return 'Requires attention';
}

export function getHealthGradeFromScore(score: number): HealthGrade {
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

export function getGradeMeta(score: number): GradeVisualMeta {
  return GRADE_META_MAP[getHealthGradeFromScore(score)];
}

export function getProcessingTier(level: ProcessingLevel): ProcessingTierMeta {
  switch (level) {
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
  }
}

/**
 * Dynamic per-serving traffic-light evaluation for Total Fat, Saturated Fat, Sugars, and Sodium.
 * Works consistently across all mock and newly scanned products.
 */
export function getNutrientTrafficLights(nutrition: NutritionalInfo): NutrientTrafficItem[] {
  const buildTone = (level: TrafficLevel) => {
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
    nutrition.totalFatG >= 12 ? 'high' : nutrition.totalFatG >= 4.5 ? 'moderate' : 'low';
  const satFatLevel: TrafficLevel =
    nutrition.saturatedFatG >= 3.5 ? 'high' : nutrition.saturatedFatG >= 1.5 ? 'moderate' : 'low';
  const sugarLevel: TrafficLevel =
    nutrition.sugarG >= 15 ? 'high' : nutrition.sugarG >= 6 ? 'moderate' : 'low';
  const sodiumLevel: TrafficLevel =
    nutrition.sodiumMg >= 280 ? 'high' : nutrition.sodiumMg >= 140 ? 'moderate' : 'low';

  return [
    {
      key: 'fat',
      label: 'Total Fat',
      valueText: `${nutrition.totalFatG} g`,
      level: fatLevel,
      description:
        fatLevel === 'low'
          ? 'Fat in low quantity'
          : fatLevel === 'moderate'
            ? 'Fat in moderate quantity'
            : 'Fat in high quantity',
      ...buildTone(fatLevel),
    },
    {
      key: 'saturatedFat',
      label: 'Saturated Fat',
      valueText: `${nutrition.saturatedFatG} g`,
      level: satFatLevel,
      description:
        satFatLevel === 'low'
          ? 'Saturated fat in low quantity'
          : satFatLevel === 'moderate'
            ? 'Saturated fat in moderate quantity'
            : 'Saturated fat in high quantity',
      ...buildTone(satFatLevel),
    },
    {
      key: 'sugars',
      label: 'Sugars',
      valueText: `${nutrition.sugarG} g`,
      level: sugarLevel,
      description:
        sugarLevel === 'low'
          ? 'Sugars in low quantity'
          : sugarLevel === 'moderate'
            ? 'Sugars in moderate quantity'
            : 'Sugars in high quantity',
      ...buildTone(sugarLevel),
    },
    {
      key: 'sodium',
      label: 'Sodium / Salt',
      valueText: `${nutrition.sodiumMg} mg`,
      level: sodiumLevel,
      description:
        sodiumLevel === 'low'
          ? 'Sodium in low quantity'
          : sodiumLevel === 'moderate'
            ? 'Sodium in moderate quantity'
            : 'Sodium in high quantity',
      ...buildTone(sodiumLevel),
    },
  ];
}

export function getScoreColor(score: number): string {
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

export function calculateDailyValuePercent(value: number, reference: number): number {
  if (reference <= 0) return 0;
  return Math.round((value / reference) * 100);
}
