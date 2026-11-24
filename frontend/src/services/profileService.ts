import { DEFAULT_HEALTH_PROFILE, DEFAULT_USER_PREFERENCES } from '../data/defaultProfile';
import { HealthProfile, UserPreferences } from '../types';
import { STORAGE_KEYS, storageService } from './storageService';

/**
 * Health and medical information is sensitive.
 * This service intentionally avoids logging profile contents to the browser console.
 */
export const profileService = {
  getHealthProfile(fallbackName?: string): HealthProfile {
    const stored = storageService.get<HealthProfile | null>(STORAGE_KEYS.PROFILE, null);
    if (stored) return stored;

    return {
      ...DEFAULT_HEALTH_PROFILE,
      personal: {
        ...DEFAULT_HEALTH_PROFILE.personal,
        fullName: fallbackName || DEFAULT_HEALTH_PROFILE.personal.fullName,
      },
    };
  },

  saveHealthProfile(profile: HealthProfile): HealthProfile {
    const stamped: HealthProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    storageService.set(STORAGE_KEYS.PROFILE, stamped);
    return stamped;
  },

  resetHealthProfile(fullName?: string): HealthProfile {
    const fresh: HealthProfile = {
      personal: {
        fullName: fullName || '',
        age: '',
        gender: '',
        heightCm: '',
        weightKg: '',
        activityLevel: 'Moderately Active',
      },
      medicalConditions: [],
      customMedicalConditions: [],
      allergies: [],
      customAllergies: [],
      dietaryPreferences: [],
      healthGoals: [],
      updatedAt: new Date().toISOString(),
    };
    storageService.set(STORAGE_KEYS.PROFILE, fresh);
    return fresh;
  },

  getPreferences(): UserPreferences {
    return storageService.get<UserPreferences>(
      STORAGE_KEYS.PREFERENCES,
      DEFAULT_USER_PREFERENCES
    );
  },

  savePreferences(preferences: UserPreferences): UserPreferences {
    storageService.set(STORAGE_KEYS.PREFERENCES, preferences);
    return preferences;
  },
};
