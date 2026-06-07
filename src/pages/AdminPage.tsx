// src/pages/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { apiSyncMatches, apiGetSyncStatus, apiAdminGetUsers, apiResetUserPredictions } from '../api/api';
import type { AdminUserEntry } from '../api/api';
import type { Match, SyncStatus } from '../types';

const ADMIN_STORAGE_KEY = 'polla-admin-auth';
const ADMIN_PASSWORD_KEY = 'polla-admin-password';

// ============================================================
//  Helper: formatear fecha de última sincronización
// ============================================================
function formatSyncTime(isoStr: string | null): string {
  if (!isoStr) return 'Nunca';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return isoStr; }
}

function formatTimeToAMPM(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // el número '0' debe ser '12'
  return `${hours}:${minutes} ${ampm}`;
}

// ============================================================
//  Panel de Sincronización con API
// ============================================================
function SyncPanel({ adminPassword }: { adminPassword: string }) {
  const { loadMatches, loadLeaderboard } = useStore();
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [lastResult, setLastResult] = useState<{ ok: boolean; msg: string; detail?: string } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoadingStatus(true);
    const res = await apiGetSyncStatus();
    if (res.success && res.data) setStatus(res.data);
    setLoadingStatus(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setLastResult(null);
    const res = await apiSyncMatches(adminPassword);

    if (res.success) {
      const d = res.data!;
      if (d.success) {
        setLastResult({
          ok: true,
          msg: `✅ Sincronizado correctamente`,
          detail: `${d.syncedNew} partidos nuevos · ${d.updated} actualizados · ${d.newlyFinished} terminados`,
        });
        // Recargar partidos y leaderboard tras sync
        await Promise.all([loadMatches(), loadLeaderboard()]);
      } else {
        setLastResult({
          ok: false,
          msg: `⚠️ La API falló — datos locales intactos`,
          detail: d.error || 'Error desconocido',
        });
      }
    } else {
      setLastResult({
        ok: false,
        msg: `❌ Error al conectar con el servidor`,
        detail: res.error,
      });
    }

    await loadStatus();
    setSyncing(false);
  };

  const statusColor = status?.lastStatus === 'success'
    ? 'text-verde-400' : status?.lastStatus === 'error'
      ? 'text-red-400' : 'text-white/40';

  const statusIcon = status?.lastStatus === 'success' ? '✅' :
    status?.lastStatus === 'error' ? '⚠️' : '—';

  return (
    <div className="space-y-3">
      {/* Status card */}
      <div
        className="rounded-2xl p-4 border"
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.05), rgba(34,197,94,0.02))',
          borderColor: 'rgba(34,197,94,0.2)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
              Estado de Puntuaciones
            </p>
            {loadingStatus ? (
              <div className="space-y-1.5">
                <div className="h-3 w-40 rounded shimmer-bg" />
                <div className="h-3 w-24 rounded shimmer-bg" />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  {statusIcon}{' '}
                  <span className={statusColor}>
                    {status?.lastStatus === 'success' ? 'Último recálculo exitoso'
                      : status?.lastStatus === 'error' ? 'El recálculo falló'
                        : 'Sin recálculos de puntos aún'}
                  </span>
                </p>
                <p className="text-xs text-white/30">
                  {formatSyncTime(status?.lastSync ?? null)}
                </p>
                {status?.lastStatus === 'success' && (
                  <p className="text-xs text-white/30">
                    {status.lastMatchesUpdated} predicciones procesadas · {status.lastMatchesSynced} partidos terminados
                  </p>
                )}
                {status?.lastStatus === 'error' && status.lastError && (
                  <p className="text-xs text-red-400/70 truncate">{status.lastError}</p>
                )}
              </div>
            )}
          </div>

          {/* Indicador de trigger */}
          <div className="flex-shrink-0 text-right">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-verde-400/10 border border-verde-400/20">
              <span className="w-1.5 h-1.5 rounded-full bg-verde-400 inline-block" />
              <span className="text-xs font-bold text-verde-400">Actualizada</span>
            </div>
          </div>
        </div>
      </div>


      {/* Botón de sync manual */}
      <button
        id="sync-api-btn"
        onClick={handleSync}
        disabled={syncing}
        className="w-full py-3.5 rounded-xl font-display font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60"
        style={{
          background: syncing
            ? 'rgba(34,197,94,0.1)'
            : 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))',
          border: '1px solid rgba(34,197,94,0.4)',
          color: '#22c55e',
        }}
      >
        {syncing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Recalculando posiciones...
          </span>
        ) : (
          '🏆 Forzar Recálculo de Puntos'
        )}
      </button>

      {/* Resultado */}
      {lastResult && (
        <div
          className={`px-4 py-3 rounded-xl border animate-slide-up ${lastResult.ok
            ? 'bg-verde-400/5 border-verde-400/20'
            : 'bg-red-500/5 border-red-500/20'
            }`}
        >
          <p className={`text-sm font-bold ${lastResult.ok ? 'text-verde-400' : 'text-red-400'}`}>
            {lastResult.msg}
          </p>
          {lastResult.detail && (
            <p className="text-xs text-white/40 mt-1">{lastResult.detail}</p>
          )}
        </div>
      )}


    </div>
  );
}

