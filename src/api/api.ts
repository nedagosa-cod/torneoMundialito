// ============================================================
//  API CLIENT — Polla del Mundial (Supabase Version)
//  Todas las funciones de comunicación con Supabase
// ============================================================

import { supabase } from './supabaseClient';
import type { ApiResponse, LeaderboardEntry, Match, MatchStatus, Prediction, User } from '../types';

// ============================================================
//  MAPPERS: base de datos (snake_case) <-> frontend (camelCase)
// ============================================================

function mapUser(u: any): User {
  return {
    userId: u.id,
    firstName: u.first_name,
    lastName: u.last_name || '',
    username: u.username,
    totalPoints: u.total_points || 0,
    createdAt: u.created_at,
  };
}

function mapMatch(m: any): Match {
  return {
    matchId: m.id,
    homeTeam: m.home_team,
    awayTeam: m.away_team,
    matchDate: m.match_date,
    matchTime: m.match_time,
    homeScore: m.home_score,
    awayScore: m.away_score,
    status: m.status as MatchStatus,
    group: m.group,
    matchType: m.match_type,
  };
}

function mapPrediction(p: any): Prediction {
  return {
    predictionId: p.id,
    userId: p.user_id,
    matchId: p.match_id,
    homeScore: p.home_score,
    awayScore: p.away_score,
    points: p.points,
    createdAt: p.created_at,
  };
}

// ============================================================
//  GET ENDPOINTS
// ============================================================

export async function apiGetMatches(): Promise<ApiResponse<Match[]>> {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true });

    if (error) throw error;
    return { success: true, data: (data || []).map(mapMatch) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al obtener partidos' };
  }
}

export async function apiGetLeaderboard(): Promise<ApiResponse<LeaderboardEntry[]>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('total_points', { ascending: false });

    if (error) throw error;

    const leaderboard: LeaderboardEntry[] = (data || []).map((u: any, index: number) => ({
      position: index + 1,
      userId: u.id,
      username: u.username,
      firstName: u.first_name,
      lastName: u.last_name || '',
      totalPoints: u.total_points || 0,
    }));

    return { success: true, data: leaderboard };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al obtener la tabla de posiciones' };
  }
}

export async function apiGetPredictions(userId: string): Promise<ApiResponse<Prediction[]>> {
  try {
    if (!userId) return { success: false, error: 'userId requerido' };

    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true, data: (data || []).map(mapPrediction) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al obtener predicciones' };
  }
}

export interface SyncStatus {
  lastSync: string | null;
  lastStatus: 'success' | 'error' | 'never';
  lastMatchesSynced: number;
  lastMatchesUpdated: number;
  lastError: string | null;
}

export async function apiGetSyncStatus(): Promise<ApiResponse<SyncStatus>> {
  try {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) throw error;
    const last = data && data.length > 0 ? data[0] : null;

    return {
      success: true,
      data: {
        lastSync: last ? last.timestamp : null,
        lastStatus: last ? last.status : 'never',
        lastMatchesSynced: last ? last.matches_synced : 0,
        lastMatchesUpdated: last ? last.matches_updated : 0,
        lastError: last ? last.error_message : null,
      },
    };
  } catch (err: any) {
    return { success: true, data: { lastSync: null, lastStatus: 'never', lastMatchesSynced: 0, lastMatchesUpdated: 0, lastError: null } };
  }
}

export interface AdminUserEntry {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  totalPoints: number;
  createdAt: string;
}

export async function apiAdminGetUsers(): Promise<ApiResponse<AdminUserEntry[]>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('first_name', { ascending: true });

    if (error) throw error;

    const users: AdminUserEntry[] = (data || []).map((u: any) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name || '',
      username: u.username,
      password: u.password,
      totalPoints: u.total_points || 0,
      createdAt: u.created_at,
    }));

    return { success: true, data: users };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al obtener usuarios' };
  }
}

