import json
import re

def main():
    # Load the colombian matches JSON
    with open('scratch/games_colombia.json', 'r', encoding='utf-8') as f:
        games = json.load(f)

    # Convert the JSON array to a formatted JS array literal
    games_js_str = json.dumps(games, ensure_ascii=False, indent=2)
    # Indent it properly to fit nicely inside Code.gs
    games_js_str = "\n".join("  " + line for line in games_js_str.split("\n"))

    # Load original Code.gs
    with open('gas/Code.gs', 'r', encoding='utf-8') as f:
        code = f.read()

    # Define the new onOpen function
    on_open_js = """
// ============================================================
//  onOpen — Crear menú personalizado en Google Sheets
// ============================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏆 Polla Mundial')
    .addItem('Recalcular Todos los Puntos', 'recalculateAllUserPoints')
    .addItem('Cargar Partidos (Datos Iniciales)', 'populateMatchesWithHardcodedData')
    .addToUi();
}
"""

    # Define the new recalculateAllUserPoints function
    recalculate_points_js = """
// ============================================================
//  RECALCULAR PUNTOS
//  - Recalcula los puntos de todas las predicciones
//  - Actualiza el puntaje total de todos los usuarios
//  - Seguro contra duplicados si se corrige algún marcador
// ============================================================
function recalculateAllUserPoints() {
  const matchSheet = getSheet(SHEET_MATCHES);
  const matches = sheetToObjects(matchSheet);
  const matchMap = {};
  let finishedMatchesCount = 0;
  
  matches.forEach(function(m) {
    matchMap[m.matchId] = m;
    if (m.status === 'finished') {
      finishedMatchesCount++;
    }
  });

  const predSheet = getSheet(SHEET_PREDICTIONS);
  const predData = predSheet.getDataRange().getValues();
  let predictionsUpdatedCount = 0;
  const userPointsMap = {};

  if (predData.length > 1) {
    const predHeaders = predData[0];
    const pCols = {};
    predHeaders.forEach(function(h, i) { pCols[h] = i; });

    // Calcular puntos para cada predicción
    for (let i = 1; i < predData.length; i++) {
      const row = predData[i];
      const matchId = row[pCols.matchId];
      const homeScore = row[pCols.homeScore];
      const awayScore = row[pCols.awayScore];
      const userId = row[pCols.userId];

      const match = matchMap[matchId];
      let points = '';

      if (match && match.status === 'finished' && match.homeScore !== null && match.awayScore !== null && match.homeScore !== '' && match.awayScore !== '') {
        points = calculatePoints(
          Number(homeScore), Number(awayScore),
          Number(match.homeScore), Number(match.awayScore)
        );
        if (!userPointsMap[userId]) userPointsMap[userId] = 0;
        userPointsMap[userId] += points;
        predictionsUpdatedCount++;
      } else {
        points = '';
      }

      // Actualizar los puntos de la predicción en la hoja
      predSheet.getRange(i + 1, pCols.points + 1).setValue(points);
    }
  }

  // Actualizar los puntos totales de los usuarios
  const userSheet = getSheet(SHEET_USERS);
  const userData = userSheet.getDataRange().getValues();
  if (userData.length > 1) {
    const userHeaders = userData[0];
    const uCols = {};
    userHeaders.forEach(function(h, i) { uCols[h] = i; });

    for (let i = 1; i < userData.length; i++) {
      const userId = userData[i][uCols.userId];
      const pts = userPointsMap[userId] || 0;
      userSheet.getRange(i + 1, uCols.totalPoints + 1).setValue(pts);
    }
  }

  // Registrar en SyncLog
  writeSyncLog('success', 0, predictionsUpdatedCount, null);

  return {
    success: true,
    syncedNew: 0,
    updated: predictionsUpdatedCount,
    newlyFinished: finishedMatchesCount,
    timestamp: new Date().toISOString()
  };
}
"""

    # Define the new populateMatchesWithHardcodedData function
    populate_matches_js = f"""
// ============================================================
//  CARGAR PARTIDOS (DATOS INICIALES)
//  Poblar los 104 partidos en español y horario colombiano
// ============================================================
function populateMatchesWithHardcodedData() {{
  const games = {games_js_str.strip()};
  
  const matchSheet = getSheet(SHEET_MATCHES);
  
  // Limpiar la hoja y poner los encabezados
  matchSheet.clearContents();
  matchSheet.getRange(1, 1, 1, 11).setValues([
    ['matchId', 'homeTeam', 'awayTeam', 'matchDate', 'matchTime', 'homeScore', 'awayScore', 'status', 'group', 'matchType', 'apiId']
  ]);
  
  games.forEach(function(game) {{
    let matchDate = '', matchTime = '00:00';
    if (game.local_date) {{
      const parts = game.local_date.split(' ');
      if (parts.length === 2) {{
        const dateParts = parts[0].split('/'); // MM/DD/YYYY
        if (dateParts.length === 3) {{
          matchDate = dateParts[2] + '-' + dateParts[0] + '-' + dateParts[1]; // YYYY-MM-DD
        }}
        matchTime = parts[1];
      }}
    }}
    
    matchSheet.appendRow([
      'API_' + game.id,
      game.home_team_name_en,
      game.away_team_name_en,
      matchDate,
      matchTime,
      null,
      null,
      'upcoming',
      game.group,
      game.type,
      game.id
    ]);
  }});
  
  Logger.log('Carga completada de ' + games.length + ' partidos.');
  return 'Carga completada. Total partidos creados: ' + games.length;
}}
"""

    # Modify doGet action logic to call recalculateAllUserPoints instead of syncMatchesFromAPI
    # Replacing handleSyncFromAdmin:
    # function handleSyncFromAdmin(adminPassword) {
    #   if (adminPassword !== ADMIN_PASSWORD) return buildError('Contraseña de admin incorrecta', 403);
    #   const result = syncMatchesFromAPI();
    #   return buildSuccess(result);
    # }
    code = re.sub(
        r'function handleSyncFromAdmin\(adminPassword\) \{.*?\r?\n\s*const result = syncMatchesFromAPI\(\);\r?\n\s*return buildSuccess\(result\);\r?\n\}',
        'function handleSyncFromAdmin(adminPassword) {\n  if (adminPassword !== ADMIN_PASSWORD) return buildError(\'Contraseña de admin incorrecta\', 403);\n  const result = recalculateAllUserPoints();\n  return buildSuccess(result);\n}',
        code,
        flags=re.DOTALL
    )

    # Replace handleUpdateMatch to use recalculateAllUserPoints() instead of calculatePointsForMatch()
    code = re.sub(
        r'const result = calculatePointsForMatch\(matchId, homeScore, awayScore\);\r?\n\s*return buildSuccess\(\{ matchId, finalScore: \{ home: homeScore, away: awayScore \}, \.\.\.result \}\);',
        'recalculateAllUserPoints();\n  return buildSuccess({ matchId, finalScore: { home: homeScore, away: awayScore } });',
        code
    )

    # Let's clean up the API URL and old syncMatchesFromAPI function
    # Remove const API_URL = ...
    code = re.sub(r'const API_URL = \'.*?\';', '// API externa deshabilitada', code)
    
    # Remove syncMatchesFromAPI completely (from line 293 to 441 approx)
    code = re.sub(r'function syncMatchesFromAPI\(\) \{.*?\}[\r\n]+// ============================================================[\r\n]+//  writeSyncLog', 
                  '// Sincronización con API externa eliminada\n\n// ============================================================\n//  writeSyncLog', 
                  code, flags=re.DOTALL)

    # Remove trigger functions: setupHourlyTrigger and removeHourlyTrigger
    code = re.sub(r'/\*\*\r?\n \* Llama esta función MANUALMENTE.*?function removeHourlyTrigger\(\) \{.*?\}',
                  '// Triggers automáticos deshabilitados ya que se gestiona todo desde Sheets',
                  code, flags=re.DOTALL)

    # Remove calculatePointsForMatch (since recalculateAllUserPoints replaces it)
    code = re.sub(r'function calculatePointsForMatch\(matchId, realHome, realAway\) \{.*?\}[\r\n]+// ============================================================[\r\n]+//  PAGINACIÓN HARDCODED DE PARTIDOS',
                  '// calculatePointsForMatch removido para usar recalculateAllUserPoints\n\n// ============================================================\n//  PAGINACIÓN HARDCODED DE PARTIDOS',
                  code, flags=re.DOTALL)

    # Remove the entire populateMatchesWithHardcodedData function from the end of the file
    # We will search for 'function populateMatchesWithHardcodedData() { ... }' at the end of the file
    code = re.sub(r'function populateMatchesWithHardcodedData\(\) \{.*$', 
                  '', 
                  code, flags=re.DOTALL)

    # Append the new functions: onOpen, recalculateAllUserPoints, and populateMatchesWithHardcodedData
    code = code.strip() + "\n\n" + on_open_js + "\n\n" + recalculate_points_js + "\n\n" + populate_matches_js + "\n"

    # Write the modified Code.gs
    with open('gas/Code.gs', 'w', encoding='utf-8') as f:
        f.write(code)

    print("Successfully updated gas/Code.gs!")

if __name__ == "__main__":
    main()
