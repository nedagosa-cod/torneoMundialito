// src/pages/AdminPage.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { apiSyncMatches, apiGetSyncStatus } from '../api/api';
import type { Match, SyncStatus } from '../types';

const ADMIN_STORAGE_KEY = 'polla-admin-auth';

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
              <span className="text-xs font-bold text-verde-400">Manual / Sheets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info sobre el auto-sync */}
      <div className="px-3 py-2.5 rounded-xl bg-white/3 border border-white/5">
        <p className="text-xs text-white/40 leading-relaxed">
          🔗 Fuente de Datos: <span className="text-verde-400/70 font-mono text-xs">Google Sheets (Matches)</span>
          <br />
          Toda la información se lee directamente desde tu Google Sheet. Si modificas marcadores en el Excel, presiona el botón de abajo para actualizar la tabla de posiciones en tiempo real.
        </p>
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
          '🏆 Recalcular Puntos (Google Sheets)'
        )}
      </button>

      {/* Resultado */}
      {lastResult && (
        <div
          className={`px-4 py-3 rounded-xl border animate-slide-up ${
            lastResult.ok
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

      {/* Instrucción del trigger GAS */}
      <div className="px-3 py-3 rounded-xl space-y-3" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
        <div>
          <p className="text-dorado-400 text-xs font-bold mb-1">📝 Gestión desde Google Sheets</p>
          <p className="text-white/35 text-xs leading-relaxed">
            Ingresa los resultados en las columnas <code className="text-dorado-400/80 font-mono">homeScore</code> y <code className="text-dorado-400/80 font-mono">awayScore</code> de la hoja <strong>Matches</strong>, y cambia la columna <code className="text-dorado-400/80 font-mono">status</code> a <code className="text-dorado-400/80 font-mono">finished</code>. Luego haz clic en el botón superior para calcular los puntos.
          </p>
        </div>
        
        <div className="pt-2 border-t border-white/5">
          <p className="text-dorado-400 text-xs font-bold mb-1">⚡ Carga Inicial (Datos en Español y Horario Colombia)</p>
          <p className="text-white/35 text-xs leading-relaxed">
            Para poblar los 104 partidos por primera vez, abre tu Google Sheet, ve al menú superior <strong>🏆 Polla Mundial</strong> y selecciona <strong>Cargar Partidos (Datos Iniciales)</strong>. Esto creará el fixture oficial traducido y adaptado a la hora de Colombia.
          </p>
        </div>
      </div>
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setHomeTeam(match.homeTeam);
    setAwayTeam(match.awayTeam);
    setHomeScore(match.homeScore !== null ? String(match.homeScore) : '');
    setAwayScore(match.awayScore !== null ? String(match.awayScore) : '');
    setStatus(match.status);
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
        <span className="text-xs text-white/20">{match.matchDate} {match.matchTime}</span>
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
        <div>
          {isLocked && (
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 border border-white/10 transition-all font-semibold"
            >
              🔓 Auto-calcular
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
            {['A','B','C','D','E','F','G','H','I','J','K','L','R32','R16','QF','SF','3RD','FINAL'].map(
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
//  Página Admin Principal
// ============================================================
export const AdminPage: React.FC = () => {
  const { matches, loadMatches, user } = useStore();
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    sessionStorage.getItem(ADMIN_STORAGE_KEY) === 'true'
  );
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [activeSection, setActiveSection] = useState<'sync' | 'update' | 'add'>('sync');

  useEffect(() => {
    if (isAuthenticated && matches.length === 0) loadMatches();
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) { setPasswordError('Ingresa la contraseña'); return; }
    setAdminPassword(password);
    sessionStorage.setItem(ADMIN_STORAGE_KEY, 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
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
  const liveMatches      = matches.filter((m) => m.status === 'live');
  const upcomingMatches  = matches.filter((m) => m.status === 'upcoming');
  const finishedMatches  = matches.filter((m) => m.status === 'finished');

  const sections = [
    { id: 'sync' as const,   label: '🔄 API Sync',  badge: null },
    { id: 'update' as const, label: '📝 Resultados', badge: liveMatches.length + upcomingMatches.length || null },
    { id: 'add' as const,    label: '➕ Agregar',    badge: null },
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
              <p className="text-white/30 text-xs">{user?.username} · {matches.length} partidos cargados</p>
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
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 relative ${
                  activeSection === s.id
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
                    {upcomingMatches.slice(0, 20).map((m) => <UpdateMatchForm key={m.matchId} match={m} adminPassword={adminPassword} />)}
                    {upcomingMatches.length > 20 && (
                      <p className="text-xs text-white/20 text-center">+{upcomingMatches.length - 20} partidos más...</p>
                    )}
                  </div>
                )}
                {finishedMatches.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-white/30 uppercase tracking-wider">
                      Finalizados ({finishedMatches.length})
                    </p>
                    {finishedMatches.slice(0, 10).map((m) => <UpdateMatchForm key={m.matchId} match={m} adminPassword={adminPassword} />)}
                    {finishedMatches.length > 10 && (
                      <p className="text-xs text-white/20 text-center">+{finishedMatches.length - 10} más...</p>
                    )}
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
