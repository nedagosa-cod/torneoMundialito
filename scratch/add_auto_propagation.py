import re

def main():
    # Load Code.gs
    with open('gas/Code.gs', 'r', encoding='utf-8') as f:
        code = f.read()

    # Define the new bracket propagation JS code
    bracket_js = """
// ============================================================
//  PROPAGACIÓN AUTOMÁTICA DE BRACKET Y CLASIFICADOS
// ============================================================

function getGroupStandings(matches, groupLetter) {
  const groupMatches = matches.filter(function(m) {
    return m.group === groupLetter && m.matchType === 'group';
  });

  const teamsMap = {};
  groupMatches.forEach(function(m) {
    if (m.homeTeam && m.homeTeam !== 'Por definir') teamsMap[m.homeTeam] = true;
    if (m.awayTeam && m.awayTeam !== 'Por definir') teamsMap[m.awayTeam] = true;
  });
  const teams = Object.keys(teamsMap);

  const stats = {};
  teams.forEach(function(t) {
    stats[t] = { team: t, group: groupLetter, points: 0, gd: 0, gf: 0, ga: 0, won: 0, played: 0 };
  });

  groupMatches.forEach(function(m) {
    if (m.status === 'finished' && m.homeScore !== null && m.awayScore !== null && m.homeScore !== '' && m.awayScore !== '') {
      const h = Number(m.homeScore);
      const a = Number(m.awayScore);
      const home = m.homeTeam;
      const away = m.awayTeam;

      if (stats[home] && stats[away]) {
        stats[home].played++;
        stats[away].played++;
        stats[home].gf += h;
        stats[home].ga += a;
        stats[home].gd += (h - a);
        stats[away].gf += a;
        stats[away].ga += h;
        stats[away].gd += (a - h);

        if (h > a) {
          stats[home].points += 3;
          stats[home].won++;
        } else if (a > h) {
          stats[away].points += 3;
          stats[away].won++;
        } else {
          stats[home].points += 1;
          stats[away].points += 1;
        }
      }
    }
  });

  const standings = Object.keys(stats).map(function(t) { return stats[t]; });
  standings.sort(function(x, y) {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return x.team.localeCompare(y.team);
  });

  return standings;
}

function getBestThirdPlacedTeams(matches) {
  const thirds = [];
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  groups.forEach(function(g) {
    const standings = getGroupStandings(matches, g);
    if (standings.length >= 3) {
      thirds.push(standings[2]);
    }
  });

  thirds.sort(function(x, y) {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return x.team.localeCompare(y.team);
  });

  return thirds.slice(0, 8);
}

function findMatching(teams, matches, currentIndex, currentMatching) {
  if (currentIndex === matches.length) {
    return currentMatching;
  }
  const match = matches[currentIndex];
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    if (currentMatching.indexOf(team) === -1) {
      if (match.acceptedGroups.indexOf(team.group) !== -1) {
        currentMatching.push(team);
        const result = findMatching(teams, matches, currentIndex + 1, currentMatching);
        if (result) return result;
        currentMatching.pop();
      }
    }
  }
  return null;
}

function assignThirdsToMatches(bestThirds) {
  const matchConfigs = [
    { matchId: 'API_74', acceptedGroups: ['A', 'B', 'C', 'D', 'F'] },
    { matchId: 'API_77', acceptedGroups: ['C', 'D', 'F', 'G', 'H'] },
    { matchId: 'API_79', acceptedGroups: ['C', 'E', 'F', 'H', 'I'] },
    { matchId: 'API_80', acceptedGroups: ['E', 'H', 'I', 'J', 'K'] },
    { matchId: 'API_81', acceptedGroups: ['B', 'E', 'F', 'I', 'J'] },
    { matchId: 'API_82', acceptedGroups: ['A', 'E', 'H', 'I', 'J'] },
    { matchId: 'API_85', acceptedGroups: ['E', 'F', 'G', 'I', 'J'] },
    { matchId: 'API_87', acceptedGroups: ['D', 'E', 'I', 'J', 'L'] }
  ];

  if (bestThirds.length < 8) return {};

  const matching = findMatching(bestThirds, matchConfigs, 0, []);
  const result = {};
  if (matching) {
    matchConfigs.forEach(function(cfg, idx) {
      result[cfg.matchId] = matching[idx].team;
    });
  }
  return result;
}

function autoPropagateTeams() {
  const matchSheet = getSheet(SHEET_MATCHES);
  const matches = sheetToObjects(matchSheet);
  const matchMap = {};
  matches.forEach(function(m) {
    matchMap[m.matchId] = m;
  });

  const groupStandings = {};
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  groups.forEach(function(g) {
    groupStandings[g] = getGroupStandings(matches, g);
  });

  const bestThirds = getBestThirdPlacedTeams(matches);
  const thirdPlaceAssignments = assignThirdsToMatches(bestThirds);

  const r32DirectConfigs = {
    'API_73': { home: { group: 'A', rank: 2 }, away: { group: 'B', rank: 2 } },
    'API_75': { home: { group: 'F', rank: 1 }, away: { group: 'C', rank: 2 } },
    'API_76': { home: { group: 'C', rank: 1 }, away: { group: 'F', rank: 2 } },
    'API_78': { home: { group: 'E', rank: 2 }, away: { group: 'I', rank: 2 } },
    'API_83': { home: { group: 'K', rank: 2 }, away: { group: 'L', rank: 2 } },
    'API_84': { home: { group: 'H', rank: 1 }, away: { group: 'J', rank: 2 } },
    'API_88': { home: { group: 'D', rank: 2 }, away: { group: 'G', rank: 2 } }
  };

  const r32ThirdConfigs = {
    'API_74': { home: { group: 'E', rank: 1 } },
    'API_77': { home: { group: 'I', rank: 1 } },
    'API_79': { home: { group: 'A', rank: 1 } },
    'API_80': { home: { group: 'L', rank: 1 } },
    'API_81': { home: { group: 'D', rank: 1 } },
    'API_82': { home: { group: 'G', rank: 1 } },
    'API_85': { home: { group: 'B', rank: 1 } },
    'API_87': { home: { group: 'K', rank: 1 } }
  };

  function getTeamByRank(group, rank) {
    const list = groupStandings[group] || [];
    if (list.length >= rank) {
      return list[rank - 1].team;
    }
    return null;
  }

  Object.keys(r32DirectConfigs).forEach(function(matchId) {
    const cfg = r32DirectConfigs[matchId];
    const homeTeam = getTeamByRank(cfg.home.group, cfg.home.rank);
    const awayTeam = getTeamByRank(cfg.away.group, cfg.away.rank);
    if (homeTeam) matchMap[matchId].homeTeam = homeTeam;
    if (awayTeam) matchMap[matchId].awayTeam = awayTeam;
  });

  Object.keys(r32ThirdConfigs).forEach(function(matchId) {
    const cfg = r32ThirdConfigs[matchId];
    const homeTeam = getTeamByRank(cfg.home.group, cfg.home.rank);
    if (homeTeam) matchMap[matchId].homeTeam = homeTeam;
    
    const assignedThird = thirdPlaceAssignments[matchId];
    if (assignedThird) {
      matchMap[matchId].awayTeam = assignedThird;
    }
  });

  const knockoutDependencies = {
    'API_89': { home: 'API_74', away: 'API_77' },
    'API_90': { home: 'API_73', away: 'API_75' },
    'API_91': { home: 'API_76', away: 'API_78' },
    'API_92': { home: 'API_79', away: 'API_80' },
    'API_93': { home: 'API_83', away: 'API_84' },
    'API_94': { home: 'API_81', away: 'API_82' },
    'API_95': { home: 'API_86', away: 'API_88' },
    'API_96': { home: 'API_85', away: 'API_87' },
    'API_97': { home: 'API_89', away: 'API_90' },
    'API_98': { home: 'API_93', away: 'API_94' },
    'API_99': { home: 'API_91', away: 'API_92' },
    'API_100': { home: 'API_95', away: 'API_96' },
    'API_101': { home: 'API_97', away: 'API_98' },
    'API_102': { home: 'API_99', away: 'API_100' },
    'API_103': { home: 'API_101', away: 'API_102', useLoser: true },
    'API_104': { home: 'API_101', away: 'API_102' }
  };

  function getKnockoutResult(matchId, getLoser) {
    const m = matchMap[matchId];
    if (m && m.status === 'finished' && m.homeScore !== null && m.awayScore !== null) {
      const hs = Number(m.homeScore);
      const as = Number(m.awayScore);
      if (hs > as) {
        return getLoser ? m.awayTeam : m.homeTeam;
      } else {
        return getLoser ? m.homeTeam : m.awayTeam;
      }
    }
    return null;
  }

  const knockoutOrder = [
    'API_89', 'API_90', 'API_91', 'API_92', 'API_93', 'API_94', 'API_95', 'API_96',
    'API_97', 'API_98', 'API_99', 'API_100',
    'API_101', 'API_102',
    'API_103', 'API_104'
  ];

  knockoutOrder.forEach(function(matchId) {
    const dep = knockoutDependencies[matchId];
    if (dep) {
      const homeTeam = getKnockoutResult(dep.home, false);
      const awayTeam = getKnockoutResult(dep.away, dep.useLoser || false);
      if (homeTeam) matchMap[matchId].homeTeam = homeTeam;
      if (awayTeam) matchMap[matchId].awayTeam = awayTeam;
    }
  });

  const headers = matchSheet.getDataRange().getValues()[0];
  const cols = {};
  headers.forEach(function(h, i) { cols[h] = i; });

  const dataRange = matchSheet.getDataRange();
  const values = dataRange.getValues();

  for (let i = 1; i < values.length; i++) {
    const matchId = values[i][cols.matchId];
    const m = matchMap[matchId];
    if (m) {
      matchSheet.getRange(i + 1, cols.homeTeam + 1).setValue(m.homeTeam);
      matchSheet.getRange(i + 1, cols.awayTeam + 1).setValue(m.awayTeam);
    }
  }
}
"""

    # Inject the call to autoPropagateTeams() inside recalculateAllUserPoints()
    # Looking for:
    # function recalculateAllUserPoints() {
    #   const matchSheet = getSheet(SHEET_MATCHES);
    target_pattern = r'function recalculateAllUserPoints\(\) \{\r?\n\s*const matchSheet = getSheet\(SHEET_MATCHES\);'
    replacement = 'function recalculateAllUserPoints() {\n  try {\n    autoPropagateTeams();\n  } catch (e) {\n    Logger.log("Error en autoPropagateTeams: " + e.message);\n  }\n  const matchSheet = getSheet(SHEET_MATCHES);'
    
    code = re.sub(target_pattern, replacement, code)

    # Append the new functions at the end of Code.gs
    code = code.strip() + "\n\n" + bracket_js.strip() + "\n"

    # Save Code.gs
    with open('gas/Code.gs', 'w', encoding='utf-8') as f:
        f.write(code)

    print("Successfully added auto-propagation bracket system to gas/Code.gs!")

if __name__ == "__main__":
    main()
