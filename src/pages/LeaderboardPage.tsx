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
          background: 'linear-gradient(to bottom, rgba(5,8,20,0.96) 0%, rgba(5,8,20,0.85) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="font-display font-black text-2xl text-white tracking-wide">
                🏆 Clasificación
              </h1>
              <p className="text-white/45 text-[11px] font-semibold mt-0.5 uppercase tracking-wider">
                {lastUpdated
                  ? `Actualizado ${lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Cargando...'}
              </p>
            </div>
            <button
              id="refresh-leaderboard-btn"
              onClick={handleLoad}
              disabled={refreshing}
              className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider text-verde-400 bg-verde-500/10 hover:bg-verde-500/20 active:scale-95 transition-all duration-200 border border-verde-400/20"
            >
              {refreshing ? '⟳ Cargando' : '↺ Refrescar'}
            </button>
          </div>
        </div>
      </div>

      {/* Podio Top 3 */}
      {leaderboard.length >= 3 && (
        <div className="px-4 max-w-lg mx-auto mb-8">
          <div className="flex items-end justify-center gap-3 pt-6 relative">
            {/* 2do lugar */}
            <div className="flex flex-col items-center gap-2.5 flex-1 z-10">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-display font-black border-3 bg-pitch-900 text-slate-200 transition-all duration-300"
                style={{ borderColor: '#cbd5e1', boxShadow: '0 4px 15px rgba(203,213,225,0.2)' }}
              >
                {leaderboard[1]?.firstName?.[0]?.toUpperCase() || leaderboard[1]?.username[0]?.toUpperCase()}
              </div>
              <div className="text-center w-full min-w-0">
                <p className="text-xs font-extrabold text-white truncate px-1">
                  {leaderboard[1]?.firstName || leaderboard[1]?.username}
                </p>
                <p className="text-[11px] font-display font-bold text-slate-400 mt-0.5">
                  {leaderboard[1]?.totalPoints} pts
                </p>
              </div>
              <div
                className="w-full rounded-t-2xl flex flex-col items-center justify-start pt-3 text-lg font-display font-black text-slate-300 border-t border-x"
                style={{
                  height: '80px',
                  borderColor: 'rgba(203,213,225,0.3)',
                  background: 'linear-gradient(to bottom, rgba(203,213,225,0.15), rgba(203,213,225,0.02))',
                }}
              >
                <span>🥈</span>
                <span className="text-[10px] font-extrabold tracking-widest text-slate-400/80 mt-1">2ND</span>
              </div>
            </div>

            {/* 1er lugar */}
            <div className="flex flex-col items-center gap-2.5 flex-1 -mb-1 z-20 relative">
              {/* Corona flotante */}
              <div className="animate-bounce absolute -top-7 text-xl drop-shadow-md select-none">
                👑
              </div>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-display font-black border-4 bg-pitch-900 text-dorado-300 transition-all duration-300"
                style={{
                  borderColor: '#ffd700',
                  boxShadow: '0 8px 25px rgba(255,215,0,0.35)',
                }}
              >
                {leaderboard[0]?.firstName?.[0]?.toUpperCase() || leaderboard[0]?.username[0]?.toUpperCase()}
              </div>
              <div className="text-center w-full min-w-0">
                <p className="text-sm font-black text-dorado-300 truncate px-1">
                  {leaderboard[0]?.firstName || leaderboard[0]?.username}
                </p>
                <p className="text-xs font-display font-black text-dorado-400 mt-0.5">
                  {leaderboard[0]?.totalPoints} pts
                </p>
              </div>
              <div
                className="w-full rounded-t-2xl flex flex-col items-center justify-start pt-4 text-2xl font-display font-black border-t border-x relative overflow-hidden"
                style={{
                  height: '115px',
                  borderColor: 'rgba(255,215,0,0.4)',
                  background: 'linear-gradient(to bottom, rgba(255,215,0,0.2), rgba(255,215,0,0.03))',
                  boxShadow: '0 -4px 25px rgba(255,215,0,0.1)',
                }}
              >
                <span>🥇</span>
                <span className="text-xs font-black tracking-widest text-dorado-400/80 mt-1.5">LEADER</span>
              </div>
            </div>

            {/* 3er lugar */}
            <div className="flex flex-col items-center gap-2.5 flex-1 z-10">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-display font-black border-3 bg-pitch-900 text-amber-600 transition-all duration-300"
                style={{ borderColor: '#b45309', boxShadow: '0 4px 15px rgba(180,83,9,0.2)' }}
              >
                {leaderboard[2]?.firstName?.[0]?.toUpperCase() || leaderboard[2]?.username[0]?.toUpperCase()}
              </div>
              <div className="text-center w-full min-w-0">
                <p className="text-xs font-extrabold text-white truncate px-1">
                  {leaderboard[2]?.firstName || leaderboard[2]?.username}
                </p>
                <p className="text-[11px] font-display font-bold text-amber-500 mt-0.5">
                  {leaderboard[2]?.totalPoints} pts
                </p>
              </div>
              <div
                className="w-full rounded-t-2xl flex flex-col items-center justify-start pt-3 text-lg font-display font-black text-amber-600 border-t border-x"
                style={{
                  height: '60px',
                  borderColor: 'rgba(180,83,9,0.3)',
                  background: 'linear-gradient(to bottom, rgba(180,83,9,0.15), rgba(180,83,9,0.02))',
                }}
              >
                <span>🥉</span>
                <span className="text-[10px] font-extrabold tracking-widest text-amber-600/80 mt-1">3RD</span>
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
