// ============================================================
//  POLLA DEL MUNDIA — Google Apps Script Backend v3
//  Con sincronización automática desde worldcup26.ir/get/games
// ============================================================

const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';

const SHEET_USERS       = 'Users';
const SHEET_MATCHES     = 'Matches';
const SHEET_PREDICTIONS = 'Predictions';
const SHEET_SYNC_LOG    = 'SyncLog';     // Hoja de log de sincronizaciones
const ADMIN_PASSWORD    = 'mundia2026';

// API externa deshabilitada

// ============================================================
//  RESPONSE HELPERS
// ============================================================

function buildResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
function buildError(message, code) {
  return buildResponse({ success: false, error: message, code: code || 400 });
}
function buildSuccess(data) {
  return buildResponse({ success: true, data: data });
}

// ============================================================
//  SPREADSHEET HELPERS
// ============================================================

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_USERS) {
      sheet.appendRow(['userId','firstName','lastName','username','password','totalPoints','createdAt']);
    } else if (name === SHEET_MATCHES) {
      sheet.appendRow(['matchId','homeTeam','awayTeam','matchDate','matchTime','homeScore','awayScore','status','group','matchType','apiId']);
    } else if (name === SHEET_PREDICTIONS) {
      sheet.appendRow(['predictionId','userId','matchId','homeScore','awayScore','points','createdAt']);
    } else if (name === SHEET_SYNC_LOG) {
      sheet.appendRow(['timestamp','status','matchesSynced','matchesUpdated','errorMessage']);
    }
  }
  return sheet;
}

function padZero(num) {
  return num < 10 ? '0' + num : num;
}

function formatDateValue(date) {
  return date.getFullYear() + '-' + padZero(date.getMonth() + 1) + '-' + padZero(date.getDate());
}

function formatTimeValue(date) {
  return padZero(date.getHours()) + ':' + padZero(date.getMinutes());
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(function(row) {
    const obj = {};
    headers.forEach(function(h, i) {
      let val = row[i];
      if (val === '') {
        val = null;
      } else if (val instanceof Date) {
        if (h === 'matchDate' || h === 'createdAt') {
          val = formatDateValue(val);
        } else if (h === 'matchTime') {
          val = formatTimeValue(val);
        } else {
          val = val.toISOString();
        }
      }
      obj[h] = val;
    });
    return obj;
  });
}

function generateId(prefix) {
  return prefix + '_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function sanitizeUser(u) {
  return { userId: u.userId, firstName: u.firstName, lastName: u.lastName,
           username: u.username, totalPoints: u.totalPoints || 0, createdAt: u.createdAt };
}

// ============================================================
//  doGet
// ============================================================

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getMatches')     return handleGetMatches();
    if (action === 'getLeaderboard') return handleGetLeaderboard();
    if (action === 'getPredictions') return handleGetPredictions(e.parameter.userId);
    if (action === 'getSyncStatus')  return handleGetSyncStatus();
    if (action === 'syncMatches')    return handleSyncFromAdmin(e.parameter.adminPassword);
    return buildError('Acción no reconocida: ' + action, 400);
  } catch (err) {
    return buildError('Error interno: ' + err.message, 500);
  }
}

// ============================================================
//  doPost
// ============================================================

function doPost(e) {
  try {
    let body;
    try { body = JSON.parse(e.postData.contents); }
    catch (parseErr) { return buildError('Body JSON inválido', 400); }

    const action = body.action;
    if (action === 'register')       return handleRegister(body);
    if (action === 'login')          return handleLogin(body.username, body.password);
    if (action === 'savePrediction') return handleSavePrediction(body.userId, body.matchId, body.homeScore, body.awayScore);
    if (action === 'updateMatch')    return handleUpdateMatch(body);
    if (action === 'addMatch')       return handleAddMatch(body.adminPassword, body.homeTeam, body.awayTeam, body.matchDate, body.matchTime, body.group);
    return buildError('Acción no reconocida: ' + action, 400);
  } catch (err) {
    return buildError('Error interno: ' + err.message, 500);
  }
}

