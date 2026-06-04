// ============================================================
//  ZUSTAND GLOBAL STORE — Polla del Mundia
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  apiLogin,
  apiRegister,
  apiGetMatches,
  apiGetPredictions,
  apiSavePrediction,
  apiGetLeaderboard,
  apiUpdateMatch,
  apiAddMatch,
} from '../api/api';
import type { User, Match, Prediction, LeaderboardEntry, PredictionDraft } from '../types';

interface AppState {
  // ---- Estado ----
  user: User | null;
  matches: Match[];
  predictions: Prediction[];
  leaderboard: LeaderboardEntry[];
  drafts: Record<string, PredictionDraft>;
  isLoading: boolean;
  error: string | null;
  activeTab: 'dashboard' | 'leaderboard' | 'admin';

  // ---- Acciones de Auth ----
  login: (username: string, password: string) => Promise<boolean>;
  register: (firstName: string, lastName: string, username: string, password: string) => Promise<boolean>;
  logout: () => void;

  // ---- Acciones de Datos ----
  loadMatches: () => Promise<void>;
  loadPredictions: () => Promise<void>;
  loadLeaderboard: () => Promise<void>;
  savePrediction: (matchId: string, homeScore: number, awayScore: number) => Promise<boolean>;

  updateMatch: (params: {
    matchId: string;
    homeTeam?: string;
    awayTeam?: string;
    homeScore?: number | null;
    awayScore?: number | null;
    status?: 'upcoming' | 'live' | 'finished';
    unlock?: boolean;
    password?: string;
  }) => Promise<boolean>;
  addMatch: (
    password: string, homeTeam: string, awayTeam: string,
    matchDate: string, matchTime: string, group: string,
  ) => Promise<boolean>;

  // ---- UI ----
  setDraft: (matchId: string, homeScore: string, awayScore: string) => void;
  setActiveTab: (tab: 'dashboard' | 'leaderboard' | 'admin') => void;
  clearError: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ---- Estado Inicial ----
      user: null,
      matches: [],
      predictions: [],
      leaderboard: [],
      drafts: {},
      isLoading: false,
      error: null,
      activeTab: 'dashboard',

      // ---- Auth ----
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        const res = await apiLogin(username, password);
        if (res.success && res.data) {
          set({ user: res.data, isLoading: false });
          // Cargar datos iniciales
          get().loadMatches();
          get().loadPredictions();
          get().loadLeaderboard();
          return true;
        }
        set({ error: res.error || 'Error al iniciar sesión', isLoading: false });
        return false;
      },

      register: async (firstName, lastName, username, password) => {
        set({ isLoading: true, error: null });
        const res = await apiRegister(firstName, lastName, username, password);
        if (res.success && res.data) {
          set({ user: res.data, isLoading: false });
          get().loadMatches();
          get().loadLeaderboard();
          return true;
        }
        set({ error: res.error || 'Error al registrarse', isLoading: false });
        return false;
      },

      logout: () => {
        set({
          user: null, matches: [], predictions: [],
          leaderboard: [], drafts: {}, error: null, activeTab: 'dashboard',
        });
      },

      // ---- Datos ----
      loadMatches: async () => {
        const res = await apiGetMatches();
        if (res.success && res.data) set({ matches: res.data });
      },

      loadPredictions: async () => {
        const { user } = get();
        if (!user) return;
        const res = await apiGetPredictions(user.userId);
        if (res.success && res.data) set({ predictions: res.data });
      },

      loadLeaderboard: async () => {
        const res = await apiGetLeaderboard();
        if (res.success && res.data) set({ leaderboard: res.data });
      },

      savePrediction: async (matchId, homeScore, awayScore) => {
        const { user } = get();
        if (!user) return false;
        set({ isLoading: true, error: null });
        const res = await apiSavePrediction(user.userId, matchId, homeScore, awayScore);
        if (res.success) {
          const existingIdx = get().predictions.findIndex((p) => p.matchId === matchId);
          if (existingIdx >= 0) {
            const updated = [...get().predictions];
            updated[existingIdx] = { ...updated[existingIdx], homeScore, awayScore, points: null };
            set({ predictions: updated, isLoading: false });
          } else {
            await get().loadPredictions();
            set({ isLoading: false });
          }
          return true;
        }
        set({ error: res.error || 'Error al guardar predicción', isLoading: false });
        return false;
      },

      // ---- Admin ----
      updateMatch: async (params) => {
        set({ isLoading: true, error: null });
        const { password, ...rest } = params;
        const res = await apiUpdateMatch({ ...rest, adminPassword: password });
        if (res.success) {
          await get().loadMatches();
          get().loadLeaderboard();
          get().loadPredictions();
          return true;
        }
        set({ error: res.error || 'Error al actualizar partido', isLoading: false });
        return false;
      },

      addMatch: async (password, homeTeam, awayTeam, matchDate, matchTime, group) => {
        set({ isLoading: true, error: null });
        const res = await apiAddMatch(password, homeTeam, awayTeam, matchDate, matchTime, group);
        if (res.success && res.data) {
          set({ matches: [...get().matches, res.data], isLoading: false });
          return true;
        }
        set({ error: res.error || 'Error al crear partido', isLoading: false });
        return false;
      },

      // ---- UI ----
      setDraft: (matchId, homeScore, awayScore) => {
        set((state) => ({
          drafts: { ...state.drafts, [matchId]: { matchId, homeScore, awayScore } },
        }));
      },
      setActiveTab: (tab) => set({ activeTab: tab }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'polla-mundia-store',
      partialize: (state) => ({ user: state.user, drafts: state.drafts }),
    },
  ),
);
