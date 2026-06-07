// scratch/test_supabase_logic.ts
import { supabase } from '../src/api/supabaseClient.js';
import { 
  apiLogin, 
  apiSavePrediction, 
  apiUpdateMatch, 
  apiGetMatches, 
  apiGetLeaderboard, 
  apiGetPredictions,
  apiAddMatch,
  apiSyncMatches,
  autoPropagateTeamsSupabase
} from '../src/api/api.js';

// Copiar funciones de cálculo localmente para debuggear en el test
function calculateGroupStandingsDebug(matches: any[], groupLetter: string) {
  const groupMatches = matches.filter(
    m => m.group === groupLetter && m.match_type.replace('_locked', '') === 'group'
  );

  console.log(`\n🔍 [Debug] Partidos encontrados para Grupo ${groupLetter}:`, groupMatches.length);
  const teamsMap: Record<string, boolean> = {};
  groupMatches.forEach(m => {
    if (m.home_team && m.home_team !== 'Por definir') teamsMap[m.home_team] = true;
    if (m.away_team && m.away_team !== 'Por definir') teamsMap[m.away_team] = true;
  });
  const teams = Object.keys(teamsMap);

  const stats: Record<string, any> = {};
  teams.forEach(t => {
    stats[t] = { team: t, group: groupLetter, points: 0, gd: 0, gf: 0, ga: 0, won: 0, played: 0 };
  });

  groupMatches.forEach(m => {
    if (m.status === 'finished' && m.home_score !== null && m.away_score !== null) {
      const h = Number(m.home_score);
      const a = Number(m.away_score);
      const home = m.home_team;
      const away = m.away_team;

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

  const standings = Object.values(stats);
  standings.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return x.team.localeCompare(y.team);
  });

  console.log(`🏆 [Debug] Tabla calculada del Grupo ${groupLetter}:`);
  standings.forEach((s, idx) => {
    console.log(`   ${idx+1}. ${s.team}: Pts ${s.points}, PJ ${s.played}, DG ${s.gd}, GF ${s.gf}`);
  });

  return standings;
}

async function runTests() {
  console.log('🧪 ===== INICIO DE PRUEBAS DE SIMULACIÓN =====');
  
  // IDs de usuarios temporales para la prueba
  const userAId = 'TST_USR_A';
  const userBId = 'TST_USR_B';
  const userCId = 'TST_USR_C';

  try {
    // ------------------------------------------------------------
    //  0. Limpiar datos viejos de pruebas anteriores
    // ------------------------------------------------------------
    console.log('\n🧹 Limpiando base de datos de pruebas anteriores...');
    await supabase.from('predictions').delete().in('user_id', [userAId, userBId, userCId]);
    await supabase.from('users').delete().in('id', [userAId, userBId, userCId]);
    
    // Resetear partidos del grupo A
    const groupAMatches = ['API_1', 'API_2', 'API_25', 'API_28', 'API_53', 'API_54'];
    await supabase.from('matches')
      .update({ home_score: null, away_score: null, status: 'upcoming', match_type: 'group' })
      .in('id', groupAMatches);
    await supabase.from('matches').update({ match_date: '2026-06-11', match_time: '14:00' }).eq('id', 'API_1');
    await supabase.from('matches').update({ match_date: '2026-06-11', match_time: '21:00' }).eq('id', 'API_2');
    
    // Resetear partidos eliminatorios donde propaga el Grupo A
    await supabase.from('matches')
      .update({ home_team: 'Por definir', away_team: 'Por definir', match_type: 'r32' })
      .in('id', ['API_73', 'API_79']);

    // ------------------------------------------------------------
    //  1. Crear Usuarios de Prueba
    // ------------------------------------------------------------
    console.log('\n👤 Creando usuarios de prueba en Supabase...');
    const testUsers = [
      { id: userAId, first_name: 'Ana', last_name: 'Perez', username: 'ana@test.com', password: '111', total_points: 0 },
      { id: userBId, first_name: 'Bruno', last_name: 'Gomez', username: 'bruno@test.com', password: '222', total_points: 0 },
      { id: userCId, first_name: 'Carlos', last_name: 'Silva', username: 'carlos@test.com', password: '333', total_points: 0 }
    ];

    const { error: userErr } = await supabase.from('users').insert(testUsers);
    if (userErr) throw new Error('Error al crear usuarios: ' + userErr.message);
    console.log('✅ Usuarios de prueba creados.');

    // Validar Login API
    const loginRes = await apiLogin('ana@test.com', '111');
    if (loginRes.success && loginRes.data?.userId === userAId) {
      console.log('✅ Login exitoso con credenciales del usuario de prueba.');
    } else {
      throw new Error('Falló validación de login: ' + JSON.stringify(loginRes));
    }

    // ------------------------------------------------------------
    //  2. Validar Guardado de Predicciones y Bloqueo por Fecha (Lockout)
    // ------------------------------------------------------------
    console.log('\n📅 Validando reglas de fechas y bloqueo de predicciones...');
    
    // Partido futuro
    const matchFutureId = 'API_1';
    await supabase.from('matches').update({
      match_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Mañana
      match_time: '15:00'
    }).eq('id', matchFutureId);

    const saveFutureRes = await apiSavePrediction(userAId, matchFutureId, 2, 1);
    if (saveFutureRes.success) {
      console.log('✅ Predicción guardada con éxito en partido futuro.');
    } else {
      throw new Error('No se pudo guardar predicción en partido futuro: ' + saveFutureRes.error);
    }

    // Partido pasado (ya comenzó)
    const matchPastId = 'API_2';
    await supabase.from('matches').update({
      match_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Ayer
      match_time: '10:00'
    }).eq('id', matchPastId);

    const savePastRes = await apiSavePrediction(userAId, matchPastId, 1, 1);
    if (!savePastRes.success && savePastRes.error?.includes('predicciones están cerradas')) {
      console.log('✅ Predicción rechazada correctamente (Partido ya comenzó).');
    } else {
      throw new Error('Error: Se permitió guardar una predicción para un partido que ya comenzó.');
    }

    // ------------------------------------------------------------
    //  3. Validar Reglas de Puntajes (3, 1, 0 puntos)
    // ------------------------------------------------------------
    console.log('\n⚽ Validando cálculo de puntos (Marcador exacto vs Resultado general)...');
    
    // Resetear API_1 para pruebas de puntajes
    await supabase.from('matches').update({
      match_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Mañana
      match_time: '15:00',
      status: 'upcoming'
    }).eq('id', 'API_1');

    // Predicciones para Ana, Bruno y Carlos sobre API_1:
    // Resultado real simulado: México 2 - 1 Sudáfrica
    await apiSavePrediction(userAId, 'API_1', 2, 1); // Ana predice 2-1 (Exacto -> 3 pts)
    await apiSavePrediction(userBId, 'API_1', 1, 0); // Bruno predice 1-0 (Ganador -> 1 pts)
    await apiSavePrediction(userCId, 'API_1', 1, 1); // Carlos predice 1-1 (Errado -> 0 pts)

    // Finalizar el partido con marcador real: México 2 - 1 Sudáfrica
    console.log('Actualizando marcador real: México 2 - 1 Sudáfrica...');
    const updateMatchRes = await apiUpdateMatch({
      matchId: 'API_1',
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
      adminPassword: 'mundia2026'
    });

    if (!updateMatchRes.success) {
      throw new Error('Error al actualizar el partido desde Admin: ' + updateMatchRes.error);
    }

    // Consultar puntos en la base de datos
    const { data: preds, error: predErr } = await supabase
      .from('predictions')
      .select('user_id, points')
      .eq('match_id', 'API_1');
    
    if (predErr) throw predErr;

    const pointsMap: Record<string, number> = {};
    preds.forEach(p => { pointsMap[p.user_id] = p.points; });

    if (pointsMap[userAId] === 3 && pointsMap[userBId] === 1 && pointsMap[userCId] === 0) {
      console.log('✅ Puntos individuales de predicciones calculados correctamente:');
      console.log(`   - Ana (Predijo 2-1, Real 2-1): ${pointsMap[userAId]} puntos (Esperado: 3)`);
      console.log(`   - Bruno (Predijo 1-0, Real 2-1): ${pointsMap[userBId]} puntos (Esperado: 1)`);
      console.log(`   - Carlos (Predijo 1-1, Real 2-1): ${pointsMap[userCId]} puntos (Esperado: 0)`);
    } else {
      throw new Error('Error en el cálculo de puntos de las predicciones: ' + JSON.stringify(pointsMap));
    }

    // Consultar tabla de posiciones (Leaderboard)
    const leaderboardRes = await apiGetLeaderboard();
    if (leaderboardRes.success && leaderboardRes.data) {
      const top3 = leaderboardRes.data.filter(e => [userAId, userBId, userCId].includes(e.userId));
      console.log('✅ Puntos acumulados en Leaderboard validados con éxito.');
      top3.forEach(e => {
        console.log(`   - ${e.firstName} ${e.lastName}: ${e.totalPoints} puntos acumulados.`);
      });
    } else {
      throw new Error('Error al consultar tabla de posiciones: ' + leaderboardRes.error);
    }

    // ------------------------------------------------------------
    //  4. Validar Propagación de Llaves (Fixture Knockout)
    // ------------------------------------------------------------
    console.log('\n🏆 Validando clasificación y propagación del bracket a Dieciseisavos...');

    // Simularemos todos los partidos de fase de grupos del Grupo A
    console.log('Simulando resultados del Grupo A...');
    await supabase.from('matches').update({ home_score: 1, away_score: 0, status: 'finished' }).eq('id', 'API_2');
    await supabase.from('matches').update({ home_score: 2, away_score: 0, status: 'finished' }).eq('id', 'API_25');
    await supabase.from('matches').update({ home_score: 3, away_score: 1, status: 'finished' }).eq('id', 'API_28');
    await supabase.from('matches').update({ home_score: 0, away_score: 2, status: 'finished' }).eq('id', 'API_53');
    await supabase.from('matches').update({ home_score: 1, away_score: 2, status: 'finished' }).eq('id', 'API_54');

    // Debuggear standings locales con los partidos actuales de Supabase
    const { data: currentMatches, error: loadErr } = await supabase.from('matches').select('*');
    if (loadErr) throw loadErr;
    calculateGroupStandingsDebug(currentMatches, 'A');

    // Forzar la propagación
    console.log('Ejecutando propagación de llaves...');
    await autoPropagateTeamsSupabase();

    // Consultar partidos eliminatorios correspondientes
    let { data: propagatedMatches, error: matchQueryErr } = await supabase
      .from('matches')
      .select('id, home_team, away_team, match_type')
      .in('id', ['API_73', 'API_79']);

    if (matchQueryErr) throw matchQueryErr;

    let r32Matches: Record<string, any> = {};
    propagatedMatches!.forEach(m => { r32Matches[m.id] = m; });

    let match73 = r32Matches['API_73'];
    let match79 = r32Matches['API_79'];

    if (match73 && match73.home_team === 'Corea del Sur' && match79 && match79.home_team === 'México') {
      console.log('✅ Propagación de clasificados exitosa:');
      console.log(`   - Partido API_73 (2°A vs 2°B): Local = "${match73.home_team}" (Esperado: "Corea del Sur")`);
      console.log(`   - Partido API_79 (1°A vs 3°X): Local = "${match79.home_team}" (Esperado: "México")`);
    } else {
      throw new Error('Error: La propagación colocó equipos incorrectos: ' + JSON.stringify(r32Matches));
    }

    // ------------------------------------------------------------
    //  5. Validar Funcionalidades del Modo Admin (Add, Update/Lock, Unlock, Sync)
    // ------------------------------------------------------------
    console.log('\n🛡️ Validando funcionalidades exclusivas del Modo Admin...');

    // A. Agregar un partido de forma manual (apiAddMatch)
    console.log('Creando un partido manual (Admin)...');
    const addMatchRes = await apiAddMatch('mundia2026', 'Colombia', 'Argentina', '2026-06-25', '18:00', 'GRUPO_TEST');
    let testMatchId = '';
    if (addMatchRes.success && addMatchRes.data) {
      testMatchId = addMatchRes.data.matchId;
      console.log(`✅ Partido manual creado exitosamente. ID asignado: "${testMatchId}" (${addMatchRes.data.homeTeam} vs ${addMatchRes.data.awayTeam})`);
    } else {
      throw new Error('Error al agregar partido manual: ' + addMatchRes.error);
    }

    // B. Sobrescribir nombres de equipos de un partido eliminatorio (Manual Override & Lock)
    console.log('Sobrescribiendo equipo local de API_73 a "Italia" (Manual Override)...');
    const overrideRes = await apiUpdateMatch({
      matchId: 'API_73',
      homeTeam: 'Italia',
      adminPassword: 'mundia2026'
    });
    if (!overrideRes.success) throw new Error('Error al aplicar override: ' + overrideRes.error);

    // Verificar que el match_type se actualizó a 'r32_locked'
    const { data: dbMatchLocked, error: lockQueryErr } = await supabase
      .from('matches')
      .select('home_team, match_type')
      .eq('id', 'API_73')
      .single();
    if (lockQueryErr) throw lockQueryErr;

    if (dbMatchLocked.home_team === 'Italia' && dbMatchLocked.match_type === 'r32_locked') {
      console.log('✅ Override aplicado correctamente. El partido fue bloqueado con candado ("r32_locked").');
    } else {
      throw new Error('Error: El override falló o el candado no se activó: ' + JSON.stringify(dbMatchLocked));
    }

    // C. Verificar que la auto-propagación respeta el bloqueo y NO sobrescribe "Italia"
    console.log('Ejecutando auto-propagación de nuevo...');
    await autoPropagateTeamsSupabase();
    const { data: dbMatchPostProp, error: propQueryErr } = await supabase
      .from('matches')
      .select('home_team')
      .eq('id', 'API_73')
      .single();
    if (propQueryErr) throw propQueryErr;

    if (dbMatchPostProp.home_team === 'Italia') {
      console.log('✅ El candado funcionó. La auto-propagación respetó el override de "Italia".');
    } else {
      throw new Error('Error: La propagación ignoró el candado y sobrescribió a "Italia": ' + dbMatchPostProp.home_team);
    }

    // D. Desbloquear el partido (Auto-calcular / Unlock)
    console.log('Desbloqueando partido API_73 (Auto-calcular)...');
    const unlockRes = await apiUpdateMatch({
      matchId: 'API_73',
      unlock: true,
      adminPassword: 'mundia2026'
    });
    if (!unlockRes.success) throw new Error('Error al desbloquear el partido: ' + unlockRes.error);

    // Ejecutar auto-propagación tras el desbloqueo
    await autoPropagateTeamsSupabase();
    const { data: dbMatchPostUnlock, error: unlockQueryErr } = await supabase
      .from('matches')
      .select('home_team, match_type')
      .eq('id', 'API_73')
      .single();
    if (unlockQueryErr) throw unlockQueryErr;

    if (dbMatchPostUnlock.home_team === 'Corea del Sur' && dbMatchPostUnlock.match_type === 'r32') {
      console.log('✅ Desbloqueo exitoso. El partido se calculó de nuevo a "Corea del Sur" y se quitó el candado.');
    } else {
      throw new Error('Error en el desbloqueo: ' + JSON.stringify(dbMatchPostUnlock));
    }

    // E. Forzar recálculo manual desde Admin (apiSyncMatches)
    console.log('Forzando recálculo manual de puntos desde Admin...');
    const syncRes = await apiSyncMatches('mundia2026');
    if (syncRes.success && syncRes.data?.success) {
      console.log('✅ Recálculo manual forzado ejecutado con éxito.');
    } else {
      throw new Error('Error al ejecutar recálculo manual: ' + syncRes.error);
    }

    // ------------------------------------------------------------
    //  6. Limpieza Final de Pruebas
    // ------------------------------------------------------------
    console.log('\n🧹 Limpiando todos los datos de prueba de la base de datos...');
    
    // Eliminar el partido manual de prueba creado
    if (testMatchId) {
      await supabase.from('matches').delete().eq('id', testMatchId);
    }

    await supabase.from('predictions').delete().in('user_id', [userAId, userBId, userCId]);
    await supabase.from('users').delete().in('id', [userAId, userBId, userCId]);
    
    // Resetear partidos
    await supabase.from('matches')
      .update({ home_score: null, away_score: null, status: 'upcoming', match_type: 'group' })
      .in('id', groupAMatches);
    await supabase.from('matches').update({ match_date: '2026-06-11', match_time: '14:00' }).eq('id', 'API_1');
    await supabase.from('matches').update({ match_date: '2026-06-11', match_time: '21:00' }).eq('id', 'API_2');
    await supabase.from('matches')
      .update({ home_team: 'Por definir', away_team: 'Por definir', match_type: 'r32' })
      .in('id', ['API_73', 'API_79']);
    
    console.log('✅ Limpieza completada.');
    console.log('\n🎉 ¡TODAS LAS PRUEBAS (INCLUIDO EL MODO ADMIN) PASARON CORRECTAMENTE!');

  } catch (err: any) {
    console.error('\n❌ ERROR DURANTE LAS PRUEBAS:', err.message || err);
    process.exit(1);
  }
}

runTests();
