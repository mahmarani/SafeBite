import { INITIAL_MOCK_PRODUCTS } from '../data/mockProducts';
import {
  HealthProfile,
  IngredientItem,
  NutritionalInfo,
  PersonalizedWarning,
  ProcessingLevel,
  ProductAnalysis,
  ProductCategory,
  ProductScanInput,
} from '../types';
import { getHealthStatusFromScore } from '../utils/healthScoring';
import { STORAGE_KEYS, storageService } from './storageService';

interface AnalysisTemplate {
  keywords: string[];
  category: ProductCategory;
  defaultName: string;
  defaultBrand: string;
  healthScore: number;
  processingLevel: ProcessingLevel;
  summary: string;
  allergens: string[];
  nutrition: NutritionalInfo;
  ingredients: IngredientItem[];
  recommendations: string[];
}

const SCAN_TEMPLATES: AnalysisTemplate[] = [
  {
    keywords: ['oat', 'granola', 'cereal', 'muesli', 'barley', 'wheat'],
    category: 'Breakfast & Cereal',
    defaultName: 'Artisan Honey Almond Granola',
    defaultBrand: 'Verdant Harvest',
    healthScore: 76,
    processingLevel: 'Processed',
    summary:
      'Whole-grain oat and seed cluster blend with beneficial dietary fiber, balanced against moderate honey and maple sweetener content per serving.',
    allergens: ['Tree nuts', 'Gluten'],
    nutrition: {
      servingSize: '50 g (1/2 cup)',
      calories: 215,
      totalFatG: 7.5,
      saturatedFatG: 1.2,
      carbohydratesG: 31,
      fiberG: 5,
      sugarG: 9,
      addedSugarG: 7,
      proteinG: 6,
      sodiumMg: 110,
    },
    ingredients: [
      {
        name: 'Organic Whole Grain Oats',
        scientificName: 'Avena sativa',
        category: 'Beneficial',
        status: 'Safe',
        originOrFunction: 'Whole grain base · Beta-glucan fiber',
        processedLevel: 'Minimally Processed',
        allergenTags: ['Gluten'],
        dietaryConflictTags: ['Gluten-free'],
        explanation: 'Provides sustained carbohydrate energy and soluble fiber for digestive and heart health.',
      },
      {
        name: 'Sliced Roasted Almonds',
        scientificName: 'Prunus dulcis',
        category: 'Potential allergen',
        status: 'Caution',
        originOrFunction: 'Nut crunch & monounsaturated fat',
        processedLevel: 'Minimally Processed',
        allergenTags: ['Tree nuts'],
        explanation: 'Supplies vitamin E and healthy fats; contains tree nut proteins.',
      },
      {
        name: 'Raw Wildflower Honey',
        category: 'Requires attention',
        status: 'Caution',
        originOrFunction: 'Natural sweetener & cluster binder',
        processedLevel: 'Minimally Processed',
        conditionTags: ['Diabetes'],
        dietaryConflictTags: ['Vegan', 'Low sugar'],
        explanation: 'Contributes 7g added sugar per half-cup serving; not suitable for strict vegan diets.',
      },
      {
        name: 'Cold-Pressed Sunflower Oil',
        category: 'Neutral',
        status: 'Safe',
        originOrFunction: 'Toasting oil',
        processedLevel: 'Processed',
        explanation: 'Used lightly for crisp texture without hydrogenated fats.',
      },
      {
        name: 'Pumpkin Seeds & Cinnamon',
        category: 'Beneficial',
        status: 'Safe',
        originOrFunction: 'Mineral-rich botanicals',
        processedLevel: 'Minimally Processed',
        explanation: 'Adds magnesium, zinc, and antioxidant spice polyphenols.',
      },
    ],
    recommendations: [
      'Measure a 1/2-cup serving and combine with plain yogurt to moderate overall sugar per meal.',
      'Good source of whole-grain fiber with relatively low sodium.',
    ],
  },
  {
    keywords: ['milk', 'yogurt', 'cheese', 'kefir', 'oatmilk', 'almondmilk'],
    category: 'Dairy & Alternatives',
    defaultName: 'Unsweetened Barista Oat Beverage',
    defaultBrand: 'Nordic Botanicals',
    healthScore: 82,
    processingLevel: 'Minimally Processed',
    summary:
      'Plant-based oat beverage with zero added sucrose, fortified with calcium carbonate and vitamin D2. Mild natural maltose from enzymatic oat processing.',
    allergens: [],
    nutrition: {
      servingSize: '240 ml (1 cup)',
      calories: 110,
      totalFatG: 4.5,
      saturatedFatG: 0.5,
      carbohydratesG: 14,
      fiberG: 2,
      sugarG: 4,
      addedSugarG: 0,
      proteinG: 3,
      sodiumMg: 105,
    },
    ingredients: [
      {
        name: 'Filtered Water & Hydrolyzed Oat Base',
        scientificName: 'Avena sativa',
        category: 'Beneficial',
        status: 'Safe',
        originOrFunction: 'Plant milk matrix · Soluble fiber',
        processedLevel: 'Processed',
        explanation: 'Naturally dairy-free and nut-free base delivering 2g beta-glucan fiber per cup.',
      },
      {
        name: 'Cold-Pressed Rapeseed Oil',
        category: 'Neutral',
        status: 'Safe',
        originOrFunction: 'Creaminess & foaming stability',
        processedLevel: 'Processed',
        explanation: 'Low in saturated fat; provides omega-9 monounsaturated fats.',
      },
      {
        name: 'Dipotassium Phosphate',
        category: 'Neutral',
        status: 'Safe',
        originOrFunction: 'Acidity buffer for hot coffee',
        processedLevel: 'Processed',
        conditionTags: ['Kidney conditions'],
        explanation: 'Prevents curdling in acidic beverages; individuals managing kidney phosphorus limits should monitor intake.',
      },
      {
        name: 'Calcium Carbonate & Vitamin D2',
        category: 'Beneficial',
        status: 'Safe',
        originOrFunction: 'Micronutrient fortification',
        processedLevel: 'Processed',
        explanation: 'Supplies 25% DV calcium per serving to match dairy equivalents.',
      },
    ],
    recommendations: [
      'Solid dairy-free everyday beverage; pair with a protein-rich meal since oat milk is naturally lower in protein.',
      'Check for certified gluten-free oat labeling if managing celiac sensitivity.',
    ],
  },
  {
    keywords: ['soda', 'cola', 'drink', 'juice', 'tea', 'coffee', 'beverage', 'energy'],
    category: 'Beverages',
    defaultName: 'Sparkling Botanical Ginger Tonic',
    defaultBrand: 'Calyx Apothecary',
    healthScore: 68,
    processingLevel: 'Processed',
    summary:
      'Real pressed ginger and citrus botanicals without synthetic dyes or artificial sweeteners, though cane sugar content places it in the moderate tier.',
    allergens: [],
    nutrition: {
      servingSize: '330 ml (1 can)',
      calories: 90,
      totalFatG: 0,
      saturatedFatG: 0,
      carbohydratesG: 22,
      fiberG: 0,
      sugarG: 19,
      addedSugarG: 18,
      proteinG: 0,
      sodiumMg: 25,
    },
    ingredients: [
      {
        name: 'Sparkling Filtered Water',
        category: 'Neutral',
        status: 'Safe',
        originOrFunction: 'Carbonated base',
        processedLevel: 'Minimally Processed',
        explanation: 'Clean hydration base.',
      },
      {
        name: 'Organic Evaporated Cane Sugar',
        category: 'Requires attention',
        status: 'Caution',
        originOrFunction: 'Liquid sweetener',
        processedLevel: 'Processed',
        conditionTags: ['Diabetes'],
        dietaryConflictTags: ['Low sugar'],
        explanation: '18g added sugar in liquid form elevates blood glucose more rapidly than whole-food carbohydrates.',
      },
      {
        name: 'Cold-Pressed Ginger Root Extract',
        scientificName: 'Zingiber officinale',
        category: 'Beneficial',
        status: 'Safe',
        originOrFunction: 'Botanical aromatic · Gingerols',
        processedLevel: 'Minimally Processed',
        explanation: 'Contains natural anti-inflammatory gingerol compounds supporting digestive comfort.',
      },
      {
        name: 'Organic Lemon Juice Concentrate',
        scientificName: 'Citrus limon',
        category: 'Beneficial',
        status: 'Safe',
        originOrFunction: 'Natural acidulant',
        processedLevel: 'Minimally Processed',
        explanation: 'Balances sweetness naturally without phosphoric acid.',
      },
    ],
    recommendations: [
      'Enjoy over ice diluted 1:1 with plain sparkling water to cut added sugar in half.',
      'Cleaner ingredient profile than conventional sodas due to absence of synthetic colors and high-fructose corn syrup.',
    ],
  },
  {
    keywords: ['chip', 'cracker', 'cookie', 'candy', 'snack', 'bar', 'chocolate', 'biscuit'],
    category: 'Snacks & Bars',
    defaultName: 'Roasted Sea Salt Chickpea Crisps',
    defaultBrand: 'Fieldstone Kitchen',
    healthScore: 74,
    processingLevel: 'Processed',
    summary:
      'Legume-based savory snack delivering higher fiber and plant protein than traditional potato crisps, offset by moderately elevated sodium per ounce.',
    allergens: ['Soy'],
    nutrition: {
      servingSize: '30 g (~18 crisps)',
      calories: 140,
      totalFatG: 5,
      saturatedFatG: 0.7,
      carbohydratesG: 18,
      fiberG: 4,
      sugarG: 2,
      addedSugarG: 0,
      proteinG: 6,
      sodiumMg: 265,
    },
    ingredients: [
      {
        name: 'Whole Chickpea Flour',
        scientificName: 'Cicer arietinum',
        category: 'Beneficial',
        status: 'Safe',
        originOrFunction: 'Legume protein & fiber matrix',
        processedLevel: 'Minimally Processed',
        explanation: 'Naturally gluten-free legume flour offering plant protein and prebiotic resistant starch.',
      },
      {
        name: 'High-Oleic Avocado Oil',
        category: 'Beneficial',
        status: 'Safe',
        originOrFunction: 'Baking & crisp oil',
        processedLevel: 'Processed',
        explanation: 'Heat-stable monounsaturated fat profile with minimal saturated fat.',
      },
      {
        name: 'Sea Salt & Yeast Extract Seasoning',
        category: 'Requires attention',
        status: 'Caution',
        originOrFunction: 'Savory seasoning · Moderate-high sodium',
        processedLevel: 'Processed',
        conditionTags: ['High blood pressure', 'Kidney conditions'],
        dietaryConflictTags: ['Low sodium'],
        explanation: 'Brings sodium to 265 mg per serving (~12% DV); watch portion size if targeting low sodium.',
      },
      {
        name: 'Soy Lecithin (Release Agent)',
        category: 'Potential allergen',
        status: 'Caution',
        originOrFunction: 'Baking pan emulsifier',
        processedLevel: 'Processed',
        allergenTags: ['Soy'],
        explanation: 'Trace soy-derived phospholipid used during oven crisping.',
      },
    ],
    recommendations: [
      'A stronger snack choice than deep-fried potato chips thanks to 4g fiber and 6g protein.',
      'Pair with fresh cucumber slices or unsalted hummus to balance sodium density.',
    ],
  },
  {
    keywords: ['sauce', 'spread', 'jam', 'dressing', 'butter', 'dip', 'hummus', 'pesto'],
    category: 'Spreads & Condiments',
    defaultName: 'Roasted Garlic Olive Oil Hummus',
    defaultBrand: 'Solstice Mediterranean',
    healthScore: 86,
    processingLevel: 'Minimally Processed',
    summary:
      'Whole chickpeas, sesame tahini, and extra virgin olive oil form a heart-healthy, nutrient-dense spread with no artificial preservatives.',
    allergens: [],
    nutrition: {
      servingSize: '30 g (2 tbsp)',
      calories: 75,
      totalFatG: 5,
      saturatedFatG: 0.7,
      carbohydratesG: 5,
      fiberG: 2,
      sugarG: 0.5,
      addedSugarG: 0,
      proteinG: 2.5,
      sodiumMg: 125,
    },
    ingredients: [
      {
        name: 'Cooked Organic Chickpeas',
        scientificName: 'Cicer arietinum',
        category: 'Beneficial',
        status: 'Safe',
        originOrFunction: 'Whole legume base',
        processedLevel: 'Minimally Processed',
        explanation: 'Low-glycemic legume rich in folate, iron, and soluble fiber.',
      },
      {
        name: 'Extra Virgin Olive Oil',
        scientificName: 'Olea europaea',
        category: 'Beneficial',
        status: 'Safe',
        originOrFunction: 'Healthy lipid base · Polyphenols',
        processedLevel: 'Minimally Processed',
        explanation: 'Cold-extracted monounsaturated oil associated with favorable cardiovascular outcomes.',
      },
      {
        name: 'Stone-Ground Sesame Tahini',
        scientificName: 'Sesamum indicum',
        category: 'Neutral',
        status: 'Safe',
        originOrFunction: 'Creamy seed paste · Calcium source',
        processedLevel: 'Minimally Processed',
        explanation: 'Provides plant calcium and lignans; note sesame sensitivity if applicable.',
      },
      {
        name: 'Roasted Garlic, Lemon Juice & Sea Salt',
        category: 'Beneficial',
        status: 'Safe',
        originOrFunction: 'Natural aromatics & preservation',
        processedLevel: 'Minimally Processed',
        explanation: 'Natural citric acid keeps the spread fresh without potassium sorbate.',
      },
    ],
    recommendations: [
      'Excellent swap for mayonnaise or creamy dressings on sandwiches and grain bowls.',
      'Balanced sodium and zero added sugars support both heart health and glycemic stability.',
    ],
  },
];

