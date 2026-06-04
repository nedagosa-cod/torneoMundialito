// ============================================================
//  TIPOS GLOBALES — Polla del Mundia
// ============================================================

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;       // Nombre de jugador (display)
  totalPoints: number;
  createdAt: string;
}

export type MatchStatus = 'upcoming' | 'live' | 'finished';

export interface Match {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  matchTime: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  group: string;
  matchType?: string;
}

export interface Prediction {
  predictionId: string;
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  points: number | null;
  createdAt: string;
}

export interface LeaderboardEntry {
  position: number;
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  totalPoints: number;
}

// ============================================================
//  RESPUESTA DE LA API
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

// ============================================================
//  ESTADO DE PREDICCIÓN LOCAL (para edición en UI)
// ============================================================

export interface PredictionDraft {
  matchId: string;
  homeScore: string;
  awayScore: string;
}

// ============================================================
//  RESULTADO DE PUNTOS
// ============================================================

export type PointsResult = 'exact' | 'outcome' | 'miss' | null;

export function getPointsResult(points: number | null): PointsResult {
  if (points === null || points === undefined) return null;
  if (points >= 3) return 'exact';
  if (points === 1) return 'outcome';
  return 'miss';
}

export function getOutcome(home: number, away: number): 'home' | 'away' | 'draw' {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

// Re-export desde api.ts para uso cómodo en componentes
export type { SyncStatus } from '../api/api';