// ============================================================
//  Formulario: Actualizar resultado de partido
// ============================================================
function UpdateMatchForm({ match, adminPassword }: { match: Match; adminPassword: string }) {
  const { updateMatch } = useStore();
  const [homeTeam, setHomeTeam] = useState(match.homeTeam);
  const [awayTeam, setAwayTeam] = useState(match.awayTeam);
  const [homeScore, setHomeScore] = useState(match.homeScore !== null ? String(match.homeScore) : '');
  const [awayScore, setAwayScore] = useState(match.awayScore !== null ? String(match.awayScore) : '');
  const [status, setStatus] = useState<Match['status']>(match.status);
  const [matchDate, setMatchDate] = useState(match.matchDate);
  const [matchTime, setMatchTime] = useState(match.matchTime);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setHomeTeam(match.homeTeam);
    setAwayTeam(match.awayTeam);
    setHomeScore(match.homeScore !== null ? String(match.homeScore) : '');
    setAwayScore(match.awayScore !== null ? String(match.awayScore) : '');
    setStatus(match.status);
    setMatchDate(match.matchDate);
    setMatchTime(match.matchTime);
  }, [match]);

  const handleUpdate = async () => {
    setLoading(true);
    setResult(null);

    const h = homeScore.trim() === '' ? null : parseInt(homeScore);
    const a = awayScore.trim() === '' ? null : parseInt(awayScore);

    const ok = await updateMatch({
      matchId: match.matchId,
      homeTeam,
      awayTeam,
      homeScore: h,
      awayScore: a,
      status,
      matchDate,
      matchTime,
      password: adminPassword
    });

    setResult({ ok, msg: ok ? '✅ Cambios guardados' : '❌ Error al actualizar' });
    setLoading(false);
  };

  const handleUnlock = async () => {
    setLoading(true);
    setResult(null);
    const ok = await updateMatch({
      matchId: match.matchId,
      unlock: true,
      password: adminPassword
    });
    setResult({ ok, msg: ok ? '🔓 Desbloqueado' : '❌ Error al desbloquear' });
    setLoading(false);
  };

  const handleReset = async () => {
    const confirmReset = window.confirm(
      `¿Estás seguro de que deseas reiniciar el partido ${match.homeTeam} vs ${match.awayTeam}? Esto restablecerá los goles a vacío, el estado a "Por jugar" (upcoming) y recalculará los puntos de las predicciones.`
    );
    if (!confirmReset) return;

    setLoading(true);
    setResult(null);

    const ok = await updateMatch({
      matchId: match.matchId,
      homeScore: null,
      awayScore: null,
      status: 'upcoming',
      unlock: true,
      password: adminPassword
    });

    if (ok) {
      setHomeScore('');
      setAwayScore('');
      setStatus('upcoming');
    }

    setResult({ ok, msg: ok ? '🔄 Partido restablecido' : '❌ Error al restablecer' });
    setLoading(false);
  };

  const isLocked = match.matchType?.includes('_locked');

  return (
    <div id={`admin-match-${match.matchId}`} className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white/30 uppercase tracking-wider">
            {match.group}
          </span>
          {isLocked && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-dorado-500/20 text-dorado-400 border border-dorado-500/30 font-bold">
              🔒 Bloqueado manual
            </span>
          )}
        </div>
        <span className="text-xs text-white/20">{match.matchDate} · {formatTimeToAMPM(match.matchTime)}</span>
      </div>

      {/* Campos para editar nombres de equipos */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-white/40 mb-0.5 font-semibold">Local</label>
          <input
            type="text"
            className="input-field text-xs py-1.5 px-2"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] text-white/40 mb-0.5 font-semibold text-right">Visitante</label>
          <input
            type="text"
            className="input-field text-xs py-1.5 px-2 text-right"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
          />
        </div>
      </div>

      {/* Campos para editar fecha y hora */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-white/40 mb-0.5 font-semibold">Fecha</label>
          <input
            type="date"
            className="input-field text-xs py-1.5 px-2 bg-white/5 border border-white/10 rounded-lg text-white font-semibold w-full"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] text-white/40 mb-0.5 font-semibold">Hora</label>
          <input
            type="time"
            className="input-field text-xs py-1.5 px-2 bg-white/5 border border-white/10 rounded-lg text-white font-semibold w-full"
            value={matchTime}
            onChange={(e) => setMatchTime(e.target.value)}
          />
        </div>
      </div>

      {/* Marcador y Estado */}
      <div className="flex items-end gap-3 pt-1">
        <div className="flex-1">
          <label className="block text-[10px] text-white/40 mb-0.5 font-semibold">Goles L.</label>
          <input
            id={`admin-home-${match.matchId}`}
            type="number" min="0" max="99"
            className="score-input w-full text-center"
            placeholder="—"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
          />
        </div>
        <span className="text-white/30 font-display font-black text-xl mb-2 flex-shrink-0">:</span>
        <div className="flex-1">
          <label className="block text-[10px] text-white/40 mb-0.5 font-semibold text-right">Goles V.</label>
          <input
            id={`admin-away-${match.matchId}`}
            type="number" min="0" max="99"
            className="score-input w-full text-center"
            placeholder="—"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
          />
        </div>

        {/* Dropdown de Estado */}
        <div className="flex-1.5 min-w-[90px]">
          <label className="block text-[10px] text-white/40 mb-0.5 font-semibold">Estado</label>
          <select
            className="input-field text-xs py-1.5 px-1 bg-white/5 border border-white/10 rounded-lg text-white font-semibold w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value as Match['status'])}
          >
            <option value="upcoming">Por jugar</option>
            <option value="live">En vivo</option>
            <option value="finished">Finalizado</option>
          </select>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          {isLocked && (
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 border border-white/10 transition-all font-semibold"
            >
              🔓 Auto-calcular
            </button>
          )}
          {(match.homeScore !== null || match.awayScore !== null || match.status !== 'upcoming') && (
            <button
              onClick={handleReset}
              disabled={loading}
              className="text-[10px] px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all font-semibold"
              title="Reiniciar partido a estado inicial"
            >
              🔄 Reiniciar
            </button>
          )}
        </div>

        <Button
          variant="gold"
          size="sm"
          loading={loading}
          onClick={handleUpdate}
          className="px-4 py-1 text-xs font-bold"
        >
          Guardar Cambios
        </Button>
      </div>

      {result && (
        <p className={`text-xs font-semibold animate-fade-in ${result.ok ? 'text-verde-400' : 'text-red-400'}`}>
          {result.msg}
        </p>
      )}
    </div>
  );
}