// ============================================================
//  HANDLERS — GET
// ============================================================

function handleGetMatches() {
  const sheet = getSheet(SHEET_MATCHES);
  const matches = sheetToObjects(sheet);
  // Limpiar campo interno apiId antes de devolver al cliente
  return buildSuccess(matches.map(function(m) {
    const clean = Object.assign({}, m);
    delete clean.apiId;
    return clean;
  }));
}

function handleGetLeaderboard() {
  const users = sheetToObjects(getSheet(SHEET_USERS));
  users.sort(function(a, b) { return (b.totalPoints || 0) - (a.totalPoints || 0); });
  return buildSuccess(users.map(function(u, i) {
    return { position: i+1, userId: u.userId, username: u.username,
             firstName: u.firstName, lastName: u.lastName, totalPoints: u.totalPoints || 0 };
  }));
}

function handleGetPredictions(userId) {
  if (!userId) return buildError('userId requerido', 400);
  const all = sheetToObjects(getSheet(SHEET_PREDICTIONS));
  return buildSuccess(all.filter(function(p) { return p.userId === userId; }));
}

function handleGetSyncStatus() {
  try {
    const logs = sheetToObjects(getSheet(SHEET_SYNC_LOG));
    const last = logs.length > 0 ? logs[logs.length - 1] : null;
    return buildSuccess({
      lastSync: last ? last.timestamp : null,
      lastStatus: last ? last.status : 'never',
      lastMatchesSynced: last ? last.matchesSynced : 0,
      lastMatchesUpdated: last ? last.matchesUpdated : 0,
      lastError: last ? last.errorMessage : null
    });
  } catch (err) {
    return buildSuccess({ lastSync: null, lastStatus: 'never' });
  }
}

function handleSyncFromAdmin(adminPassword) {
  if (adminPassword !== ADMIN_PASSWORD) return buildError('Contraseña de admin incorrecta', 403);
  const result = recalculateAllUserPoints();
  return buildSuccess(result);
}

// ============================================================
//  HANDLERS — AUTH
// ============================================================

function handleRegister(body) {
  const firstName = (body.firstName || '').trim();
  const lastName  = (body.lastName  || '').trim();
  const username  = (body.username  || '').trim();
  const password  = (body.password  || '').trim();

  if (!firstName) return buildError('El nombre es requerido', 400);
  if (!lastName)  return buildError('El apellido es requerido', 400);
  if (!username)  return buildError('El nombre de jugador es requerido', 400);
  if (!password || password.length < 4) return buildError('La contraseña debe tener mínimo 4 caracteres', 400);

  const sheet = getSheet(SHEET_USERS);
  const users = sheetToObjects(sheet);
  const exists = users.find(function(u) {
    return u.username.toLowerCase() === username.toLowerCase();
  });
  if (exists) return buildError('Ese nombre de jugador ya está en uso', 409);

  const newUser = {
    userId: generateId('USR'), firstName: firstName, lastName: lastName,
    username: username, password: password, totalPoints: 0,
    createdAt: new Date().toISOString().split('T')[0]
  };
  sheet.appendRow([newUser.userId, newUser.firstName, newUser.lastName,
                   newUser.username, newUser.password, newUser.totalPoints, newUser.createdAt]);
  return buildSuccess(sanitizeUser(newUser));
}

function handleLogin(username, password) {
  if (!username || !password) return buildError('Usuario y contraseña requeridos', 400);
  const users = sheetToObjects(getSheet(SHEET_USERS));
  const user = users.find(function(u) {
    return u.username.toLowerCase() === username.trim().toLowerCase();
  });
  if (!user) return buildError('Usuario no encontrado. ¿Ya te registraste?', 404);
  if (String(user.password) !== String(password.trim())) return buildError('Contraseña incorrecta', 401);
  return buildSuccess(sanitizeUser(user));
}

// ============================================================
//  HANDLERS — GAME
// ============================================================