/** Dispara sincronización de puntos desde Admin */
export async function apiSyncMatches(adminPassword: string): Promise<ApiResponse<{
  success: boolean;
  syncedNew: number;
  updated: number;
  newlyFinished: number;
  timestamp: string;
  error?: string;
}>> {
  try {
    if (adminPassword !== 'mundial2026') {
      return { success: false, error: 'Contraseña de admin incorrecta' };
    }

    // Correr propagación de llaves por seguridad
    try {
      await autoPropagateTeamsSupabase();
    } catch (propErr) {
      console.error('Error al propagar clasificados:', propErr);
    }

    const { error } = await supabase.rpc('recalculate_all_user_points');
    if (error) throw error;

    return {
      success: true,
      data: {
        success: true,
        syncedNew: 0,
        updated: 0,
        newlyFinished: 0,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al sincronizar/recalcular puntos' };
  }
}

// ============================================================
//  POST ENDPOINTS — AUTH
// ============================================================

/** Registro de nuevo usuario (Deshabilitado, se registra via Google Forms) */
export async function apiRegister(
  _firstName: string,
  _lastName: string,
  _username: string,
  _password: string,
): Promise<ApiResponse<User>> {
  return {
    success: false,
    error: 'El registro se realiza exclusivamente a través del formulario de Google Forms proporcionado por la organización.',
  };
}

/** Login con correo y cédula */
export async function apiLogin(username: string, password: string): Promise<ApiResponse<User>> {
  try {
    if (!username || !password) {
      return { success: false, error: 'Correo y cédula son requeridos' };
    }

    const emailNorm = username.trim().toLowerCase();
    const cedulaNorm = String(password).trim();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', emailNorm);

    if (error) throw error;
    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Correo no encontrado. ¿Ya completaste el formulario de registro?',
        code: 404,
      };
    }

    const user = data[0];
    if (user.password !== cedulaNorm) {
      return { success: false, error: 'Número de cédula incorrecto', code: 401 };
    }

    return { success: true, data: mapUser(user) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al iniciar sesión' };
  }
}

/** Obtener perfil de usuario por ID */
export async function apiGetUserProfile(userId: string): Promise<ApiResponse<User>> {
  try {
    if (!userId) return { success: false, error: 'userId requerido' };
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { success: true, data: mapUser(data) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al obtener perfil de usuario' };
  }
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
  try {
    if (!userId || !matchId) return { success: false, error: 'userId y matchId requeridos' };
    if (homeScore == null || awayScore == null) return { success: false, error: 'Marcador requerido' };

    // 1. Validar que el partido exista y no haya comenzado
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchErr || !match) {
      return { success: false, error: 'Partido no encontrado' };
    }

    if (match.status === 'finished') {
      return { success: false, error: 'El partido ya terminó' };
    }

    // Bloquear predicción si ya comenzó el partido
    if (match.match_date && match.match_time) {
      const dateParts = match.match_date.split('-'); // YYYY-MM-DD
      const timeParts = match.match_time.split(':'); // HH:mm
      if (dateParts.length === 3 && timeParts.length === 2) {
        const kickoff = new Date(
          Number(dateParts[0]),
          Number(dateParts[1]) - 1,
          Number(dateParts[2]),
          Number(timeParts[0]),
          Number(timeParts[1]),
          0
        );
        const now = new Date();
        if (now >= kickoff) {
          return { success: false, error: 'El partido ya comenzó y las predicciones están cerradas' };
        }
      }
    }

    // 2. Buscar si existe una predicción previa para este usuario y partido
    const { data: existing, error: existErr } = await supabase
      .from('predictions')
      .select('id')
      .eq('user_id', userId)
      .eq('match_id', matchId);

    if (existErr) throw existErr;

    const predictionId = existing && existing.length > 0
      ? existing[0].id
      : 'PRD' + Math.floor(100000 + Math.random() * 900000);

    const payload = {
      id: predictionId,
      user_id: userId,
      match_id: matchId,
      home_score: homeScore,
      away_score: awayScore,
      points: null,
      created_at: new Date().toISOString(),
    };

    // 3. Guardar (upsert)
    const { data, error } = await supabase
      .from('predictions')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: mapPrediction(data) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar predicción' };
  }
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
  matchDate?: string;
  matchTime?: string;
}

export async function apiUpdateMatch(params: UpdateMatchParams): Promise<ApiResponse<{ matchId: string }>> {
  try {
    if (params.adminPassword !== 'mundial2026') {
      return { success: false, error: 'Contraseña de administrador incorrecta' };
    }

    // 1. Obtener partido actual para verificar su match_type y manejo de candados
    const { data: currentMatch, error: getErr } = await supabase
      .from('matches')
      .select('match_type')
      .eq('id', params.matchId)
      .single();

    if (getErr || !currentMatch) throw new Error('Partido no encontrado');
    let matchType = currentMatch.match_type || 'group';

    // Bloquear si el administrador edita manualmente los equipos
    if ((params.homeTeam !== undefined || params.awayTeam !== undefined) && !matchType.includes('_locked')) {
      matchType = matchType + '_locked';
    }

    // Desbloquear si se solicita explícitamente (Auto-calcular)
    if (params.unlock === true && matchType.includes('_locked')) {
      matchType = matchType.replace('_locked', '');
    }

    const updatePayload: any = {};
    if (params.homeTeam !== undefined) updatePayload.home_team = params.homeTeam;
    if (params.awayTeam !== undefined) updatePayload.away_team = params.awayTeam;
    if (params.homeScore !== undefined) updatePayload.home_score = params.homeScore;
    if (params.awayScore !== undefined) updatePayload.away_score = params.awayScore;
    if (params.status !== undefined) updatePayload.status = params.status;
    if (params.matchDate !== undefined) updatePayload.match_date = params.matchDate;
    if (params.matchTime !== undefined) updatePayload.match_time = params.matchTime;
    updatePayload.match_type = matchType;

    const { error } = await supabase
      .from('matches')
      .update(updatePayload)
      .eq('id', params.matchId);

    if (error) throw error;

    // Si se actualizan marcadores o estado, recalcular los puntos de todos los usuarios
    if (params.homeScore !== undefined || params.awayScore !== undefined || params.status === 'finished') {
      // A. Propagar clasificados del fixture en Supabase
      try {
        await autoPropagateTeamsSupabase();
      } catch (propErr) {
        console.error('Error al propagar equipos:', propErr);
      }

      // B. Recalcular puntos
      const { error: rpcError } = await supabase.rpc('recalculate_all_user_points');
      if (rpcError) throw rpcError;
    }

    return { success: true, data: { matchId: params.matchId } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al actualizar partido' };
  }
}

export async function apiAddMatch(
  adminPassword: string,
  homeTeam: string,
  awayTeam: string,
  matchDate: string,
  matchTime: string,
  group: string,
): Promise<ApiResponse<Match>> {
  try {
    if (adminPassword !== 'mundial2026') {
      return { success: false, error: 'Contraseña incorrecta' };
    }

    const newMatchId = String(Math.floor(100 + Math.random() * 900));
    const payload = {
      id: newMatchId,
      home_team: homeTeam,
      away_team: awayTeam,
      match_date: matchDate,
      match_time: matchTime,
      status: 'upcoming',
      group: group,
      match_type: 'group',
    };

    const { data, error } = await supabase
      .from('matches')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: mapMatch(data) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al añadir partido' };
  }
}

/** Reiniciar las predicciones de un usuario */
export async function apiResetUserPredictions(adminPassword: string, userId: string): Promise<ApiResponse<void>> {
  try {
    if (adminPassword !== 'mundial2026') {
      return { success: false, error: 'Contraseña de administrador incorrecta' };
    }
    if (!userId) {
      return { success: false, error: 'userId requerido' };
    }

    // 1. Eliminar predicciones del usuario
    const { error: deleteErr } = await supabase
      .from('predictions')
      .delete()
      .eq('user_id', userId);

    if (deleteErr) throw deleteErr;

    // 2. Recalcular puntos para reflejar el cambio (los total_points del usuario volverán a 0)
    const { error: rpcError } = await supabase.rpc('recalculate_all_user_points');
    if (rpcError) throw rpcError;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al reiniciar predicciones del usuario' };
  }
}

// ============================================================
//  PROPAGACIÓN AUTOMÁTICA DE BRACKET Y CLASIFICADOS EN SUPABASE
// ============================================================

interface DBMatch {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  match_time: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  group: string;
  match_type: string;
  api_id: string;
}

interface TeamStats {
  team: string;
  group: string;
  points: number;
  gd: number;
  gf: number;
  ga: number;
  won: number;
  played: number;
}

function calculateGroupStandings(matches: DBMatch[], groupLetter: string): TeamStats[] {
  const groupMatches = matches.filter(
    m => m.group === groupLetter && m.match_type.replace('_locked', '') === 'group'
  );

  const teamsMap: Record<string, boolean> = {};
  groupMatches.forEach(m => {
    if (m.home_team && m.home_team !== 'Por definir') teamsMap[m.home_team] = true;
    if (m.away_team && m.away_team !== 'Por definir') teamsMap[m.away_team] = true;
  });
  const teams = Object.keys(teamsMap);

  const stats: Record<string, TeamStats> = {};
  teams.forEach(t => {
    stats[t] = { team: t, group: groupLetter, points: 0, gd: 0, gf: 0, ga: 0, won: 0, played: 0 };
  });

  groupMatches.forEach(m => {
    if (m.status === 'finished' && m.home_score !== null && m.away_score !== null) {
      const h = Number(m.home_score);
      const a = Number(m.away_score);
      const home = m.home_team;
      const away = m.away_team;

      if (stats[home] && stats[away]) {
        stats[home].played++;
        stats[away].played++;
        stats[home].gf += h;
        stats[home].ga += a;
        stats[home].gd += (h - a);
        stats[away].gf += a;
        stats[away].ga += h;
        stats[away].gd += (a - h);

        if (h > a) {
          stats[home].points += 3;
          stats[home].won++;
        } else if (a > h) {
          stats[away].points += 3;
          stats[away].won++;
        } else {
          stats[home].points += 1;
          stats[away].points += 1;
        }
      }
    }
  });

  const standings = Object.values(stats);
  standings.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return x.team.localeCompare(y.team);
  });

  return standings;
}

