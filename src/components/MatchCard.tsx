// src/components/MatchCard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { Match } from '../types';
import { getPointsResult } from '../types';
import { PointsBadge, StatusBadge } from './ui/Badge';
import { Button } from './ui/Button';

// Mapa de banderas por equipo (emojis)
const FLAG_MAP: Record<string, string> = {
  Argentina: '🇦🇷', Brazil: '🇧🇷', France: '🇫🇷', Germany: '🇩🇪',
  Spain: '🇪🇸', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Italy: '🇮🇹', Belgium: '🇧🇪', Uruguay: '🇺🇾', Colombia: '🇨🇴',
  Mexico: '🇲🇽', USA: '🇺🇸', Japan: '🇯🇵', Morocco: '🇲🇦',
  Senegal: '🇸🇳', Croatia: '🇭🇷', Poland: '🇵🇱', Switzerland: '🇨🇭',
  Denmark: '🇩🇰', Sweden: '🇸🇪', Chile: '🇨🇱', Ecuador: '🇪🇨',
  Peru: '🇵🇪', Venezuela: '🇻🇪', Bolivia: '🇧🇴', Paraguay: '🇵🇾',
  Australia: '🇦🇺', 'South Korea': '🇰🇷', Qatar: '🇶🇦', 'Saudi Arabia': '🇸🇦',
  Canada: '🇨🇦', 'New Zealand': '🇳🇿', Ghana: '🇬🇭', Nigeria: '🇳🇬',
};

function getFlag(team: string): string {
  return FLAG_MAP[team] || '🏳️';
}

function formatMatchDate(dateStr: string, timeStr?: string): string {
  try {
    const date = new Date(dateStr + (timeStr ? `T${timeStr}` : ''));
    return date.toLocaleDateString('es-ES', {
      weekday: 'short', month: 'short', day: 'numeric',
    }) + (timeStr ? ` · ${timeStr}` : '');
  } catch {
    return dateStr;
  }
}

// Efecto confetti al acertar exactamente
function launchConfetti() {
  const colors = ['#fbbf24', '#22c55e', '#f59e0b', '#16a34a', '#ffffff'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-20px';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay = Math.random() * 0.5 + 's';
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}

interface MatchCardProps {
  match: Match;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const { predictions, drafts, setDraft, savePrediction } = useStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const prediction = predictions.find((p) => p.matchId === match.matchId);
  const draft = drafts[match.matchId];

  // Inicializar draft con predicción existente si hay
  const homeVal = draft?.homeScore ?? (prediction ? String(prediction.homeScore) : '');
  const awayVal = draft?.awayScore ?? (prediction ? String(prediction.awayScore) : '');

  const pointsResult = getPointsResult(prediction?.points ?? null);
  const isFinished = match.status === 'finished';
  const canPredict = !isFinished;

  // Mostrar confetti si acertó exacto
  useEffect(() => {
    if (pointsResult === 'exact') {
      launchConfetti();
    }
  }, [pointsResult]);

  const handleSave = async () => {
    const h = parseInt(homeVal);
    const a = parseInt(awayVal);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;

    setSaving(true);
    const ok = await savePrediction(match.matchId, h, a);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const hasDraftChanged =
    prediction
      ? homeVal !== String(prediction.homeScore) || awayVal !== String(prediction.awayScore)
      : homeVal !== '' || awayVal !== '';

  const canSave = canPredict && homeVal !== '' && awayVal !== '' && hasDraftChanged;

  return (
    <div
      id={`match-card-${match.matchId}`}
      className={`glass-card-hover p-5 animate-slide-up transition-all duration-300 ${
        isFinished ? 'opacity-80' : ''
      } ${pointsResult === 'exact' ? 'border-dorado-400/40' : ''}`}
    >
      {/* Header: Grupo + Status */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-white/40 tracking-widest uppercase">
          Grupo {match.group}
        </span>
        <StatusBadge status={match.status} />
      </div>

      {/* Equipos y marcadores */}
      <div className="flex items-center justify-between gap-3 mb-5">
        {/* Local */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <span className="text-4xl animate-float" style={{ animationDelay: '0s' }}>
            {getFlag(match.homeTeam)}
          </span>
          <span className="text-sm font-bold text-white text-center leading-tight">
            {match.homeTeam}
          </span>
          {isFinished && (
            <span className="text-2xl font-display font-black text-verde-400">
              {match.homeScore}
            </span>
          )}
        </div>

        {/* Centro */}
        <div className="flex flex-col items-center gap-2 min-w-[80px]">
          {isFinished ? (
            <span className="text-xs font-bold text-white/40">RESULTADO</span>
          ) : (
            <span className="text-xs text-white/30 font-medium text-center">
              {formatMatchDate(match.matchDate, match.matchTime)}
            </span>
          )}
          <span className="text-white/20 font-display font-black text-xl">VS</span>
          {isFinished && (
            <span className="text-xs text-white/30 font-medium text-center">
              {formatMatchDate(match.matchDate)}
            </span>
          )}
        </div>

        {/* Visitante */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <span className="text-4xl animate-float" style={{ animationDelay: '0.5s' }}>
            {getFlag(match.awayTeam)}
          </span>
          <span className="text-sm font-bold text-white text-center leading-tight">
            {match.awayTeam}
          </span>
          {isFinished && (
            <span className="text-2xl font-display font-black text-verde-400">
              {match.awayScore}
            </span>
          )}
        </div>
      </div>

      {/* Separador */}
      <div className="h-px bg-white/5 mb-4" />

      {/* Predicción */}
      <div className="space-y-3">
        <p className="text-xs text-white/40 text-center font-semibold uppercase tracking-wider">
          {isFinished ? 'Mi Predicción' : 'Tu Predicción'}
        </p>

        {/* Inputs de predicción */}
        <div className="flex items-center justify-center gap-4">
          <input
            id={`pred-home-${match.matchId}`}
            type="number"
            min="0"
            max="99"
            className="score-input"
            placeholder="0"
            value={homeVal}
            onChange={(e) => setDraft(match.matchId, e.target.value, awayVal)}
            disabled={!canPredict}
            aria-label={`Goles ${match.homeTeam}`}
          />

          <span className="text-white/30 font-display font-black text-2xl">:</span>

          <input
            id={`pred-away-${match.matchId}`}
            type="number"
            min="0"
            max="99"
            className="score-input"
            placeholder="0"
            value={awayVal}
            onChange={(e) => setDraft(match.matchId, homeVal, e.target.value)}
            disabled={!canPredict}
            aria-label={`Goles ${match.awayTeam}`}
          />
        </div>

        {/* Badge de puntos o botón guardar */}
        <div className="flex items-center justify-center">
          {isFinished && prediction ? (
            <PointsBadge points={prediction.points} result={pointsResult} large />
          ) : isFinished ? (
            <span className="text-xs text-white/30 italic">No predijiste este partido</span>
          ) : saved ? (
            <span className="text-verde-400 text-sm font-bold flex items-center gap-1 animate-bounce-in">
              ✓ ¡Predicción guardada!
            </span>
          ) : (
            <Button
              id={`save-pred-${match.matchId}`}
              variant="primary"
              size="sm"
              loading={saving}
              disabled={!canSave}
              onClick={handleSave}
              className="w-full max-w-xs"
            >
              {prediction && !hasDraftChanged ? '✓ Guardado' : '💾 Guardar Predicción'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
