// src/components/ui/Badge.tsx
import React from 'react';
import type { PointsResult } from '../../types';

interface PointsBadgeProps {
  points: number | null;
  result: PointsResult;
  large?: boolean;
}

export const PointsBadge: React.FC<PointsBadgeProps> = ({ points, result, large = false }) => {
  if (result === null) return null;

  const sizeClass = large ? 'text-sm px-4 py-2' : 'text-xs px-3 py-1';

  if (result === 'exact') {
    return (
      <span className={`badge-exact ${sizeClass} animate-bounce-in`}>
        🥇 {points} pts
      </span>
    );
  }
  if (result === 'outcome') {
    return (
      <span className={`badge-outcome ${sizeClass} animate-bounce-in`}>
        ⚽ {points} pt
      </span>
    );
  }
  return (
    <span className={`badge-miss ${sizeClass}`}>
      ❌ 0 pts
    </span>
  );
};

interface StatusBadgeProps {
  status: 'upcoming' | 'live' | 'finished';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping inline-block" />
        EN VIVO
      </span>
    );
  }
  if (status === 'finished') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-white/50">
        ✓ FINALIZADO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-dorado-400/10 text-dorado-400 border border-dorado-400/30">
      🕐 PRÓXIMO
    </span>
  );
};
