import React from 'react';
import type { Match } from '../types';

interface GroupStandingsTableProps {
  matches: Match[];
  groupLetter: string;
}

interface TeamStats {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export const GroupStandingsTable: React.FC<GroupStandingsTableProps> = ({ matches, groupLetter }) => {
  // 1. Filtrar partidos del grupo de tipo fase de grupos
  const groupMatches = matches.filter(
    (m) =>
      m.group === groupLetter &&
      (!m.matchType || m.matchType === 'group' || ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].includes(m.group))
  );

  // 2. Extraer equipos del grupo
  const teamsMap: Record<string, boolean> = {};
  groupMatches.forEach((m) => {
    if (m.homeTeam && m.homeTeam !== 'Por definir' && m.homeTeam !== 'Por jugar') teamsMap[m.homeTeam] = true;
    if (m.awayTeam && m.awayTeam !== 'Por definir' && m.awayTeam !== 'Por jugar') teamsMap[m.awayTeam] = true;
  });
  const teams = Object.keys(teamsMap);

  // 3. Inicializar estadísticas
  const stats: Record<string, TeamStats> = {};
  teams.forEach((t) => {
    stats[t] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  });

  // 4. Acumular estadísticas de partidos jugados
  groupMatches.forEach((m) => {
    if (
      m.status === 'finished' &&
      m.homeScore !== null &&
      m.awayScore !== null &&
      m.homeScore !== undefined &&
      m.awayScore !== undefined
    ) {
      const h = Number(m.homeScore);
      const a = Number(m.awayScore);
      const home = m.homeTeam;
      const away = m.awayTeam;

      if (stats[home] && stats[away]) {
        stats[home].played++;
        stats[away].played++;
        stats[home].gf += h;
        stats[home].ga += a;
        stats[home].gd += h - a;
        stats[away].gf += a;
        stats[away].ga += h;
        stats[away].gd += a - h;

        if (h > a) {
          stats[home].points += 3;
          stats[home].won++;
          stats[away].lost++;
        } else if (a > h) {
          stats[away].points += 3;
          stats[away].won++;
          stats[home].lost++;
        } else {
          stats[home].points += 1;
          stats[home].drawn++;
          stats[away].points += 1;
          stats[away].drawn++;
        }
      }
    }
  });

  // 5. Convertir a array y ordenar
  const standings = Object.values(stats).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return x.team.localeCompare(y.team);
  });

  if (standings.length === 0) {
    return (
      <div className="p-3 text-center text-xs text-white/40 italic">
        No hay datos de posiciones para este grupo
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-white/10 text-white/40 font-bold border-b border-white/10 text-[10px] uppercase tracking-wider">
            <th className="py-2 px-3 text-center w-8">#</th>
            <th className="py-2 px-3">Equipo</th>
            <th className="py-2 px-2 text-center w-8">PJ</th>
            <th className="py-2 px-2 text-center w-6">G</th>
            <th className="py-2 px-2 text-center w-6">E</th>
            <th className="py-2 px-2 text-center w-6">P</th>
            <th className="py-2 px-2 text-center hidden sm:table-cell w-10 border-r border-white/5">GF:GC</th>
            <th className="py-2 px-2 text-center w-8 border-r border-white/5">DG</th>
            <th className="py-2 px-3 text-center w-10 text-white font-black">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, idx) => {
            const isQualifyingDirect = idx < 2; // Top 2 clasificados directos
            return (
              <tr
                key={row.team}
                className={`border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${
                  isQualifyingDirect ? 'bg-verde-500/5' : ''
                }`}
              >
                <td className="py-2 px-3 text-center font-bold text-white/40">
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                      isQualifyingDirect
                        ? 'bg-verde-500/20 text-verde-400 font-extrabold'
                        : 'bg-white/5 text-white/40 font-medium'
                    }`}
                  >
                    {idx + 1}
                  </span>
                </td>
                <td className="py-2 px-3 font-semibold text-white truncate max-w-[120px]">
                  {row.team}
                </td>
                <td className="py-2 px-2 text-center text-white/70">{row.played}</td>
                <td className="py-2 px-2 text-center text-white/50">{row.won}</td>
                <td className="py-2 px-2 text-center text-white/50">{row.drawn}</td>
                <td className="py-2 px-2 text-center text-white/50">{row.lost}</td>
                <td className="py-2 px-2 text-center text-white/40 hidden sm:table-cell border-r border-white/5">
                  {row.gf}:{row.ga}
                </td>
                <td
                  className={`py-2 px-2 text-center font-bold border-r border-white/5 ${
                    row.gd > 0 ? 'text-verde-400' : row.gd < 0 ? 'text-red-400' : 'text-white/40'
                  }`}
                >
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td className="py-2 px-3 text-center font-display font-black text-white bg-white/5">
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