function calculateBestThirdPlacedTeams(matches: DBMatch[]): TeamStats[] {
  const thirds: TeamStats[] = [];
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  groups.forEach(g => {
    // Solo consideramos terceros lugares de grupos cuyos partidos estén 100% finalizados
    const groupMatches = matches.filter(
      m => m.group === g && m.match_type.replace('_locked', '') === 'group'
    );
    const allFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'finished');
    if (allFinished) {
      const standings = calculateGroupStandings(matches, g);
      if (standings.length >= 3) {
        thirds.push(standings[2]);
      }
    }
  });

  thirds.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return x.team.localeCompare(y.team);
  });

  return thirds.slice(0, 8);
}

function findMatchingThirds(
  teams: TeamStats[],
  matches: { matchId: string; acceptedGroups: string[] }[],
  currentIndex: number,
  currentMatching: TeamStats[]
): TeamStats[] | null {
  if (currentIndex === matches.length) {
    return currentMatching;
  }
  const match = matches[currentIndex];
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    if (!currentMatching.includes(team)) {
      if (match.acceptedGroups.includes(team.group)) {
        currentMatching.push(team);
        const result = findMatchingThirds(teams, matches, currentIndex + 1, currentMatching);
        if (result) return result;
        currentMatching.pop();
      }
    }
  }
  return null;
}

