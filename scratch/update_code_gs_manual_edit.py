import re

def main():
    # Load Code.gs
    with open('gas/Code.gs', 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Update doPost call
    # Replace:
    # if (action === 'updateMatch')    return handleUpdateMatch(body.matchId, body.homeScore, body.awayScore, body.adminPassword);
    # with:
    # if (action === 'updateMatch')    return handleUpdateMatch(body);
    
    code = re.sub(
        r'if \(action === \'updateMatch\'\)\s*return handleUpdateMatch\(body\.matchId, body\.homeScore, body\.awayScore, body\.adminPassword\);',
        'if (action === \'updateMatch\')    return handleUpdateMatch(body);',
        code
    )

    # 2. Replace handleUpdateMatch(matchId, homeScore, awayScore, adminPassword) function
    new_handle_update = """function handleUpdateMatch(body) {
  const adminPassword = body.adminPassword;
  if (adminPassword !== ADMIN_PASSWORD) return buildError('Contraseña incorrecta', 403);

  const matchId = body.matchId;
  if (!matchId) return buildError('matchId requerido', 400);

  const matchSheet = getSheet(SHEET_MATCHES);
  const matchData = matchSheet.getDataRange().getValues();
  const headers = matchData[0];
  const cols = {
    matchId:   headers.indexOf('matchId'),
    homeTeam:  headers.indexOf('homeTeam'),
    awayTeam:  headers.indexOf('awayTeam'),
    homeScore: headers.indexOf('homeScore'),
    awayScore: headers.indexOf('awayScore'),
    status:    headers.indexOf('status'),
    matchType: headers.indexOf('matchType')
  };

  let matchRowNum = -1;
  for (let i = 1; i < matchData.length; i++) {
    if (matchData[i][cols.matchId] === matchId) { matchRowNum = i + 1; break; }
  }
  if (matchRowNum === -1) return buildError('Partido no encontrado', 404);

  const currentMatch = sheetToObjects(matchSheet).find(function(m) { return m.matchId === matchId; });
  let matchType = currentMatch ? currentMatch.matchType : '';

  // Bloquear partido si el usuario cambia el equipo manualmente
  if ((body.homeTeam !== undefined || body.awayTeam !== undefined) && matchType && matchType.indexOf('_locked') === -1) {
    matchType = matchType + '_locked';
    matchSheet.getRange(matchRowNum, cols.matchType + 1).setValue(matchType);
  }

  // Desbloquear si se solicita explícitamente
  if (body.unlock === true && matchType && matchType.indexOf('_locked') !== -1) {
    matchType = matchType.replace('_locked', '');
    matchSheet.getRange(matchRowNum, cols.matchType + 1).setValue(matchType);
  }

  // Actualizar equipos
  if (body.homeTeam !== undefined && body.homeTeam !== null && body.homeTeam !== '') {
    matchSheet.getRange(matchRowNum, cols.homeTeam + 1).setValue(body.homeTeam);
  }
  if (body.awayTeam !== undefined && body.awayTeam !== null && body.awayTeam !== '') {
    matchSheet.getRange(matchRowNum, cols.awayTeam + 1).setValue(body.awayTeam);
  }

  // Actualizar marcadores (admitir vacíos para reiniciar partido)
  if (body.homeScore !== undefined) {
    const val = (body.homeScore === null || body.homeScore === '') ? null : Number(body.homeScore);
    matchSheet.getRange(matchRowNum, cols.homeScore + 1).setValue(val);
  }
  if (body.awayScore !== undefined) {
    const val = (body.awayScore === null || body.awayScore === '') ? null : Number(body.awayScore);
    matchSheet.getRange(matchRowNum, cols.awayScore + 1).setValue(val);
  }

  // Actualizar status
  if (body.status !== undefined && body.status !== null && body.status !== '') {
    matchSheet.getRange(matchRowNum, cols.status + 1).setValue(body.status);
  } else if (body.homeScore !== undefined && body.homeScore !== null && body.homeScore !== '') {
    // Si se ponen goles, marcar como finished por defecto
    matchSheet.getRange(matchRowNum, cols.status + 1).setValue('finished');
  }

  // Recalcular puntos en el leaderboard
  recalculateAllUserPoints();

  return buildSuccess({ matchId });
}"""

    code = re.sub(
        r'function handleUpdateMatch\(matchId, homeScore, awayScore, adminPassword\) \{.*?recalculateAllUserPoints\(\);\r?\n\s*return buildSuccess\(\{ matchId, finalScore: \{ home: homeScore, away: awayScore \} \}\);\r?\n\}',
        new_handle_update,
        code,
        flags=re.DOTALL
    )

    # 3. Update autoPropagateTeams loops to support lock skip check
    # We will search and replace the loop codes in autoPropagateTeams:
    # Direct config loop:
    old_direct_loop = """  Object.keys(r32DirectConfigs).forEach(function(matchId) {
    const cfg = r32DirectConfigs[matchId];
    const homeTeam = getTeamByRank(cfg.home.group, cfg.home.rank);
    const awayTeam = getTeamByRank(cfg.away.group, cfg.away.rank);
    if (homeTeam) matchMap[matchId].homeTeam = homeTeam;
    if (awayTeam) matchMap[matchId].awayTeam = awayTeam;
  });"""

    new_direct_loop = """  Object.keys(r32DirectConfigs).forEach(function(matchId) {
    const cfg = r32DirectConfigs[matchId];
    const m = matchMap[matchId];
    if (m && m.matchType && m.matchType.indexOf('_locked') !== -1) return; // SKIPPED IF LOCKED
    const homeTeam = getTeamByRank(cfg.home.group, cfg.home.rank);
    const awayTeam = getTeamByRank(cfg.away.group, cfg.away.rank);
    if (homeTeam) matchMap[matchId].homeTeam = homeTeam;
    if (awayTeam) matchMap[matchId].awayTeam = awayTeam;
  });"""

    code = code.replace(old_direct_loop, new_direct_loop)

    # Third config loop:
    old_third_loop = """  Object.keys(r32ThirdConfigs).forEach(function(matchId) {
    const cfg = r32ThirdConfigs[matchId];
    const homeTeam = getTeamByRank(cfg.home.group, cfg.home.rank);
    if (homeTeam) matchMap[matchId].homeTeam = homeTeam;
    
    const assignedThird = thirdPlaceAssignments[matchId];
    if (assignedThird) {
      matchMap[matchId].awayTeam = assignedThird;
    }
  });"""

    new_third_loop = """  Object.keys(r32ThirdConfigs).forEach(function(matchId) {
    const cfg = r32ThirdConfigs[matchId];
    const m = matchMap[matchId];
    if (m && m.matchType && m.matchType.indexOf('_locked') !== -1) return; // SKIPPED IF LOCKED
    const homeTeam = getTeamByRank(cfg.home.group, cfg.home.rank);
    if (homeTeam) matchMap[matchId].homeTeam = homeTeam;
    
    const assignedThird = thirdPlaceAssignments[matchId];
    if (assignedThird) {
      matchMap[matchId].awayTeam = assignedThird;
    }
  });"""

    code = code.replace(old_third_loop, new_third_loop)

    # Knockout order loop:
    old_ko_loop = """  knockoutOrder.forEach(function(matchId) {
    const dep = knockoutDependencies[matchId];
    if (dep) {
      const homeTeam = getKnockoutResult(dep.home, false);
      const awayTeam = getKnockoutResult(dep.away, dep.useLoser || false);
      if (homeTeam) matchMap[matchId].homeTeam = homeTeam;
      if (awayTeam) matchMap[matchId].awayTeam = awayTeam;
    }
  });"""

    new_ko_loop = """  knockoutOrder.forEach(function(matchId) {
    const dep = knockoutDependencies[matchId];
    const m = matchMap[matchId];
    if (m && m.matchType && m.matchType.indexOf('_locked') !== -1) return; // SKIPPED IF LOCKED
    if (dep) {
      const homeTeam = getKnockoutResult(dep.home, false);
      const awayTeam = getKnockoutResult(dep.away, dep.useLoser || false);
      if (homeTeam) matchMap[matchId].homeTeam = homeTeam;
      if (awayTeam) matchMap[matchId].awayTeam = awayTeam;
    }
  });"""

    code = code.replace(old_ko_loop, new_ko_loop)

    # Write Code.gs
    with open('gas/Code.gs', 'w', encoding='utf-8') as f:
        f.write(code)

    print("Successfully updated gas/Code.gs for manual edits and locks!")

if __name__ == "__main__":
    main()
