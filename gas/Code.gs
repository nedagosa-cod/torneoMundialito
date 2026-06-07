// ============================================================
//  POLLA DEL Mundial — Google Apps Script Backend (Supabase Edition)
//  Su único propósito es sincronizar las respuestas de Google Forms
//  hacia Supabase en tiempo real y migrar datos iniciales.
// ============================================================

const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';

const SHEET_USERS       = 'Users';
const SHEET_MATCHES     = 'Matches';
const SHEET_PREDICTIONS = 'Predictions';
const SHEET_FORM_RESPONSES = 'Respuestas de formulario 1';

// Configuración de Supabase
const SUPABASE_URL = 'https://erprrczznadutgkbbybf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVycHJyY3p6bmFkdXRna2JieWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njk5OTMsImV4cCI6MjA5NjM0NTk5M30.42PqoRn2gZihNrHWO6M-Icf0ixC8uTDGUoduVhtPV8Q';

// ============================================================
//  SUPABASE HELPERS
// ============================================================

function postToSupabase(table, data) {
  const url = SUPABASE_URL + '/rest/v1/' + table;
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Prefer': 'resolution=merge-duplicates'
    },
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  if (code >= 200 && code < 300) {
    return { success: true, content: response.getContentText() };
  } else {
    throw new Error('Supabase error (' + code + '): ' + response.getContentText());
  }
}

// ============================================================
//  SINCRONIZACIÓN EN TIEMPO REAL DESDE GOOGLE FORMS
// ============================================================

