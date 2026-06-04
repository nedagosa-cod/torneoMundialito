// ============================================================
//  API CLIENT — Polla del Mundia
//  Todas las funciones de comunicación con Google Apps Script
// ============================================================

import type { ApiResponse, LeaderboardEntry, Match, Prediction, User } from '../types';

// URL de tu GAS Web App
const GAS_URL =
  'https://script.google.com/macros/s/AKfycbzuSeFPbde7ciFXnvj_N1PRPKV2cK-H4MaObb3jKmFeB70OOfTMGP6GIjQDY_KLAps/exec';

// ============================================================
//  HELPERS INTERNOS
// ============================================================

async function gasGet<T>(action: string, params: Record<string, string> = {}): Promise<ApiResponse<T>> {
  const searchParams = new URLSearchParams({ action, ...params });
  const url = `${GAS_URL}?${searchParams.toString()}`;
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as ApiResponse<T>;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error de red' };
  }
}

async function gasPost<T>(body: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      redirect: 'follow',
      // GAS requiere text/plain para evitar el preflight de CORS
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as ApiResponse<T>;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error de red' };
  }
}

// ============================================================
//  GET ENDPOINTS
// ============================================================

export async function apiGetMatches(): Promise<ApiResponse<Match[]>> {
  return gasGet<Match[]>('getMatches');
}

export async function apiGetLeaderboard(): Promise<ApiResponse<LeaderboardEntry[]>> {
  return gasGet<LeaderboardEntry[]>('getLeaderboard');
}

export async function apiGetPredictions(userId: string): Promise<ApiResponse<Prediction[]>> {
  return gasGet<Prediction[]>('getPredictions', { userId });
}

export interface SyncStatus {
  lastSync: string | null;
  lastStatus: 'success' | 'error' | 'never';
  lastMatchesSynced: number;
  lastMatchesUpdated: number;
  lastError: string | null;
}

export async function apiGetSyncStatus(): Promise<ApiResponse<SyncStatus>> {
  return gasGet<SyncStatus>('getSyncStatus');
}

/** Dispara sincronización manual desde Admin */
export async function apiSyncMatches(adminPassword: string): Promise<ApiResponse<{
  success: boolean;
  syncedNew: number;
  updated: number;
  newlyFinished: number;
  timestamp: string;
  error?: string;
}>> {
  return gasGet('syncMatches', { adminPassword });
}

// ============================================================
//  POST ENDPOINTS — AUTH
// ============================================================

/** Registro de nuevo usuario */
export async function apiRegister(
  firstName: string,
  lastName: string,
  username: string,
  password: string,
): Promise<ApiResponse<User>> {
  return gasPost<User>({ action: 'register', firstName, lastName, username, password });
}

/** Login con nombre de jugador y contraseña */
export async function apiLogin(username: string, password: string): Promise<ApiResponse<User>> {
  return gasPost<User>({ action: 'login', username, password });
}

// ============================================================
//  POST ENDPOINTS — GAME
// ============================================================

export async function apiSavePrediction(
  userId: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<ApiResponse<Prediction>> {
  return gasPost<Prediction>({ action: 'savePrediction', userId, matchId, homeScore, awayScore });
}

export interface UpdateMatchParams {
  matchId: string;
  adminPassword?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: 'upcoming' | 'live' | 'finished';
  unlock?: boolean;
}

export async function apiUpdateMatch(params: UpdateMatchParams): Promise<ApiResponse<{ matchId: string }>> {
  return gasPost({ action: 'updateMatch', ...params });
}

export async function apiAddMatch(
  adminPassword: string,
  homeTeam: string,
  awayTeam: string,
  matchDate: string,
  matchTime: string,
  group: string,
): Promise<ApiResponse<Match>> {
  return gasPost<Match>({ action: 'addMatch', adminPassword, homeTeam, awayTeam, matchDate, matchTime, group });
}
