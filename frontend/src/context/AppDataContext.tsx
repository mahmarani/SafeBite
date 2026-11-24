import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { INITIAL_MOCK_PRODUCTS } from '../data/mockProducts';
import { analysisService } from '../services/analysisService';
import { profileService } from '../services/profileService';
import {
  HealthProfile,
  ProductAnalysis,
  ProductScanInput,
  UserPreferences,
} from '../types';
import { useAuth } from './AuthContext';

interface DashboardStats {
  totalScanned: number;
  healthyCount: number;
  moderateCount: number;
  requiresAttentionCount: number;
  averageScore: number;
  savedCount: number;
}

interface AppDataContextValue {
  analyses: ProductAnalysis[];
  savedIds: string[];
  compareIds: [string, string];
  healthProfile: HealthProfile;
  preferences: UserPreferences;
  stats: DashboardStats;
  getAnalysisById: (id: string) => ProductAnalysis | undefined;
  addScannedAnalysis: (imageDataUrl: string, input: ProductScanInput) => ProductAnalysis;
  deleteAnalysis: (id: string) => void;
  clearAllAnalyses: () => void;
  restoreSampleAnalyses: () => void;
  toggleSavedAnalysis: (id: string) => boolean;
  isSavedAnalysis: (id: string) => boolean;
  setCompareSelection: (ids: [string, string]) => void;
  addProductToCompare: (id: string) => void;
  updateHealthProfile: (next: HealthProfile) => HealthProfile;
  resetHealthProfile: () => HealthProfile;
  updatePreferences: (next: UserPreferences) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [analyses, setAnalyses] = useState<ProductAnalysis[]>(() =>
    analysisService.getAllAnalyses()
  );
  const [savedIds, setSavedIds] = useState<string[]>(() => analysisService.getSavedIds());
  const [compareIds, setCompareIds] = useState<[string, string]>(() =>
    analysisService.getCompareIds()
  );
  const [healthProfile, setHealthProfile] = useState<HealthProfile>(() =>
    profileService.getHealthProfile(user?.fullName)
  );
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    profileService.getPreferences()
  );

  // Keep health profile personal name gently synced if user signs up with a new account and profile has default empty name
  useEffect(() => {
    if (user?.fullName && !healthProfile.personal.fullName) {
      const updated = profileService.saveHealthProfile({
        ...healthProfile,
        personal: { ...healthProfile.personal, fullName: user.fullName },
      });
      setHealthProfile(updated);
    }
  }, [user?.fullName, healthProfile]);

  const stats = useMemo<DashboardStats>(() => {
    const totalScanned = analyses.length;
    const healthyCount = analyses.filter((a) => a.healthStatus === 'Healthy').length;
    const moderateCount = analyses.filter((a) => a.healthStatus === 'Moderate').length;
    const requiresAttentionCount = analyses.filter(
      (a) => a.healthStatus === 'Requires attention'
    ).length;
    const averageScore =
      totalScanned > 0
        ? Math.round(analyses.reduce((sum, item) => sum + item.healthScore, 0) / totalScanned)
        : 0;
    const validSaved = savedIds.filter((id) => analyses.some((a) => a.id === id)).length;

    return {
      totalScanned,
      healthyCount,
      moderateCount,
      requiresAttentionCount,
      averageScore,
      savedCount: validSaved,
    };
  }, [analyses, savedIds]);

  const getAnalysisById = useCallback(
    (id: string) => analyses.find((item) => item.id === id),
    [analyses]
  );

  const addScannedAnalysis = useCallback(
    (imageDataUrl: string, input: ProductScanInput) => {
      const imageToStore = preferences.privacy.saveScanImagesLocally ? imageDataUrl : '';
      const result = analysisService.analyzeProduct(
        imageToStore,
        input,
        input.includeHealthProfile ? healthProfile : null
      );
      setAnalyses((prev) => {
        const next = [result, ...prev];
        analysisService.saveAnalyses(next);
        return next;
      });
      return result;
    },
    [healthProfile, preferences.privacy.saveScanImagesLocally]
  );

  const deleteAnalysis = useCallback((id: string) => {
    setAnalyses((prev) => {
      const next = prev.filter((item) => item.id !== id);
      analysisService.saveAnalyses(next);
      return next;
    });
    setSavedIds((prev) => {
      const next = prev.filter((savedId) => savedId !== id);
      analysisService.saveSavedIds(next);
      return next;
    });
  }, []);

  const clearAllAnalyses = useCallback(() => {
    setAnalyses([]);
    analysisService.saveAnalyses([]);
    setSavedIds([]);
    analysisService.saveSavedIds([]);
  }, []);

  const restoreSampleAnalyses = useCallback(() => {
    setAnalyses(INITIAL_MOCK_PRODUCTS);
    analysisService.saveAnalyses(INITIAL_MOCK_PRODUCTS);
    const defaultSaved = ['prod-whole-grain-cereal', 'prod-greek-yogurt'];
    setSavedIds(defaultSaved);
    analysisService.saveSavedIds(defaultSaved);
  }, []);

  const toggleSavedAnalysis = useCallback((id: string) => {
    let nowSaved = false;
    setSavedIds((prev) => {
      const exists = prev.includes(id);
      nowSaved = !exists;
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      analysisService.saveSavedIds(next);
      return next;
    });
    return nowSaved;
  }, []);

  const isSavedAnalysis = useCallback(
    (id: string) => savedIds.includes(id),
    [savedIds]
  );

  const setCompareSelection = useCallback((ids: [string, string]) => {
    setCompareIds(ids);
    analysisService.saveCompareIds(ids);
  }, []);

  const addProductToCompare = useCallback(
    (id: string) => {
      setCompareIds((prev) => {
        const [first, second] = prev;
        if (first === id || second === id) return prev;
        const fallbackSecond =
          analyses.find((a) => a.id !== id && a.id === first)?.id ||
          analyses.find((a) => a.id !== id)?.id ||
          '';
        const next: [string, string] = [id, fallbackSecond];
        analysisService.saveCompareIds(next);
        return next;
      });
    },
    [analyses]
  );

  const updateHealthProfile = useCallback((next: HealthProfile) => {
    const saved = profileService.saveHealthProfile(next);
    setHealthProfile(saved);
    return saved;
  }, []);

  const resetHealthProfile = useCallback(() => {
    const fresh = profileService.resetHealthProfile(user?.fullName);
    setHealthProfile(fresh);
    return fresh;
  }, [user?.fullName]);

  const updatePreferences = useCallback((next: UserPreferences) => {
    const saved = profileService.savePreferences(next);
    setPreferences(saved);
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        analyses,
        savedIds,
        compareIds,
        healthProfile,
        preferences,
        stats,
        getAnalysisById,
        addScannedAnalysis,
        deleteAnalysis,
        clearAllAnalyses,
        restoreSampleAnalyses,
        toggleSavedAnalysis,
        isSavedAnalysis,
        setCompareSelection,
        addProductToCompare,
        updateHealthProfile,
        resetHealthProfile,
        updatePreferences,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
