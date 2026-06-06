// src/components/Leaderboard.tsx
import React from 'react';
import { useStore } from '../store/useStore';
import type { LeaderboardEntry } from '../types';

function getRankDisplay(position: number) {
  if (position === 1) return { emoji: '🥇', class: 'rank-1', label: 'Campeón' };
  if (position === 2) return { emoji: '🥈', class: 'rank-2', label: '2do lugar' };
  if (position === 3) return { emoji: '🥉', class: 'rank-3', label: '3er lugar' };
  return { emoji: String(position), class: 'bg-white/10 text-white/60', label: '' };
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl shimmer-bg">
      <div className="w-10 h-10 rounded-full bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-white/5" />
        <div className="h-3 w-16 rounded bg-white/5" />
      </div>
      <div className="h-8 w-16 rounded bg-white/5" />
    </div>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  animDelay: number;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ entry, isCurrentUser, animDelay }) => {
  const rank = getRankDisplay(entry.position);
  const isTop3 = entry.position <= 3;

  return (
    <div
      id={`leaderboard-row-${entry.userId}`}
      className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 animate-slide-up
        ${isCurrentUser
          ? 'border border-verde-400/40 bg-verde-400/5'
          : isTop3
          ? 'border border-white/10 glass-card'
          : 'border border-transparent hover:border-white/10 hover:bg-white/3'
        }`}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Posición */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-display font-black flex-shrink-0 ${rank.class}`}
      >
        {isTop3 ? rank.emoji : entry.position}
      </div>

      {/* Nombre */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-bold truncate ${isCurrentUser ? 'text-verde-400' : 'text-white'}`}>
            {entry.firstName || entry.username}
          </p>
          {isCurrentUser && (
            <span className="text-xs bg-verde-400/20 text-verde-400 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
              Tú
            </span>
          )}
        </div>
        {isTop3 && (
          <p className="text-xs text-white/40 mt-0.5">{rank.label}</p>
        )}
      </div>

      {/* Puntos */}
      <div className="flex flex-col items-end flex-shrink-0">
        <span
          className={`text-xl font-display font-black ${
            entry.position === 1
              ? 'text-dorado-400'
              : isCurrentUser
              ? 'text-verde-400'
              : 'text-white'
          }`}
        >
          {entry.totalPoints}
        </span>
        <span className="text-xs text-white/30 font-medium">
          {entry.totalPoints === 1 ? 'punto' : 'puntos'}
        </span>
      </div>
    </div>
  );
};

export const LeaderboardComponent: React.FC = () => {
  const { leaderboard, user } = useStore();
  const myEntry = user ? leaderboard.find((e) => e.userId === user.userId) : null;

  return (
    <div className="space-y-3">
      {/* Stats del usuario actual */}
      {myEntry && (
        <div
          className="glass-card p-5 mb-6 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.03))' }}
        >
          <p className="text-sm text-white/50 mb-1">Tu posición actual</p>
          <p className="text-5xl font-display font-black text-verde-400">
            #{myEntry.position}
          </p>
          <p className="text-sm text-white/40 mt-1">
            con <span className="text-white font-bold">{myEntry.totalPoints} puntos</span>
          </p>
        </div>
      )}

      {/* Lista */}
      {leaderboard.length === 0 ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : (
        leaderboard.map((entry, i) => (
          <LeaderboardRow
            key={entry.userId}
            entry={entry}
            isCurrentUser={user?.userId === entry.userId}
            animDelay={i * 60}
          />
        ))
      )}
    </div>
  );
};
