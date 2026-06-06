// src/pages/LeaderboardPage.tsx
import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { LeaderboardComponent } from '../components/Leaderboard';

export const LeaderboardPage: React.FC = () => {
  const { leaderboard, loadLeaderboard } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    handleLoad();
  }, []);

  const handleLoad = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setLastUpdated(new Date());
    setRefreshing(false);
  };
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
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="font-display font-black text-2xl text-white">
                🏆 Ranking
              </h1>
              <p className="text-white/30 text-xs mt-0.5">
                {lastUpdated
                  ? `Actualizado ${lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Cargando...'}
              </p>
            </div>
            <button
              id="refresh-leaderboard-btn"
              onClick={handleLoad}
              disabled={refreshing}
              className="px-4 py-2 rounded-xl text-xs font-bold text-verde-400 bg-verde-400/10 hover:bg-verde-400/20 transition-all duration-200 border border-verde-400/20"
            >
              {refreshing ? '⟳ ...' : '↺ Actualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Podio Top 3 */}
      {leaderboard.length >= 3 && (
        <div className="px-4 max-w-lg mx-auto mb-6">
          <div className="flex items-end justify-center gap-3 pt-4">
            {/* 2do lugar */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-display font-black border-2"
                style={{ borderColor: '#94a3b8', background: 'rgba(148,163,184,0.1)' }}
              >
                {leaderboard[1]?.firstName?.[0]?.toUpperCase() || leaderboard[1]?.username[0]?.toUpperCase()}
              </div>
              <p className="text-xs font-bold text-white/70 truncate w-full text-center">
                {leaderboard[1]?.firstName || leaderboard[1]?.username}
              </p>
              <p className="text-sm font-display font-black" style={{ color: '#94a3b8' }}>
                {leaderboard[1]?.totalPoints} pts
              </p>
              <div
                className="w-full rounded-t-xl flex items-center justify-center py-3 text-2xl font-display font-black"
                style={{ height: '70px', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)' }}
              >
                🥈
              </div>
            </div>

            {/* 1er lugar */}
            <div className="flex flex-col items-center gap-2 flex-1 -mb-1">
              <div className="animate-pulse-gold w-5 h-5 rounded-full flex items-center justify-center text-xs">
                👑
              </div>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-display font-black border-2"
                style={{
                  borderColor: '#fbbf24',
                  background: 'rgba(251,191,36,0.15)',
                  boxShadow: '0 0 20px rgba(251,191,36,0.4)',
                }}
              >
                {leaderboard[0]?.firstName?.[0]?.toUpperCase() || leaderboard[0]?.username[0]?.toUpperCase()}
              </div>
              <p className="text-sm font-bold text-dorado-400 truncate w-full text-center">
                {leaderboard[0]?.firstName || leaderboard[0]?.username}
              </p>
              <p className="text-base font-display font-black text-dorado-400">
                {leaderboard[0]?.totalPoints} pts
              </p>
              <div
                className="w-full rounded-t-xl flex items-center justify-center py-3 text-2xl font-display font-black"
                style={{
                  height: '95px',
                  background: 'linear-gradient(to bottom, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
                  border: '1px solid rgba(251,191,36,0.3)',
                }}
              >
                🥇
              </div>
            </div>

            {/* 3er lugar */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-display font-black border-2"
                style={{ borderColor: '#cd7f32', background: 'rgba(205,127,50,0.1)' }}
              >
                {leaderboard[2]?.firstName?.[0]?.toUpperCase() || leaderboard[2]?.username[0]?.toUpperCase()}
              </div>
              <p className="text-xs font-bold text-white/70 truncate w-full text-center">
                {leaderboard[2]?.firstName || leaderboard[2]?.username}
              </p>
              <p className="text-sm font-display font-black" style={{ color: '#cd7f32' }}>
                {leaderboard[2]?.totalPoints} pts
              </p>
              <div
                className="w-full rounded-t-xl flex items-center justify-center py-3 text-2xl font-display font-black"
                style={{ height: '55px', background: 'rgba(205,127,50,0.1)', border: '1px solid rgba(205,127,50,0.2)' }}
              >
                🥉
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista completa */}
      <div className="px-4 pb-32 max-w-lg mx-auto">
        {leaderboard.length > 3 && (
          <p className="text-xs text-white/30 font-semibold uppercase tracking-wider mb-3 text-center">
            Clasificación completa
          </p>
        )}
        <LeaderboardComponent />

        {leaderboard.length === 0 && !refreshing && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-6xl mb-4">📊</span>
            <p className="text-white/40 font-medium">El ranking está vacío</p>
            <p className="text-white/20 text-sm mt-1">¡Sé el primero en predecir!</p>
          </div>
        )}
      </div>
    </div>
  );
};