function handleSavePrediction(userId, matchId, homeScore, awayScore) {
  if (!userId || !matchId) return buildError('userId y matchId requeridos', 400);
  if (homeScore == null || awayScore == null) return buildError('Marcador requerido', 400);

  const matches = sheetToObjects(getSheet(SHEET_MATCHES));
  const match = matches.find(function(m) { return m.matchId === matchId; });
  if (!match) return buildError('Partido no encontrado', 404);
  if (match.status === 'finished') return buildError('El partido ya terminó', 400);

  const predSheet = getSheet(SHEET_PREDICTIONS);
  const allPreds = sheetToObjects(predSheet);
  const existingIdx = allPreds.findIndex(function(p) {
    return p.userId === userId && p.matchId === matchId;
  });

  if (existingIdx >= 0) {
    const rowNum = existingIdx + 2;
    predSheet.getRange(rowNum, 4).setValue(homeScore);
    predSheet.getRange(rowNum, 5).setValue(awayScore);
    predSheet.getRange(rowNum, 6).setValue(null);
    return buildSuccess({ updated: true });
  } else {
    predSheet.appendRow([generateId('PRD'), userId, matchId, homeScore, awayScore, null,
                         new Date().toISOString().split('T')[0]]);
    return buildSuccess({ created: true });
  }
}

function handleUpdateMatch(body) {
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
}

function handleAddMatch(adminPassword, homeTeam, awayTeam, matchDate, matchTime, group) {
  if (adminPassword !== ADMIN_PASSWORD) return buildError('Contraseña incorrecta', 403);
  if (!homeTeam || !awayTeam || !matchDate) return buildError('Faltan datos requeridos', 400);

  const sheet = getSheet(SHEET_MATCHES);
  const newMatch = {
    matchId: generateId('MTH'), homeTeam, awayTeam, matchDate,
    matchTime: matchTime || '00:00', homeScore: null, awayScore: null,
    status: 'upcoming', group: group || 'A', matchType: 'manual', apiId: null
  };
  sheet.appendRow([newMatch.matchId, newMatch.homeTeam, newMatch.awayTeam, newMatch.matchDate,
                   newMatch.matchTime, null, null, newMatch.status, newMatch.group, newMatch.matchType, null]);
  return buildSuccess(newMatch);
}

// ============================================================
//  SINCRONIZACIÓN CON API EXTERNA (DESHABILITADA)
// ============================================================

function writeSyncLog(status, synced, updated, error) {
  try {
    const logSheet = getSheet(SHEET_SYNC_LOG);
    logSheet.appendRow([new Date().toISOString(), status, synced, updated, error || '']);
    // Mantener solo las últimas 100 filas de log
    const lastRow = logSheet.getLastRow();
    if (lastRow > 101) {
      logSheet.deleteRows(2, lastRow - 101);
    }
  } catch (e) {
    Logger.log('Error escribiendo SyncLog: ' + e.message);
  }
}

// ============================================================
//  TRIGGERS HORARIOS (DESHABILITADOS)
// ============================================================

// ============================================================
//  PUNTUACIÓN
// ============================================================

