// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { MatchCard } from '../components/MatchCard';
import { GroupStandingsTable } from '../components/GroupStandingsTable';

type FilterType = 'all' | 'upcoming' | 'live' | 'finished';
type ViewMode = 'groups' | 'knockout' | 'calendar';

function MatchSkeleton() {
  return (
    <div className="glass-card p-3 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3 w-16 rounded shimmer-bg" />
        <div className="h-5 w-20 rounded-full shimmer-bg" />
      </div>
      <div className="flex justify-between items-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full shimmer-bg" />
          <div className="h-3 w-16 rounded shimmer-bg" />
        </div>
        <div className="h-5 w-6 rounded shimmer-bg" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full shimmer-bg" />
          <div className="h-3 w-16 rounded shimmer-bg" />
        </div>
      </div>
      <div className="h-px bg-white/5" />
      <div className="flex justify-center gap-3">
        <div className="w-11 h-11 rounded-xl shimmer-bg" />
        <div className="w-4 h-11 shimmer-bg rounded" />
        <div className="w-11 h-11 rounded-xl shimmer-bg" />
      </div>
    </div>
  );
}

const GROUPS_LIST = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const ROUNDS_LIST = [
  { id: 'r32', label: '16avos' },
  { id: 'r16', label: 'Octavos' },
  { id: 'qf', label: 'Cuartos' },
  { id: 'sf', label: 'Semis' },
  { id: 'final', label: 'Finales' },
];