function assignThirdsToKnockout(bestThirds: TeamStats[]): Record<string, string> {
  const matchConfigs = [
    { matchId: 'API_74', acceptedGroups: ['A', 'B', 'C', 'D', 'F'] },
    { matchId: 'API_77', acceptedGroups: ['C', 'D', 'F', 'G', 'H'] },
    { matchId: 'API_79', acceptedGroups: ['C', 'E', 'F', 'H', 'I'] },
    { matchId: 'API_80', acceptedGroups: ['E', 'H', 'I', 'J', 'K'] },
    { matchId: 'API_81', acceptedGroups: ['B', 'E', 'F', 'I', 'J'] },
    { matchId: 'API_82', acceptedGroups: ['A', 'E', 'H', 'I', 'J'] },
    { matchId: 'API_85', acceptedGroups: ['E', 'F', 'G', 'I', 'J'] },
    { matchId: 'API_87', acceptedGroups: ['D', 'E', 'I', 'J', 'L'] }
  ];

  if (bestThirds.length < 8) return {};

  const matching = findMatchingThirds(bestThirds, matchConfigs, 0, []);
  const result: Record<string, string> = {};
  if (matching) {
    matchConfigs.forEach((cfg, idx) => {
      result[cfg.matchId] = matching[idx].team;
    });
  }
  return result;
}