function syncFormResponsesToSupabase() {
  const userSheet = getSheet(SHEET_USERS);
  const userData = userSheet.getDataRange().getValues();
  const uCols = {};
  if (userData.length > 0) {
    userData[0].forEach(function(h, i) { uCols[h] = i; });
  }
  
  const existingIdByCedula = {};
  for (let i = 1; i < userData.length; i++) {
    const row = userData[i];
    const userId = row[uCols.userId];
    const password = row[uCols.password]; // cédula
    if (userId && password) {
      existingIdByCedula[String(password).trim()] = String(userId).trim();
    }
  }

  // Leer respuestas del formulario
  var ss;
  try {
    ss = (SPREADSHEET_ID && SPREADSHEET_ID !== 'TU_SPREADSHEET_ID_AQUI')
      ? SpreadsheetApp.openById(SPREADSHEET_ID)
      : SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  var possibleNames = [
    SHEET_FORM_RESPONSES,
    'Form Responses 1',
    'Form_Responses',
    'Respuestas de formulario1',
    'Respuestas del formulario 1'
  ];

  var formSheet = null;
  for (var n = 0; n < possibleNames.length; n++) {
    formSheet = ss.getSheetByName(possibleNames[n]);
    if (formSheet) break;
  }

  if (!formSheet) {
    // Buscar por encabezados
    var allSheets = ss.getSheets();
    for (var s = 0; s < allSheets.length; s++) {
      var lastCol = allSheets[s].getLastColumn();
      if (lastCol < 1) continue;
      var firstRow = allSheets[s].getRange(1, 1, 1, lastCol).getValues()[0];
      var hasCorreo = firstRow.some(function(cell) { return String(cell).toLowerCase().indexOf('correo') > -1; });
      var hasCedula = firstRow.some(function(cell) { return String(cell).toLowerCase().indexOf('dula') > -1; });
      if (hasCorreo && hasCedula) {
        formSheet = allSheets[s];
        break;
      }
    }
  }

  if (!formSheet) {
    Logger.log('syncFormResponsesToSupabase: No se encontró la hoja de respuestas');
    return;
  }

  var formData = formSheet.getDataRange().getValues();
  if (formData.length <= 1) return;

  var fHeaders = formData[0];
  var colCedula = -1, colNombre = -1, colCorreo = -1;
  for (var h = 0; h < fHeaders.length; h++) {
    var header = String(fHeaders[h]).toLowerCase();
    if (header.indexOf('dula') > -1)    colCedula = h;
    if (header.indexOf('nombre') > -1 && header.indexOf('completo') > -1) colNombre = h;
    if (header.indexOf('correo') > -1)  colCorreo = h;
  }

  if (colCedula === -1 || colCorreo === -1) {
    Logger.log('syncFormResponsesToSupabase: Columnas requeridas no encontradas');
    return;
  }
  if (colNombre === -1) colNombre = colCorreo;

  const supabaseUsers = [];
  const seenEmails = {};
  
  for (var r = 1; r < formData.length; r++) {
    var cedula = String(formData[r][colCedula] || '').trim();
    var nombreCompleto = String(formData[r][colNombre] || '').trim();
    var correo = String(formData[r][colCorreo] || '').trim().toLowerCase();

    if (!cedula || !correo) continue;
    if (seenEmails[correo]) continue;
    seenEmails[correo] = true;

    var parts = nombreCompleto.split(/\s+/);
    var firstName = '';
    var lastName = '';
    if (parts.length >= 3) {
      firstName = parts.slice(0, parts.length - 1).join(' ');
      lastName = parts[parts.length - 1];
    } else if (parts.length === 2) {
      firstName = parts[0];
      lastName = parts[1];
    } else {
      firstName = nombreCompleto;
      lastName = '';
    }

    var userId = existingIdByCedula[cedula];
    if (!userId) {
      userId = 'USR' + Math.floor(100000 + Math.random() * 900000);
      existingIdByCedula[cedula] = userId;
      // Registrarlo también localmente para backup
      userSheet.appendRow([userId, firstName, lastName, correo, cedula, 0, new Date().toISOString().split('T')[0]]);
    }

    supabaseUsers.push({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      username: correo,
      password: cedula
    });
  }

  if (supabaseUsers.length > 0) {
    postToSupabase('users', supabaseUsers);
    Logger.log('Sincronizados ' + supabaseUsers.length + ' usuarios a Supabase.');
  }
}

// Activador disparado en tiempo real al enviar el formulario
function onFormSubmit(e) {
  try {
    Logger.log('onFormSubmit Trigger disparado.');
    syncFormResponsesToSupabase();
  } catch (err) {
    Logger.log('Error en onFormSubmit: ' + err.message);
  }
}

// ============================================================
//  MIGRACIÓN MANUAL DE DATOS
// ============================================================

function syncAllUsersToSupabase() {
  const userSheet = getSheet(SHEET_USERS);
  const userData = userSheet.getDataRange().getValues();
  if (userData.length <= 1) return;
  const headers = userData[0];
  const uCols = {};
  headers.forEach(function(h, i) { uCols[h] = i; });

  const supabaseUsers = [];
  const seenEmails = {};
  for (let i = 1; i < userData.length; i++) {
    const row = userData[i];
    const userId = row[uCols.userId];
    const username = String(row[uCols.username] || '').trim().toLowerCase();
    const password = row[uCols.password];
    if (!userId || !username || !password) continue;
    
    if (seenEmails[username]) continue;
    seenEmails[username] = true;
    
    let createdAt = new Date().toISOString();
    if (row[uCols.createdAt]) {
      try {
        createdAt = new Date(row[uCols.createdAt]).toISOString();
      } catch (e) {}
    }

    supabaseUsers.push({
      id: String(userId).trim(),
      first_name: String(row[uCols.firstName] || '').trim(),
      last_name: String(row[uCols.lastName] || '').trim(),
      username: username,
      password: String(password).trim(),
      created_at: createdAt
    });
  }

  if (supabaseUsers.length > 0) {
    postToSupabase('users', supabaseUsers);
    Logger.log('Migrados ' + supabaseUsers.length + ' usuarios a Supabase');
  }
}

// ============================================================
//  SPREADSHEET HELPERS
// ============================================================


function getSheet(name) {
  var ss;
  try {
    ss = (SPREADSHEET_ID && SPREADSHEET_ID !== 'TU_SPREADSHEET_ID_AQUI')
      ? SpreadsheetApp.openById(SPREADSHEET_ID)
      : SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_USERS) {
      sheet.appendRow(['userId','firstName','lastName','username','password','totalPoints','createdAt']);
    } else if (name === SHEET_MATCHES) {
      sheet.appendRow(['matchId','homeTeam','awayTeam','matchDate','matchTime','homeScore','awayScore','status','group','matchType','apiId']);
    } else if (name === SHEET_PREDICTIONS) {
      sheet.appendRow(['predictionId','userId','matchId','homeScore','awayScore','points','createdAt']);
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