// ============================================================
//  Formulario: Agregar partido manual
// ============================================================
function AddMatchForm({ adminPassword }: { adminPassword: string }) {
  const { addMatch } = useStore();
  const [form, setForm] = useState({
    homeTeam: '', awayTeam: '', matchDate: '', matchTime: '18:00', group: 'A',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleAdd = async () => {
    if (!form.homeTeam || !form.awayTeam || !form.matchDate) return;
    setLoading(true);
    setResult(null);
    const ok = await addMatch(adminPassword, form.homeTeam, form.awayTeam, form.matchDate, form.matchTime, form.group);
    setResult({ ok, msg: ok ? '✅ Partido creado' : '❌ Error al crear' });
    if (ok) setForm({ homeTeam: '', awayTeam: '', matchDate: '', matchTime: '18:00', group: 'A' });
    setLoading(false);
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="font-display font-bold text-dorado-400">➕ Partido Manual</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'home', label: 'Local', key: 'homeTeam', placeholder: 'Ej: Argentina' },
          { id: 'away', label: 'Visitante', key: 'awayTeam', placeholder: 'Ej: Brazil' },
        ].map(({ id, label, key, placeholder }) => (
          <div key={id}>
            <label className="block text-xs text-white/40 mb-1 font-semibold">{label}</label>
            <input
              id={`add-${id}-team`}
              className="input-field text-sm"
              placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={(e) => update(key, e.target.value)}
            />
          </div>
        ))}
        <div>
          <label className="block text-xs text-white/40 mb-1 font-semibold">Fecha</label>
          <input id="add-match-date" type="date" className="input-field text-sm"
            value={form.matchDate} onChange={(e) => update('matchDate', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1 font-semibold">Hora</label>
          <input id="add-match-time" type="time" className="input-field text-sm"
            value={form.matchTime} onChange={(e) => update('matchTime', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-white/40 mb-1 font-semibold">Etapa</label>
          <select id="add-match-group" className="input-field text-sm"
            value={form.group} onChange={(e) => update('group', e.target.value)}>
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'].map(
              (g) => <option key={g} value={g}>{g}</option>
            )}
          </select>
        </div>
      </div>
      <Button id="add-match-btn" variant="gold" loading={loading} onClick={handleAdd}
        disabled={!form.homeTeam || !form.awayTeam || !form.matchDate} className="w-full">
        🏟️ Crear Partido
      </Button>
      {result && (
        <p className={`text-xs font-semibold ${result.ok ? 'text-verde-400' : 'text-red-400'}`}>{result.msg}</p>
      )}
    </div>
  );
}

// ============================================================
//  Pestaña: Usuarios Registrados (Paginación + Buscador)
// ============================================================
function UsersPanel({ adminPassword }: { adminPassword: string }) {
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    const res = await apiAdminGetUsers();
    if (res.success && res.data) {
      setUsers(res.data);
    } else {
      setError(res.error || 'Error al cargar los usuarios');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleResetPredictions = async (u: AdminUserEntry) => {
    const confirmReset = window.confirm(
      `¿Estás seguro de que deseas reiniciar todas las predicciones de ${u.firstName} ${u.lastName}? Esta acción es irreversible y eliminará todos sus pronósticos guardados, volviendo sus puntos a 0.`
    );
    if (!confirmReset) return;

    setResettingUserId(u.id);
    const res = await apiResetUserPredictions(adminPassword, u.id);
    if (res.success) {
      alert(`✅ Se han reiniciado las predicciones de ${u.firstName} ${u.lastName}.`);
      await loadUsers();
    } else {
      alert(`❌ Error al reiniciar: ${res.error}`);
    }
    setResettingUserId(null);
  };

  // Filter users based on search term
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.password.toLowerCase().includes(term) ||
      u.id.toLowerCase().includes(term)
    );
  });

  // Pagination calculations
  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));

  // Reset to page 1 if current page is out of bounds due to filtering
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [searchTerm, totalPages]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Buscador y Resumen */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-3 text-white/30 text-sm">🔍</span>
          <input
            type="text"
            className="input-field pl-10 py-2 text-sm"
            placeholder="Buscar por nombre, correo, cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-2.5 text-white/30 hover:text-white/60 text-xs font-bold"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/3 border border-white/5 justify-between">
          <span className="text-xs text-white/40">Total:</span>
          <span className="text-sm font-display font-black text-dorado-400">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
          </span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
          <p className="text-sm text-red-400 font-semibold">{error}</p>
          <button onClick={loadUsers} className="mt-2 text-xs font-bold text-white/50 hover:text-white underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-3 py-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 w-full rounded-2xl shimmer-bg animate-pulse" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white/3 rounded-2xl border border-white/5">
          <span className="text-4xl mb-3">👥</span>
          <p className="text-white/40 font-semibold text-sm">No se encontraron usuarios</p>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="mt-2 text-xs font-bold text-dorado-400 hover:underline">
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Listado de usuarios */}
          <div className="space-y-2.5">
            {paginatedUsers.map((u) => (
              <div key={u.id} className="glass-card p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Inicial avatar */}
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-display font-black text-sm text-white/80 uppercase">
                      {u.firstName.charAt(0)}
                    </span>
                  </div>
                  {/* Datos del usuario */}
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white leading-tight truncate">
                      {u.firstName} {u.lastName}
                    </h4>
                    <p className="text-xs text-white/30 truncate mt-0.5">
                      📧 {u.username}
                    </p>
                    <p className="text-[10px] text-white/20 font-mono mt-0.5">
                      🪪 C.C. {u.password} · ID: {u.id}
                    </p>
                  </div>
                </div>

                {/* Acciones y Puntaje */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  {/* Botón de reiniciar predicciones */}
                  <button
                    onClick={() => handleResetPredictions(u)}
                    disabled={resettingUserId === u.id}
                    className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 hover:bg-red-500/25 active:scale-95 disabled:opacity-40 transition-all duration-200"
                    title="Reiniciar predicciones"
                  >
                    {resettingUserId === u.id ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    )}
                  </button>

                  {/* Puntaje */}
                  <div className="inline-block px-3 py-1.5 rounded-xl bg-dorado-400/10 border border-dorado-400/20 text-center min-w-[70px]">
                    <p className="text-[10px] font-bold text-white/40 leading-none">PUNTOS</p>
                    <p className="text-base font-display font-black text-dorado-400 mt-1 leading-none">
                      {u.totalPoints}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-40 disabled:hover:bg-white/5 border border-white/10 transition-all"
              >
                ◀ Anterior
              </button>

              <span className="text-xs text-white/40 font-bold">
                Pág. {currentPage} de {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-40 disabled:hover:bg-white/5 border border-white/10 transition-all"
              >
                Siguiente ▶
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
//  Página Admin Principal
// ============================================================
export const AdminPage: React.FC = () => {
  const { matches, loadMatches, user } = useStore();
  const [adminPassword, setAdminPassword] = useState(() =>
    sessionStorage.getItem(ADMIN_PASSWORD_KEY) || ''
  );
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    sessionStorage.getItem(ADMIN_STORAGE_KEY) === 'true' && !!sessionStorage.getItem(ADMIN_PASSWORD_KEY)
  );
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeSection, setActiveSection] = useState<'sync' | 'update' | 'add' | 'users'>('sync');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  useEffect(() => {
    if (isAuthenticated && matches.length === 0) loadMatches();
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) { setPasswordError('Ingresa la contraseña'); return; }

    if (trimmed !== 'mundial2026') {
      setPasswordError('Contraseña incorrecta');
      return;
    }

    setAdminPassword(trimmed);
    sessionStorage.setItem(ADMIN_STORAGE_KEY, 'true');
    sessionStorage.setItem(ADMIN_PASSWORD_KEY, trimmed);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
    setIsAuthenticated(false);
    setPassword('');
    setAdminPassword('');
  };

  // === LOGIN ===
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen stadium-bg flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))', border: '1px solid rgba(251,191,36,0.3)' }}>
              <span className="text-4xl">🛡️</span>
            </div>
            <h1 className="font-display font-black text-2xl text-white">Panel Admin</h1>
            <p className="text-white/40 text-sm mt-1">Solo para administradores</p>
          </div>
          <div className="glass-card p-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="admin-password-input" className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Contraseña de Admin
                </label>
                <input id="admin-password-input" type="password" className="input-field"
                  placeholder="Contraseña..." value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }} autoFocus />
                {passwordError && <p className="text-red-400 text-xs mt-2 font-medium">{passwordError}</p>}
              </div>
              <Button id="admin-login-btn" type="submit" variant="gold" className="w-full">🔓 Acceder</Button>
            </form>
          </div>
          <p className="text-center text-white/20 text-xs mt-4">
            Contraseña definida en Code.gs → ADMIN_PASSWORD
          </p>
        </div>
      </div>
    );
  }

  // === PANEL ===
  const filteredMatches = matches.filter((m) => {
    if (selectedGroupFilter === 'all') return true;
    if (selectedGroupFilter === 'knockout') {
      return m.matchType !== 'group' && !m.matchType?.startsWith('group');
    }
    return m.group === selectedGroupFilter && (m.matchType === 'group' || m.matchType?.startsWith('group') || !m.matchType);
  });

  const liveMatches = filteredMatches.filter((m) => m.status === 'live');
  const upcomingMatches = filteredMatches.filter((m) => m.status === 'upcoming');
  const finishedMatches = filteredMatches.filter((m) => m.status === 'finished');

  const sections = [
    { id: 'sync' as const, label: '🔄 API Sync', badge: null },
    { id: 'update' as const, label: '📝 Resultados', badge: liveMatches.length + upcomingMatches.length || null },
    { id: 'add' as const, label: '➕ Agregar', badge: null },
    { id: 'users' as const, label: '👥 Usuarios', badge: null },
  ];

  return (
    <div className="min-h-screen stadium-bg">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 pt-6 pb-4"
        style={{ background: 'linear-gradient(to bottom, rgba(2,12,6,0.97) 0%, rgba(2,12,6,0.8) 100%)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display font-black text-2xl" style={{ color: '#fbbf24' }}>🛡️ Admin</h1>
              <p className="text-white/30 text-xs">{user?.firstName || user?.username} · {matches.length} partidos cargados</p>
            </div>
            <button id="admin-logout-btn" onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all border border-white/10">
              Salir
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {sections.map((s) => (
              <button key={s.id} id={`admin-tab-${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 relative ${activeSection === s.id
                  ? s.id === 'sync'
                    ? 'bg-verde-400/20 text-verde-400 border border-verde-400/30'
                    : 'bg-dorado-400/20 text-dorado-400 border border-dorado-400/30'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
              >
                {s.label}
                {s.badge !== null && s.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-dorado-500 text-black text-xs flex items-center justify-center font-black leading-none">
                    {s.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-32 max-w-lg mx-auto pt-4 space-y-4">
        {activeSection === 'sync' && <SyncPanel adminPassword={adminPassword} />}

        {activeSection === 'add' && <AddMatchForm adminPassword={adminPassword} />}

        {activeSection === 'users' && <UsersPanel adminPassword={adminPassword} />}

        {activeSection === 'update' && (
          <>
            {matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-6xl mb-4">🏟️</span>
                <p className="text-white/40">No hay partidos</p>
                <p className="text-white/20 text-sm mt-1">Ve a "🔄 API Sync" para cargar los partidos del Mundial</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Filtros de Grupos y Fases */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 mask-x">
                  {['all', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'knockout'].map((filterVal) => {
                    const label = filterVal === 'all' ? 'Todos' : filterVal === 'knockout' ? 'Fase Final' : `Grupo ${filterVal}`;
                    const isActive = selectedGroupFilter === filterVal;
                    return (
                      <button
                        key={filterVal}
                        onClick={() => setSelectedGroupFilter(filterVal)}
                        className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${isActive
                          ? 'bg-dorado-500/20 text-dorado-400 border-dorado-500/40 font-black'
                          : 'bg-white/3 text-white/40 border-white/5 hover:text-white/70 hover:bg-white/5'
                          }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {liveMatches.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping inline-block" />
                      En Vivo ({liveMatches.length})
                    </p>
                    {liveMatches.map((m) => <UpdateMatchForm key={m.matchId} match={m} adminPassword={adminPassword} />)}
                  </div>
                )}
                {upcomingMatches.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-white/30 uppercase tracking-wider">
                      Próximos ({upcomingMatches.length})
                    </p>
                    {upcomingMatches.map((m) => <UpdateMatchForm key={m.matchId} match={m} adminPassword={adminPassword} />)}
                  </div>
                )}
                {finishedMatches.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-white/30 uppercase tracking-wider">
                      Finalizados ({finishedMatches.length})
                    </p>
                    {finishedMatches.map((m) => <UpdateMatchForm key={m.matchId} match={m} adminPassword={adminPassword} />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
