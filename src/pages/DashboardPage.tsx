// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { MatchCard } from '../components/MatchCard';

type FilterType = 'all' | 'upcoming' | 'live' | 'finished';

function MatchSkeleton() {
  return (
    <div className="glass-card p-5 space-y-4 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3 w-16 rounded shimmer-bg" />
        <div className="h-5 w-20 rounded-full shimmer-bg" />
      </div>
      <div className="flex justify-between items-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full shimmer-bg" />
          <div className="h-3 w-16 rounded shimmer-bg" />
        </div>
        <div className="h-6 w-8 rounded shimmer-bg" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full shimmer-bg" />
          <div className="h-3 w-16 rounded shimmer-bg" />
        </div>
      </div>
      <div className="h-px bg-white/5" />
      <div className="flex justify-center gap-3">
        <div className="w-14 h-14 rounded-xl shimmer-bg" />
        <div className="w-6 h-14 shimmer-bg rounded" />
        <div className="w-14 h-14 rounded-xl shimmer-bg" />
      </div>
    </div>
  );
}

export const DashboardPage: React.FC = () => {
  const { user, matches, predictions, loadMatches, loadPredictions, isLoading, logout } = useStore();
  const [filter, setFilter] = useState<FilterType>('all');
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

  const filteredMatches = matches.filter((m) => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const pendingCount = matches.filter((m) => {
    const hasPrediction = predictions.some((p) => p.matchId === m.matchId);
    return m.status === 'upcoming' && !hasPrediction;
  }).length;

  const filters: { id: FilterType; label: string; emoji: string }[] = [
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
        className="sticky top-0 z-40 px-4 pt-6 pb-4"
        style={{
          background: 'linear-gradient(to bottom, rgba(2,12,6,0.97) 0%, rgba(2,12,6,0.8) 100%)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-lg mx-auto">
          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/40 text-xs font-medium">¡Buenas,</p>
              <h1 className="font-display font-black text-xl text-white leading-tight">
                {user?.username} 👋
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Puntos totales */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
                  border: '1px solid rgba(251,191,36,0.3)',
                }}
              >
                <span className="text-dorado-400 text-lg">⭐</span>
                <div>
                  <p className="text-dorado-400 font-display font-black text-lg leading-none">
                    {user?.totalPoints ?? 0}
                  </p>
                  <p className="text-dorado-400/50 text-xs">pts</p>
                </div>
              </div>

              {/* Logout */}
              <button
                id="logout-btn"
                onClick={logout}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all duration-200"
                title="Salir"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-3 animate-fade-in"
              style={{
                background: 'rgba(251,191,36,0.1)',
                border: '1px solid rgba(251,191,36,0.25)',
              }}
            >
              <span className="text-dorado-400 text-sm">⚠️</span>
              <p className="text-dorado-400 text-xs font-semibold">
                Tienes {pendingCount} partido{pendingCount !== 1 ? 's' : ''} sin predecir
              </p>
            </div>
          )}

          {/* Filtros */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {filters.map((f) => {
              const count = f.id === 'all' ? matches.length : matches.filter(m => m.status === f.id).length;
              return (
                <button
                  key={f.id}
                  id={`filter-${f.id}`}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                    filter === f.id
                      ? 'bg-verde-400/20 text-verde-400 border border-verde-400/30'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  {f.emoji} {f.label}
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-xs ${
                        filter === f.id ? 'bg-verde-400/30 text-verde-400' : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Botón refrescar */}
            <button
              id="refresh-btn"
              onClick={handleRefresh}
              disabled={refreshing}
              className="ml-auto flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all duration-200"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              >
                <path
                  d="M4 12a8 8 0 018-8 8 8 0 017.7 5.9M20 12a8 8 0 01-8 8 8 8 0 01-7.7-5.9"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-32 max-w-lg mx-auto">
        {isInitialLoading ? (
          <div className="space-y-4 pt-4">
            {[...Array(4)].map((_, i) => <MatchSkeleton key={i} />)}
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-6xl mb-4">🏟️</span>
            <p className="text-white/40 font-medium">
              {filter === 'all'
                ? 'No hay partidos aún'
                : `No hay partidos ${filter === 'upcoming' ? 'próximos' : filter === 'live' ? 'en vivo' : 'finalizados'}`}
            </p>
            <p className="text-white/20 text-sm mt-1">El admin agregará partidos pronto</p>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {filteredMatches.map((match) => (
              <MatchCard key={match.matchId} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