export async function autoPropagateTeamsSupabase(): Promise<void> {
  const { data: matchesData, error } = await supabase.from('matches').select('*');
  if (error || !matchesData) return;

  // Clona los datos para tener copias separadas en memoria de la original y la modificada
  const matches = JSON.parse(JSON.stringify(matchesData)) as DBMatch[];
  const matchMap: Record<string, DBMatch> = {};
  matches.forEach(m => {
    matchMap[m.id] = m;
  });

  const groupStandings: Record<string, TeamStats[]> = {};
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  groups.forEach(g => {
    groupStandings[g] = calculateGroupStandings(matches, g);
  });

  const bestThirds = calculateBestThirdPlacedTeams(matches);
  const thirdPlaceAssignments = assignThirdsToKnockout(bestThirds);

  // Configuración de enfrentamientos directos en Dieciseisavos (Round of 32)
  const r32DirectConfigs: Record<string, { home: { group: string; rank: number }; away: { group: string; rank: number } }> = {
    'API_73': { home: { group: 'A', rank: 2 }, away: { group: 'B', rank: 2 } },
    'API_75': { home: { group: 'F', rank: 1 }, away: { group: 'C', rank: 2 } },
    'API_76': { home: { group: 'C', rank: 1 }, away: { group: 'F', rank: 2 } },
    'API_78': { home: { group: 'E', rank: 2 }, away: { group: 'I', rank: 2 } },
    'API_83': { home: { group: 'K', rank: 2 }, away: { group: 'L', rank: 2 } },
    'API_84': { home: { group: 'H', rank: 1 }, away: { group: 'J', rank: 2 } },
    'API_86': { home: { group: 'J', rank: 1 }, away: { group: 'H', rank: 2 } }, // Añadido (corrigiendo bug original de GAS)
    'API_88': { home: { group: 'D', rank: 2 }, away: { group: 'G', rank: 2 } }
  };

  // Configuración de enfrentamientos contra mejores terceros
  const r32ThirdConfigs: Record<string, { home: { group: string; rank: number } }> = {
    'API_74': { home: { group: 'E', rank: 1 } },
    'API_77': { home: { group: 'I', rank: 1 } },
    'API_79': { home: { group: 'A', rank: 1 } },
    'API_80': { home: { group: 'L', rank: 1 } },
    'API_81': { home: { group: 'D', rank: 1 } },
    'API_82': { home: { group: 'G', rank: 1 } },
    'API_85': { home: { group: 'B', rank: 1 } },
    'API_87': { home: { group: 'K', rank: 1 } }
  };

  function getTeamByRank(group: string, rank: number): string | null {
    // Solo propagamos si todos los partidos de la fase de grupos de este grupo están finalizados
    const groupMatches = matches.filter(
      m => m.group === group && m.match_type.replace('_locked', '') === 'group'
    );
    const allFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'finished');
    if (!allFinished) {
      return 'Por definir';
    }

    const list = groupStandings[group] || [];
    if (list.length >= rank) {
      return list[rank - 1].team;
    }
    return 'Por definir';
  }

  // 1. Propagación desde fase de grupos a Dieciseisavos (Round of 32)
  Object.keys(r32DirectConfigs).forEach(matchId => {
    const cfg = r32DirectConfigs[matchId];
    const homeTeam = getTeamByRank(cfg.home.group, cfg.home.rank);
    const awayTeam = getTeamByRank(cfg.away.group, cfg.away.rank);
    const m = matchMap[matchId];
    if (m && !m.match_type.includes('_locked')) {
      if (homeTeam) m.home_team = homeTeam;
      if (awayTeam) m.away_team = awayTeam;
    }
  });

  Object.keys(r32ThirdConfigs).forEach(matchId => {
    const cfg = r32ThirdConfigs[matchId];
    const homeTeam = getTeamByRank(cfg.home.group, cfg.home.rank);
    const m = matchMap[matchId];
    if (m && !m.match_type.includes('_locked')) {
      if (homeTeam) m.home_team = homeTeam;

      const assignedThird = thirdPlaceAssignments[matchId];
      m.away_team = assignedThird || 'Por definir';
    }
  });

  // 2. Propagación de rondas eliminatorias (Octavos, Cuartos, Semis, Final)
  const knockoutDependencies: Record<string, { home: string; away: string; useLoser?: boolean }> = {
    'API_89': { home: 'API_74', away: 'API_77' },
    'API_90': { home: 'API_73', away: 'API_75' },
    'API_91': { home: 'API_76', away: 'API_78' },
    'API_92': { home: 'API_79', away: 'API_80' },
    'API_93': { home: 'API_83', away: 'API_84' },
    'API_94': { home: 'API_81', away: 'API_82' },
    'API_95': { home: 'API_86', away: 'API_88' },
    'API_96': { home: 'API_85', away: 'API_87' },
    'API_97': { home: 'API_89', away: 'API_90' },
    'API_98': { home: 'API_93', away: 'API_94' },
    'API_99': { home: 'API_91', away: 'API_92' },
    'API_100': { home: 'API_95', away: 'API_96' },
    'API_101': { home: 'API_97', away: 'API_98' },
    'API_102': { home: 'API_99', away: 'API_100' },
    'API_103': { home: 'API_101', away: 'API_102', useLoser: true },
    'API_104': { home: 'API_101', away: 'API_102' }
  };

  function getKnockoutResult(mId: string, getLoser: boolean): string | null {
    const m = matchMap[mId];
    if (m && m.status === 'finished' && m.home_score !== null && m.away_score !== null) {
      const hs = Number(m.home_score);
      const as = Number(m.away_score);
      if (hs > as) {
        return getLoser ? m.away_team : m.home_team;
      } else {
        return getLoser ? m.home_team : m.away_team;
      }
    }
    return null;
  }

  const knockoutOrder = [
    'API_89', 'API_90', 'API_91', 'API_92', 'API_93', 'API_94', 'API_95', 'API_96',
    'API_97', 'API_98', 'API_99', 'API_100',
    'API_101', 'API_102',
    'API_103', 'API_104'
  ];

  knockoutOrder.forEach(matchId => {
    const dep = knockoutDependencies[matchId];
    const m = matchMap[matchId];
    if (dep && m && !m.match_type.includes('_locked')) {
      const homeTeam = getKnockoutResult(dep.home, false);
      const awayTeam = getKnockoutResult(dep.away, dep.useLoser || false);
      m.home_team = homeTeam || 'Por definir';
      m.away_team = awayTeam || 'Por definir';
    }
  });

  // 3. Guardar en Supabase únicamente los partidos que cambiaron
  for (let i = 0; i < matches.length; i++) {
    const original = matchesData[i] as DBMatch;
    const modified = matchMap[original.id];
    if (original.home_team !== modified.home_team || original.away_team !== modified.away_team) {
      await supabase
        .from('matches')
        .update({
          home_team: modified.home_team,
          away_team: modified.away_team
        })
        .eq('id', original.id);
    }
  }
}