function getOutcome(home, away) {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

function calculatePoints(predHome, predAway, realHome, realAway) {
  if (predHome === realHome && predAway === realAway) return 3;
  if (getOutcome(predHome, predAway) === getOutcome(realHome, realAway)) return 1;
  return 0;
}

// calculatePointsForMatch removido para usar recalculateAllUserPoints

// ============================================================
//  PAGINACIÓN HARDCODED DE PARTIDOS
//  Ejecuta esta función una sola vez desde el editor de GAS
//  para cargar los 104 partidos sin consultar la API externa.
// ============================================================


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



// ============================================================
//  RECALCULAR PUNTOS
//  - Recalcula los puntos de todas las predicciones
//  - Actualiza el puntaje total de todos los usuarios
//  - Seguro contra duplicados si se corrige algún marcador
// ============================================================
function recalculateAllUserPoints() {
  try {
    autoPropagateTeams();
  } catch (e) {
    Logger.log("Error en autoPropagateTeams: " + e.message);
  }
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



// ============================================================
//  CARGAR PARTIDOS (DATOS INICIALES)
//  Poblar los 104 partidos en español y horario colombiano
// ============================================================


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



// ============================================================
//  RECALCULAR PUNTOS
//  - Recalcula los puntos de todas las predicciones
//  - Actualiza el puntaje total de todos los usuarios
//  - Seguro contra duplicados si se corrige algún marcador
// ============================================================
function recalculateAllUserPoints() {
  try {
    autoPropagateTeams();
  } catch (e) {
    Logger.log("Error en autoPropagateTeams: " + e.message);
  }
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



// ============================================================
//  CARGAR PARTIDOS (DATOS INICIALES)
//  Poblar los 104 partidos en español y horario colombiano
// ============================================================
function populateMatchesWithHardcodedData() {
  const games = [
    {
      "id": "1",
      "group": "A",
      "local_date": "06/11/2026 14:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "México",
      "away_team_name_en": "Sudáfrica"
    },
    {
      "id": "2",
      "group": "A",
      "local_date": "06/11/2026 21:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Corea del Sur",
      "away_team_name_en": "República Checa"
    },
    {
      "id": "3",
      "group": "B",
      "local_date": "06/12/2026 14:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Canadá",
      "away_team_name_en": "Bosnia y Herzegovina"
    },
    {
      "id": "4",
      "group": "D",
      "local_date": "06/12/2026 20:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Estados Unidos",
      "away_team_name_en": "Paraguay"
    },
    {
      "id": "5",
      "group": "C",
      "local_date": "06/13/2026 20:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Haití",
      "away_team_name_en": "Escocia"
    },
    {
      "id": "6",
      "group": "D",
      "local_date": "06/13/2026 23:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Australia",
      "away_team_name_en": "Turquía"
    },
    {
      "id": "7",
      "group": "C",
      "local_date": "06/13/2026 17:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Brasil",
      "away_team_name_en": "Marruecos"
    },
    {
      "id": "8",
      "group": "B",
      "local_date": "06/13/2026 14:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Catar",
      "away_team_name_en": "Suiza"
    },
    {
      "id": "9",
      "group": "E",
      "local_date": "06/14/2026 18:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Costa de Marfil",
      "away_team_name_en": "Ecuador"
    },
    {
      "id": "10",
      "group": "E",
      "local_date": "06/14/2026 12:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Alemania",
      "away_team_name_en": "Curazao"
    },
    {
      "id": "11",
      "group": "F",
      "local_date": "06/14/2026 15:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Países Bajos",
      "away_team_name_en": "Japón"
    },
    {
      "id": "12",
      "group": "F",
      "local_date": "06/14/2026 21:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Suecia",
      "away_team_name_en": "Túnez"
    },
    {
      "id": "13",
      "group": "H",
      "local_date": "06/15/2026 17:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Arabia Saudita",
      "away_team_name_en": "Uruguay"
    },
    {
      "id": "14",
      "group": "H",
      "local_date": "06/15/2026 11:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "España",
      "away_team_name_en": "Cabo Verde"
    },
    {
      "id": "15",
      "group": "G",
      "local_date": "06/15/2026 20:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Irán",
      "away_team_name_en": "Nueva Zelanda"
    },
    {
      "id": "16",
      "group": "G",
      "local_date": "06/15/2026 14:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Bélgica",
      "away_team_name_en": "Egipto"
    },
    {
      "id": "17",
      "group": "I",
      "local_date": "06/16/2026 14:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Francia",
      "away_team_name_en": "Senegal"
    },
    {
      "id": "18",
      "group": "I",
      "local_date": "06/16/2026 17:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Irak",
      "away_team_name_en": "Noruega"
    },
    {
      "id": "19",
      "group": "J",
      "local_date": "06/16/2026 20:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Argentina",
      "away_team_name_en": "Argelia"
    },
    {
      "id": "20",
      "group": "J",
      "local_date": "06/16/2026 23:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Austria",
      "away_team_name_en": "Jordania"
    },
    {
      "id": "21",
      "group": "L",
      "local_date": "06/17/2026 18:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ghana",
      "away_team_name_en": "Panamá"
    },
    {
      "id": "22",
      "group": "L",
      "local_date": "06/17/2026 15:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Inglaterra",
      "away_team_name_en": "Croacia"
    },
    {
      "id": "23",
      "group": "K",
      "local_date": "06/17/2026 12:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Portugal",
      "away_team_name_en": "República Democrática del Congo"
    },
    {
      "id": "24",
      "group": "K",
      "local_date": "06/17/2026 21:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Uzbekistán",
      "away_team_name_en": "Colombia"
    },
    {
      "id": "25",
      "group": "A",
      "local_date": "06/18/2026 11:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "República Checa",
      "away_team_name_en": "Sudáfrica"
    },
    {
      "id": "26",
      "group": "B",
      "local_date": "06/18/2026 14:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Suiza",
      "away_team_name_en": "Bosnia y Herzegovina"
    },
    {
      "id": "27",
      "group": "B",
      "local_date": "06/18/2026 17:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Canadá",
      "away_team_name_en": "Catar"
    },
    {
      "id": "28",
      "group": "A",
      "local_date": "06/18/2026 20:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "México",
      "away_team_name_en": "Corea del Sur"
    },
    {
      "id": "29",
      "group": "C",
      "local_date": "06/19/2026 20:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Brasil",
      "away_team_name_en": "Haití"
    },
    {
      "id": "30",
      "group": "C",
      "local_date": "06/19/2026 17:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Escocia",
      "away_team_name_en": "Marruecos"
    },
    {
      "id": "31",
      "group": "D",
      "local_date": "06/19/2026 23:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Turquía",
      "away_team_name_en": "Paraguay"
    },
    {
      "id": "32",
      "group": "D",
      "local_date": "06/19/2026 14:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Estados Unidos",
      "away_team_name_en": "Australia"
    },
    {
      "id": "33",
      "group": "E",
      "local_date": "06/20/2026 15:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Alemania",
      "away_team_name_en": "Costa de Marfil"
    },
    {
      "id": "34",
      "group": "E",
      "local_date": "06/20/2026 19:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ecuador",
      "away_team_name_en": "Curazao"
    },
    {
      "id": "35",
      "group": "F",
      "local_date": "06/20/2026 12:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Países Bajos",
      "away_team_name_en": "Suecia"
    },
    {
      "id": "36",
      "group": "F",
      "local_date": "06/20/2026 23:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Túnez",
      "away_team_name_en": "Japón"
    },
    {
      "id": "37",
      "group": "H",
      "local_date": "06/21/2026 17:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Uruguay",
      "away_team_name_en": "Cabo Verde"
    },
    {
      "id": "38",
      "group": "H",
      "local_date": "06/21/2026 11:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "España",
      "away_team_name_en": "Arabia Saudita"
    },
    {
      "id": "39",
      "group": "G",
      "local_date": "06/21/2026 14:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Bélgica",
      "away_team_name_en": "Irán"
    },
    {
      "id": "40",
      "group": "G",
      "local_date": "06/21/2026 20:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Nueva Zelanda",
      "away_team_name_en": "Egipto"
    },
    {
      "id": "41",
      "group": "I",
      "local_date": "06/22/2026 19:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Noruega",
      "away_team_name_en": "Senegal"
    },
    {
      "id": "42",
      "group": "I",
      "local_date": "06/22/2026 16:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Francia",
      "away_team_name_en": "Irak"
    },
    {
      "id": "43",
      "group": "J",
      "local_date": "06/22/2026 12:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Argentina",
      "away_team_name_en": "Austria"
    },
    {
      "id": "44",
      "group": "J",
      "local_date": "06/22/2026 22:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Jordania",
      "away_team_name_en": "Argelia"
    },
    {
      "id": "45",
      "group": "L",
      "local_date": "06/23/2026 15:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Inglaterra",
      "away_team_name_en": "Ghana"
    },
    {
      "id": "46",
      "group": "L",
      "local_date": "06/23/2026 18:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Panamá",
      "away_team_name_en": "Croacia"
    },
    {
      "id": "47",
      "group": "K",
      "local_date": "06/23/2026 12:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Portugal",
      "away_team_name_en": "Uzbekistán"
    },
    {
      "id": "48",
      "group": "K",
      "local_date": "06/23/2026 21:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Colombia",
      "away_team_name_en": "República Democrática del Congo"
    },
    {
      "id": "49",
      "group": "C",
      "local_date": "06/24/2026 17:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Escocia",
      "away_team_name_en": "Brasil"
    },
    {
      "id": "50",
      "group": "C",
      "local_date": "06/24/2026 17:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Marruecos",
      "away_team_name_en": "Haití"
    },
    {
      "id": "51",
      "group": "B",
      "local_date": "06/24/2026 14:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Suiza",
      "away_team_name_en": "Canadá"
    },
    {
      "id": "52",
      "group": "B",
      "local_date": "06/24/2026 14:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Bosnia y Herzegovina",
      "away_team_name_en": "Catar"
    },
    {
      "id": "53",
      "group": "A",
      "local_date": "06/24/2026 20:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "República Checa",
      "away_team_name_en": "México"
    },
    {
      "id": "54",
      "group": "A",
      "local_date": "06/24/2026 20:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Sudáfrica",
      "away_team_name_en": "Corea del Sur"
    },
    {
      "id": "55",
      "group": "E",
      "local_date": "06/25/2026 15:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Curazao",
      "away_team_name_en": "Costa de Marfil"
    },
    {
      "id": "56",
      "group": "E",
      "local_date": "06/25/2026 15:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ecuador",
      "away_team_name_en": "Alemania"
    },
    {
      "id": "57",
      "group": "F",
      "local_date": "06/25/2026 18:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Japón",
      "away_team_name_en": "Suecia"
    },
    {
      "id": "58",
      "group": "F",
      "local_date": "06/25/2026 18:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Túnez",
      "away_team_name_en": "Países Bajos"
    },
    {
      "id": "59",
      "group": "D",
      "local_date": "06/25/2026 21:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Turquía",
      "away_team_name_en": "Estados Unidos"
    },
    {
      "id": "60",
      "group": "D",
      "local_date": "06/25/2026 21:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Paraguay",
      "away_team_name_en": "Australia"
    },
    {
      "id": "61",
      "group": "I",
      "local_date": "06/26/2026 14:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Noruega",
      "away_team_name_en": "Francia"
    },
    {
      "id": "62",
      "group": "I",
      "local_date": "06/26/2026 14:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Senegal",
      "away_team_name_en": "Irak"
    },
    {
      "id": "63",
      "group": "G",
      "local_date": "06/26/2026 22:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Egipto",
      "away_team_name_en": "Irán"
    },
    {
      "id": "64",
      "group": "G",
      "local_date": "06/26/2026 22:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Nueva Zelanda",
      "away_team_name_en": "Bélgica"
    },
    {
      "id": "65",
      "group": "H",
      "local_date": "06/26/2026 19:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Cabo Verde",
      "away_team_name_en": "Arabia Saudita"
    },
    {
      "id": "66",
      "group": "H",
      "local_date": "06/26/2026 19:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Uruguay",
      "away_team_name_en": "España"
    },
    {
      "id": "67",
      "group": "L",
      "local_date": "06/27/2026 16:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Panamá",
      "away_team_name_en": "Inglaterra"
    },
    {
      "id": "68",
      "group": "L",
      "local_date": "06/27/2026 16:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Croacia",
      "away_team_name_en": "Ghana"
    },
    {
      "id": "69",
      "group": "J",
      "local_date": "06/27/2026 21:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Argelia",
      "away_team_name_en": "Austria"
    },
    {
      "id": "70",
      "group": "J",
      "local_date": "06/27/2026 21:00",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Jordania",
      "away_team_name_en": "Argentina"
    },
    {
      "id": "71",
      "group": "K",
      "local_date": "06/27/2026 18:30",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Colombia",
      "away_team_name_en": "Portugal"
    },
    {
      "id": "72",
      "group": "K",
      "local_date": "06/27/2026 18:30",
      "type": "group",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "República Democrática del Congo",
      "away_team_name_en": "Uzbekistán"
    },
    {
      "id": "73",
      "group": "R32",
      "local_date": "06/28/2026 14:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "2° Grupo A",
      "away_team_name_en": "2° Grupo B"
    },
    {
      "id": "74",
      "group": "R32",
      "local_date": "06/29/2026 15:30",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "1° Grupo E",
      "away_team_name_en": "3° Grupo A/B/C/D/F"
    },
    {
      "id": "75",
      "group": "R32",
      "local_date": "06/29/2026 20:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "1° Grupo F",
      "away_team_name_en": "2° Grupo C"
    },
    {
      "id": "76",
      "group": "R32",
      "local_date": "06/29/2026 12:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "1° Grupo C",
      "away_team_name_en": "2° Grupo F"
    },
    {
      "id": "77",
      "group": "R32",
      "local_date": "06/30/2026 16:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "1° Grupo I",
      "away_team_name_en": "3° Grupo C/D/F/G/H"
    },
    {
      "id": "78",
      "group": "R32",
      "local_date": "06/30/2026 12:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "2° Grupo E",
      "away_team_name_en": "2° Grupo I"
    },
    {
      "id": "79",
      "group": "R32",
      "local_date": "06/30/2026 20:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "1° Grupo A",
      "away_team_name_en": "3° Grupo C/E/F/H/I"
    },
    {
      "id": "80",
      "group": "R32",
      "local_date": "07/01/2026 11:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "1° Grupo L",
      "away_team_name_en": "3° Grupo E/H/I/J/K"
    },
    {
      "id": "81",
      "group": "R32",
      "local_date": "07/01/2026 19:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "1° Grupo D",
      "away_team_name_en": "3° Grupo B/E/F/I/J"
    },
    {
      "id": "82",
      "group": "R32",
      "local_date": "07/01/2026 15:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "1° Grupo G",
      "away_team_name_en": "3° Grupo A/E/H/I/J"
    },
    {
      "id": "83",
      "group": "R32",
      "local_date": "07/02/2026 18:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "2° Grupo K",
      "away_team_name_en": "2° Grupo L"
    },
    {
      "id": "84",
      "group": "R32",
      "local_date": "07/02/2026 14:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "1° Grupo H",
      "away_team_name_en": "2° Grupo J"
    },
    {
      "id": "85",
      "group": "R32",
      "local_date": "07/02/2026 22:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "1° Grupo B",
      "away_team_name_en": "3° Grupo E/F/G/I/J"
    },
    {
      "id": "86",
      "group": "R32",
      "local_date": "07/03/2026 17:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "1° Grupo J",
      "away_team_name_en": "2° Grupo H"
    },
    {
      "id": "87",
      "group": "R32",
      "local_date": "07/03/2026 20:30",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "1° Grupo K",
      "away_team_name_en": "3° Grupo D/E/I/J/L"
    },
    {
      "id": "88",
      "group": "R32",
      "local_date": "07/03/2026 13:00",
      "type": "r32",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "2° Grupo D",
      "away_team_name_en": "2° Grupo G"
    },
    {
      "id": "89",
      "group": "R16",
      "local_date": "07/04/2026 16:00",
      "type": "r16",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 74",
      "away_team_name_en": "Ganador Partido 77"
    },
    {
      "id": "90",
      "group": "R16",
      "local_date": "07/04/2026 12:00",
      "type": "r16",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 73",
      "away_team_name_en": "Ganador Partido 75"
    },
    {
      "id": "91",
      "group": "R16",
      "local_date": "07/05/2026 15:00",
      "type": "r16",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 76",
      "away_team_name_en": "Ganador Partido 78"
    },
    {
      "id": "92",
      "group": "R16",
      "local_date": "07/05/2026 19:00",
      "type": "r16",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 79",
      "away_team_name_en": "Ganador Partido 80"
    },
    {
      "id": "93",
      "group": "R16",
      "local_date": "07/06/2026 14:00",
      "type": "r16",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 83",
      "away_team_name_en": "Ganador Partido 84"
    },
    {
      "id": "94",
      "group": "R16",
      "local_date": "07/06/2026 19:00",
      "type": "r16",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 81",
      "away_team_name_en": "Ganador Partido 82"
    },
    {
      "id": "95",
      "group": "R16",
      "local_date": "07/07/2026 11:00",
      "type": "r16",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 86",
      "away_team_name_en": "Ganador Partido 88"
    },
    {
      "id": "96",
      "group": "R16",
      "local_date": "07/07/2026 15:00",
      "type": "r16",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 85",
      "away_team_name_en": "Ganador Partido 87"
    },
    {
      "id": "97",
      "group": "QF",
      "local_date": "07/09/2026 15:00",
      "type": "qf",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 89",
      "away_team_name_en": "Ganador Partido 90"
    },
    {
      "id": "98",
      "group": "QF",
      "local_date": "07/10/2026 14:00",
      "type": "qf",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 93",
      "away_team_name_en": "Ganador Partido 94"
    },
    {
      "id": "99",
      "group": "QF",
      "local_date": "07/11/2026 16:00",
      "type": "qf",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 91",
      "away_team_name_en": "Ganador Partido 92"
    },
    {
      "id": "100",
      "group": "QF",
      "local_date": "07/11/2026 20:00",
      "type": "qf",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 95",
      "away_team_name_en": "Ganador Partido 96"
    },
    {
      "id": "101",
      "group": "SF",
      "local_date": "07/14/2026 14:00",
      "type": "sf",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 97",
      "away_team_name_en": "Ganador Partido 98"
    },
    {
      "id": "102",
      "group": "SF",
      "local_date": "07/15/2026 14:00",
      "type": "sf",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 99",
      "away_team_name_en": "Ganador Partido 100"
    },
    {
      "id": "103",
      "group": "3RD",
      "local_date": "07/18/2026 16:00",
      "type": "third",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Perdedor Partido 101",
      "away_team_name_en": "Perdedor Partido 102"
    },
    {
      "id": "104",
      "group": "FINAL",
      "local_date": "07/19/2026 14:00",
      "type": "final",
      "finished": "FALSE",
      "time_elapsed": "notstarted",
      "home_score": "0",
      "away_score": "0",
      "home_team_name_en": "Ganador Partido 101",
      "away_team_name_en": "Ganador Partido 102"
    }
  ];
  
  const matchSheet = getSheet(SHEET_MATCHES);
  
  // Limpiar la hoja y poner los encabezados
  matchSheet.clearContents();
  matchSheet.getRange(1, 1, 1, 11).setValues([
    ['matchId', 'homeTeam', 'awayTeam', 'matchDate', 'matchTime', 'homeScore', 'awayScore', 'status', 'group', 'matchType', 'apiId']
  ]);
  
  games.forEach(function(game) {
    let matchDate = '', matchTime = '00:00';
    if (game.local_date) {
      const parts = game.local_date.split(' ');
      if (parts.length === 2) {
        const dateParts = parts[0].split('/'); // MM/DD/YYYY
        if (dateParts.length === 3) {
          matchDate = dateParts[2] + '-' + dateParts[0] + '-' + dateParts[1]; // YYYY-MM-DD
        }
        matchTime = parts[1];
      }
    }
    
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
  });
  
  Logger.log('Carga completada de ' + games.length + ' partidos.');
  return 'Carga completada. Total partidos creados: ' + games.length;
}

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
