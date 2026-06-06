// src/components/MatchCard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { Match } from '../types';
import { getPointsResult } from '../types';
import { PointsBadge, StatusBadge } from './ui/Badge';
import { Button } from './ui/Button';

const FLAG_CODE_MAP: Record<string, string> = {
  'Alemania': 'de',
  'Argelia': 'dz',
  'Argentina': 'ar',
  'Arabia Saudita': 'sa',
  'Australia': 'au',
  'Austria': 'at',
  'Bélgica': 'be',
  'Bosnia y Herzegovina': 'ba',
  'Brasil': 'br',
  'Cabo Verde': 'cv',
  'Canadá': 'ca',
  'Catar': 'qa',
  'Colombia': 'co',
  'Corea del Sur': 'kr',
  'Costa de Marfil': 'ci',
  'Croacia': 'hr',
  'Curazao': 'cw',
  'República Checa': 'cz',
  'Ecuador': 'ec',
  'Egipto': 'eg',
  'Inglaterra': 'gb-eng',
  'Escocia': 'gb-sct',
  'España': 'es',
  'Estados Unidos': 'us',
  'Francia': 'fr',
  'Ghana': 'gh',
  'Haití': 'ht',
  'Irán': 'ir',
  'Irak': 'iq',
  'Japón': 'jp',
  'Jordania': 'jo',
  'México': 'mx',
  'Marruecos': 'ma',
  'República Democrática del Congo': 'cd',
  'Países Bajos': 'nl',
  'Nueva Zelanda': 'nz',
  'Noruega': 'no',
  'Panamá': 'pa',
  'Paraguay': 'py',
  'Portugal': 'pt',
  'Senegal': 'sn',
  'Sudáfrica': 'za',
  'Suecia': 'se',
  'Suiza': 'ch',
  'Turquía': 'tr',
  'Túnez': 'tn',
  'Uruguay': 'uy',
  'Uzbekistán': 'uz'
};

function getFlag(team: string): React.ReactNode {
  const code = FLAG_CODE_MAP[team];
  if (code) {
    return (
      <img
        src={`https://flagcdn.com/w80/${code}.png`}
        alt={`Bandera de ${team}`}
        className="w-9 h-6 object-cover rounded border border-white/10 shadow-sm inline-block"
        loading="lazy"
      />
    );
  }
  return <span className="text-2xl">🏆</span>;
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
  
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const checkHasStarted = () => {
      if (!match.matchDate || !match.matchTime) return false;
      // Convertir fecha de Colombia (UTC-5) a objeto Date absoluto
      const dateIsoStr = `${match.matchDate}T${match.matchTime}:00-05:00`;
      const kickoff = new Date(dateIsoStr);
      return Date.now() >= kickoff.getTime();
    };

    setHasStarted(checkHasStarted());
    const interval = setInterval(() => {
      setHasStarted(checkHasStarted());
    }, 30000); // Chequear cada 30 segundos

    return () => clearInterval(interval);
  }, [match]);

  const canPredict = !isFinished && !hasStarted;

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
      className={`glass-card-hover p-2.5 animate-slide-up transition-all duration-300 ${
        isFinished ? 'opacity-80' : ''
      } ${pointsResult === 'exact' ? 'border-dorado-400/40' : ''}`}
    >
      {/* Header: Grupo + Status */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-bold text-white/40 tracking-wider uppercase">
          Grupo {match.group}
        </span>
        <StatusBadge status={match.status} />
      </div>

      {/* Equipos y marcadores */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        {/* Local */}
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="animate-float" style={{ animationDelay: '0s' }}>
            {getFlag(match.homeTeam)}
          </span>
          <span className="text-[11px] font-bold text-white text-center leading-tight">
            {match.homeTeam}
          </span>
          {isFinished && (
            <span className="text-lg font-display font-black text-verde-400">
              {match.homeScore}
            </span>
          )}
        </div>

        {/* Centro */}
        <div className="flex flex-col items-center gap-0.5 min-w-[70px]">
          {isFinished ? (
            <span className="text-[8px] font-bold text-white/40">RESULTADO</span>
          ) : (
            <span className="text-[9px] text-white/30 font-medium text-center leading-none">
              {formatMatchDate(match.matchDate, match.matchTime)}
            </span>
          )}
          <span className="text-white/10 font-display font-black text-xs">VS</span>
          {isFinished && (
            <span className="text-[9px] text-white/30 font-medium text-center leading-none">
              {formatMatchDate(match.matchDate)}
            </span>
          )}
        </div>

        {/* Visitante */}
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="animate-float" style={{ animationDelay: '0.5s' }}>
            {getFlag(match.awayTeam)}
          </span>
          <span className="text-[11px] font-bold text-white text-center leading-tight">
            {match.awayTeam}
          </span>
          {isFinished && (
            <span className="text-lg font-display font-black text-verde-400">
              {match.awayScore}
            </span>
          )}
        </div>
      </div>

      {/* Separador */}
      <div className="h-px bg-white/5 mb-2.5" />

      {/* Predicción */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-white/40 text-center font-semibold uppercase tracking-wider">
          {isFinished ? 'Mi Predicción' : 'Tu Predicción'}
        </p>

        {/* Inputs de predicción */}
        <div className="flex items-center justify-center gap-3">
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

          <span className="text-white/30 font-display font-black text-xl">:</span>

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
          ) : !canPredict ? (
            prediction ? (
              <span className="text-xs text-white/50 font-semibold bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                🔒 Cerrado · Tu predicción: {prediction.homeScore} – {prediction.awayScore}
              </span>
            ) : (
              <span className="text-xs text-red-400/85 font-semibold bg-red-500/5 border border-red-500/10 px-3 py-1.5 rounded-xl">
                🔒 Cerrado · No predicho
              </span>
            )
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