export const DashboardPage: React.FC = () => {
  const { user, matches, predictions, loadMatches, loadPredictions, isLoading, logout } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('groups');
  const [activeGroup, setActiveGroup] = useState<string>('A');
  const [activeRound, setActiveRound] = useState<string>('r32');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showStandings, setShowStandings] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (matches.length === 0) {
      loadMatches();
    }
    if (predictions.length === 0) {
      loadPredictions();
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMatches(), loadPredictions()]);
    setRefreshing(false);
  };

  // Helper to count pending predictions in a group
  const getPendingInGroup = (groupLetter: string) => {
    return matches.filter(
      (m) =>
        m.group === groupLetter &&
        (!m.matchType || m.matchType === 'group' || GROUPS_LIST.includes(m.group)) &&
        m.status === 'upcoming' &&
        !predictions.some((p) => p.matchId === m.matchId)
    ).length;
  };

  // Helper to count pending predictions in a knockout round
  const getPendingInRound = (roundId: string) => {
    return matches.filter((m) => {
      const matchRound =
        roundId === 'final' ? m.matchType === 'final' || m.matchType === 'third' : m.matchType === roundId;
      return matchRound && m.status === 'upcoming' && !predictions.some((p) => p.matchId === m.matchId);
    }).length;
  };

  // Total pending count
  const pendingCount = matches.filter((m) => {
    const hasPrediction = predictions.some((p) => p.matchId === m.matchId);
    return m.status === 'upcoming' && !hasPrediction;
  }).length;

  // Filter matches based on active tab and sub-filters
  const filteredMatches = matches.filter((m) => {
    // 1. Filter by view mode (Groups / Knockout / Calendar)
    if (viewMode === 'groups') {
      const isGroup = !m.matchType || m.matchType === 'group' || GROUPS_LIST.includes(m.group);
      if (!isGroup || m.group !== activeGroup) return false;
    } else if (viewMode === 'knockout') {
      const matchRound =
        activeRound === 'final' ? m.matchType === 'final' || m.matchType === 'third' : m.matchType === activeRound;
      if (!matchRound) return false;
    }

    // 2. Filter by match status
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const calendarFilters: { id: FilterType; label: string; emoji: string }[] = [
    { id: 'all', label: 'Todos', emoji: '🌐' },
    { id: 'upcoming', label: 'Próximos', emoji: '🕐' },
    { id: 'live', label: 'En Vivo', emoji: '🔴' },
    { id: 'finished', label: 'Finalizados', emoji: '✓' },
  ];

  const isInitialLoading = isLoading && matches.length === 0;

  return (
    <div className="min-h-screen stadium-bg">
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 pt-4 pb-3"
        style={{
          background: 'linear-gradient(to bottom, rgba(2,12,6,0.97) 0%, rgba(2,12,6,0.8) 100%)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-lg mx-auto">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">Mundial 2026</p>
              <h1 className="font-display font-black text-lg text-white leading-tight">
                {user?.firstName || user?.username} 👋
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Puntos totales */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
                  border: '1px solid rgba(251,191,36,0.3)',
                }}
              >
                <span className="text-dorado-400 text-sm">⭐</span>
                <div>
                  <p className="text-dorado-400 font-display font-black text-sm leading-none">
                    {user?.totalPoints ?? 0}
                  </p>
                  <p className="text-dorado-400/50 text-[10px] leading-none">pts</p>
                </div>
              </div>

              {/* Botón refrescar */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all duration-200"
                title="Refrescar"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                >
                  <path
                    d="M4 12a8 8 0 018-8 8 8 0 017.7 5.9M20 12a8 8 0 01-8 8 8 8 0 01-7.7-5.9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {/* Logout */}
              <button
                id="logout-btn"
                onClick={logout}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all duration-200"
                title="Salir"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5">
                  <path
                    d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Alerta de predicciones pendientes */}
          {pendingCount > 0 && (
            <div
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl mb-3 animate-fade-in"
              style={{
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.2)',
              }}
            >
              <span className="text-dorado-400 text-xs">⚠️</span>
              <p className="text-dorado-400 text-[11px] font-bold">
                Tienes {pendingCount} prediccion{pendingCount !== 1 ? 'es' : 'ón'} pendiente{pendingCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Selector de Vista Principal (Segmented Control) */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-3">
            <button
              onClick={() => {
                setViewMode('groups');
                setFilter('all'); // Reset filter when switching main modes
              }}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 text-center ${
                viewMode === 'groups' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'
              }`}
            >
              🏆 Grupos
            </button>
            <button
              onClick={() => {
                setViewMode('knockout');
                setFilter('all');
              }}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 text-center ${
                viewMode === 'knockout' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'
              }`}
            >
              🌳 Fase Final
            </button>
            <button
              onClick={() => {
                setViewMode('calendar');
                setFilter('all');
              }}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 text-center ${
                viewMode === 'calendar' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'
              }`}
            >
              📅 Calendario
            </button>
          </div>

          {/* Sub-Navegación Dinámica según viewMode */}
          {viewMode === 'groups' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {GROUPS_LIST.map((g) => {
                const pending = getPendingInGroup(g);
                return (
                  <button
                    key={g}
                    onClick={() => {
                      setActiveGroup(g);
                      setShowStandings(false);
                    }}
                    className={`relative px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 flex-shrink-0 ${
                      activeGroup === g
                        ? 'bg-verde-400/20 text-verde-400 border border-verde-400/30'
                        : 'bg-white/5 text-white/40 border border-transparent hover:text-white/70'
                    }`}
                  >
                    Grupo {g}
                    {pending > 0 && (
                      <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-dorado-400 rounded-full animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === 'knockout' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {ROUNDS_LIST.map((r) => {
                const pending = getPendingInRound(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRound(r.id)}
                    className={`relative px-3.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 flex-shrink-0 ${
                      activeRound === r.id
                        ? 'bg-verde-400/20 text-verde-400 border border-verde-400/30'
                        : 'bg-white/5 text-white/40 border border-transparent hover:text-white/70'
                    }`}
                  >
                    {r.label}
                    {pending > 0 && (
                      <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-dorado-400 rounded-full animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {calendarFilters.map((f) => {
                const count =
                  f.id === 'all' ? matches.length : matches.filter((m) => m.status === f.id).length;
                return (
                  <button
                    key={f.id}
                    id={`filter-${f.id}`}
                    onClick={() => setFilter(f.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                      filter === f.id
                        ? 'bg-verde-400/20 text-verde-400 border border-verde-400/30'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                    }`}
                  >
                    {f.emoji} {f.label}
                    {count > 0 && (
                      <span
                        className={`ml-1 px-1 py-0.2 rounded-full text-[9px] ${
                          filter === f.id ? 'bg-verde-400/30 text-verde-400' : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-32 max-w-lg mx-auto">
        {/* Tabla de posiciones desplegable en modo grupos */}
        {viewMode === 'groups' && !isInitialLoading && (
          <div className="mb-3 pt-2">
            <button
              onClick={() => setShowStandings(!showStandings)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 text-xs font-bold text-white/70 hover:text-white"
            >
              <span className="flex items-center gap-1.5">
                📊 Tabla de Posiciones — Grupo {activeGroup}
              </span>
              <span className="text-white/40 font-mono text-[9px]">
                {showStandings ? 'Ocultar ▼' : 'Ver Tabla ▲'}
              </span>
            </button>

            {showStandings && (
              <div className="mt-2.5 animate-fade-in">
                <GroupStandingsTable matches={matches} groupLetter={activeGroup} />
              </div>
            )}
          </div>
        )}

        {isInitialLoading ? (
          <div className="space-y-3 pt-3">
            {[...Array(4)].map((_, i) => (
              <MatchSkeleton key={i} />
            ))}
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center glass-card p-6 mt-3 animate-fade-in">
            <span className="text-5xl mb-3">🏟️</span>
            <p className="text-white/40 font-medium text-sm">
              {filter === 'all'
                ? 'No hay partidos en esta sección'
                : `No hay partidos ${
                    filter === 'upcoming' ? 'próximos' : filter === 'live' ? 'en vivo' : 'finalizados'
                  }`}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-3">
            {filteredMatches.map((match) => (
              <MatchCard key={match.matchId} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