function selectTemplateForInput(input: ProductScanInput): AnalysisTemplate {
  const searchCorpus = `${input.productName ?? ''} ${input.brand ?? ''} ${input.fileName ?? ''}`
    .toLowerCase()
    .trim();

  for (const tpl of SCAN_TEMPLATES) {
    if (tpl.keywords.some((kw) => searchCorpus.includes(kw))) {
      return tpl;
    }
  }

  if (input.category) {
    const byCat = SCAN_TEMPLATES.find((t) => t.category === input.category);
    if (byCat) return byCat;
  }

  // Deterministic pick based on filename length so different files yield varied realistic profiles
  const seed = (input.fileName?.length ?? 0) + (input.productName?.length ?? 0);
  return SCAN_TEMPLATES[seed % SCAN_TEMPLATES.length];
}

export const analysisService = {
  getAllAnalyses(): ProductAnalysis[] {
    const stored = storageService.get<ProductAnalysis[] | null>(STORAGE_KEYS.ANALYSES, null);
    if (stored === null) {
      storageService.set(STORAGE_KEYS.ANALYSES, INITIAL_MOCK_PRODUCTS);
      return INITIAL_MOCK_PRODUCTS;
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
   * Mock product analysis contract designed for future Python (FastAPI/Flask) ML + OCR backend integration.
   * Signature: analyzeProduct(imageDataUrl, productDetails, healthProfile)
   */
  analyzeProduct(
    imageDataUrl: string,
    productDetails: ProductScanInput,
    _healthProfile: HealthProfile | null
  ): ProductAnalysis {
    const template = selectTemplateForInput(productDetails);
    const cleanedName =
      productDetails.productName?.trim() ||
      (productDetails.fileName
        ? productDetails.fileName
            .replace(/\.[^/.]+$/, '')
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : template.defaultName);

    const score = template.healthScore;

    return {
      id: `scan-${Date.now()}`,
      productName: cleanedName.length > 2 ? cleanedName : template.defaultName,
      brand: productDetails.brand?.trim() || template.defaultBrand,
      category: productDetails.category || template.category,
      imageUrl: imageDataUrl,
      visualType: 'uploaded',
      analysisDate: new Date().toISOString(),
      healthScore: score,
      healthStatus: getHealthStatusFromScore(score),
      processingLevel: template.processingLevel,
      summary: template.summary,
      allergens: [...template.allergens],
      nutrition: { ...template.nutrition },
      ingredients: template.ingredients.map((item) => ({ ...item })),
      recommendations: [...template.recommendations],
      personalizedProfileApplied: productDetails.includeHealthProfile,
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
    for (const condition of allConditions) {
      const lower = condition.toLowerCase();

      if (lower.includes('high blood pressure') || lower.includes('hypertension')) {
        const hasCaffeine = allIngredientText.includes('caffeine');
        if (product.nutrition.sodiumMg >= 250 || hasCaffeine) {
          warnings.push({
            id: `warn-med-bp`,
            type: 'medical',
            severity: 'high',
            title: 'Blood Pressure Consideration',
            message: hasCaffeine
              ? `Contains high stimulant caffeine alongside ${product.nutrition.sodiumMg} mg sodium per serving, which may conflict with your blood pressure profile.`
              : `Contains ${product.nutrition.sodiumMg} mg sodium per serving, representing a notable share of a sodium-conscious daily budget.`,
            triggerLabel: condition,
          });
        }
      } else if (lower.includes('diabetes')) {
        if (product.nutrition.sugarG >= 12 || product.nutrition.addedSugarG >= 6) {
          warnings.push({
            id: 'warn-med-diabetes',
            type: 'medical',
            severity: 'high',
            title: 'Glycemic Load Caution',
            message: `Delivers ${product.nutrition.sugarG}g total sugar (${product.nutrition.addedSugarG}g added) with ${product.nutrition.fiberG}g fiber per serving, which may cause a rapid blood glucose rise.`,
            triggerLabel: condition,
          });
        }
      } else if (lower.includes('heart')) {
        if (
          product.nutrition.saturatedFatG >= 3.5 ||
          product.nutrition.sodiumMg >= 280 ||
          allIngredientText.includes('palm')
        ) {
          warnings.push({
            id: 'warn-med-heart',
            type: 'medical',
            severity: 'moderate',
            title: 'Cardiovascular Profile Alert',
            message: `Contains ${product.nutrition.saturatedFatG}g saturated fat and ${product.nutrition.sodiumMg} mg sodium per serving. Heart-health guidelines favor lower saturated fat and minimally processed fats.`,
            triggerLabel: condition,
          });
        }
      } else if (lower.includes('kidney')) {
        const hasPhosphate = allIngredientText.includes('phosphate');
        if (product.nutrition.sodiumMg >= 240 || hasPhosphate) {
          warnings.push({
            id: 'warn-med-kidney',
            type: 'medical',
            severity: 'moderate',
            title: 'Renal Nutrition Flag',
            message: hasPhosphate
              ? 'Contains phosphate-based additives and elevated sodium. Consult your renal dietitian before regular consumption.'
              : `Elevated sodium (${product.nutrition.sodiumMg} mg per serving) warrants careful portion tracking for kidney health.`,
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
      } else if (lower === 'low sugar' && product.nutrition.sugarG >= 10) {
        warnings.push({
          id: 'warn-diet-low-sugar',
          type: 'dietary',
          severity: 'moderate',
          title: 'Exceeds Low-Sugar Preference',
          message: `Contains ${product.nutrition.sugarG}g sugar per serving (${product.nutrition.addedSugarG}g added), above typical low-sugar thresholds.`,
          triggerLabel: 'Low sugar',
        });
      } else if (lower === 'low sodium' && product.nutrition.sodiumMg >= 200) {
        warnings.push({
          id: 'warn-diet-low-sodium',
          type: 'dietary',
          severity: 'moderate',
          title: 'Exceeds Low-Sodium Preference',
          message: `Contains ${product.nutrition.sodiumMg} mg sodium per serving, above the 140 mg low-sodium labeling benchmark.`,
          triggerLabel: 'Low sodium',
        });
      }
    }

    // 4. Positive alignment or gentle goal guidance (strictly tied to selected goals)
    if (profile.healthGoals.includes('Sugar reduction') && product.nutrition.addedSugarG >= 10) {
      if (!warnings.some((w) => w.id === 'warn-diet-low-sugar')) {
        warnings.push({
          id: 'warn-goal-sugar',
          type: 'goal',
          severity: 'info',
          title: 'Goal Alignment: Sugar Reduction',
          message: `With ${product.nutrition.addedSugarG}g added sugar per serving, frequent consumption may slow your sugar reduction target.`,
          triggerLabel: 'Goal: Sugar reduction',
        });
      }
    }

    if (profile.healthGoals.includes('Muscle building') && product.nutrition.proteinG >= 15) {
      warnings.push({
        id: 'warn-goal-protein',
        type: 'goal',
        severity: 'info',
        title: 'Strong Match: Muscle Building',
        message: `Delivers ${product.nutrition.proteinG}g protein per serving, supporting your muscle building goal.`,
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
    const scoreDiff = Math.abs(a.healthScore - b.healthScore);
    const higher = a.healthScore >= b.healthScore ? a : b;
    const lower = a.healthScore >= b.healthScore ? b : a;

    let headline = '';
    if (scoreDiff <= 3) {
      headline = `${a.productName} (${a.healthScore}) and ${b.productName} (${b.healthScore}) carry nearly identical overall health scores, though their macronutrient profiles differ meaningfully.`;
    } else {
      headline = `${higher.productName} leads by ${scoreDiff} points (${higher.healthScore} vs. ${lower.healthScore}), offering a cleaner overall nutritional profile than ${lower.productName}.`;
    }

    const takeaways: string[] = [];

    // Sugar comparison
    const sugarDiff = Math.abs(a.nutrition.sugarG - b.nutrition.sugarG);
    if (sugarDiff >= 3) {
      const lowerSugar = a.nutrition.sugarG < b.nutrition.sugarG ? a : b;
      const higherSugar = a.nutrition.sugarG < b.nutrition.sugarG ? b : a;
      takeaways.push(
        `Sugar: ${lowerSugar.productName} has ${sugarDiff.toFixed(1).replace(/\.0$/, '')}g less sugar per serving (${lowerSugar.nutrition.sugarG}g vs. ${higherSugar.nutrition.sugarG}g).`
      );
    }

    // Sodium comparison
    const sodiumDiff = Math.abs(a.nutrition.sodiumMg - b.nutrition.sodiumMg);
    if (sodiumDiff >= 50) {
      const lowerSodium = a.nutrition.sodiumMg < b.nutrition.sodiumMg ? a : b;
      const higherSodium = a.nutrition.sodiumMg < b.nutrition.sodiumMg ? b : a;
      takeaways.push(
        `Sodium: ${lowerSodium.productName} contains ${sodiumDiff} mg less sodium (${lowerSodium.nutrition.sodiumMg} mg vs. ${higherSodium.nutrition.sodiumMg} mg).`
      );
    }

    // Protein & Fiber comparison
    const proteinDiff = Math.abs(a.nutrition.proteinG - b.nutrition.proteinG);
    if (proteinDiff >= 3) {
      const moreProtein = a.nutrition.proteinG > b.nutrition.proteinG ? a : b;
      takeaways.push(
        `Protein: ${moreProtein.productName} delivers ${proteinDiff.toFixed(1).replace(/\.0$/, '')}g more protein per serving (${moreProtein.nutrition.proteinG}g).`
      );
    }

    const fiberDiff = Math.abs(a.nutrition.fiberG - b.nutrition.fiberG);
    if (fiberDiff >= 2) {
      const moreFiber = a.nutrition.fiberG > b.nutrition.fiberG ? a : b;
      takeaways.push(
        `Fiber: ${moreFiber.productName} provides ${fiberDiff.toFixed(1).replace(/\.0$/, '')}g more dietary fiber (${moreFiber.nutrition.fiberG}g).`
      );
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
      winnerId: scoreDiff <= 3 ? null : higher.id,
      keyTakeaways: takeaways.slice(0, 4),
    };
  },
};
