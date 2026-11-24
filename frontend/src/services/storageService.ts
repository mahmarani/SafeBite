const STORAGE_PREFIX = 'nutrilens_v1_';

export const STORAGE_KEYS = {
  SESSION: `${STORAGE_PREFIX}session`,
  USERS: `${STORAGE_PREFIX}users`,
  PROFILE: `${STORAGE_PREFIX}health_profile`,
  ANALYSES: `${STORAGE_PREFIX}analyses`,
  SAVED_IDS: `${STORAGE_PREFIX}saved_ids`,
  COMPARE_IDS: `${STORAGE_PREFIX}compare_ids`,
  PREFERENCES: `${STORAGE_PREFIX}preferences`,
} as const;

export const storageService = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage access errors in restricted environments
    }
  },

  clearAllAppData(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      this.remove(key);
    });
  },
};
