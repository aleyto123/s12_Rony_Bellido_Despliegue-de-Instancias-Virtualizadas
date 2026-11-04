const API_BASE = `${window.location.origin}/api`;
const TEAM_FLAGS = {
  Argentina: '🇦🇷', 'Arabia Saudita': '🇸🇦', Brasil: '🇧🇷', Serbia: '🇷🇸', Francia: '🇫🇷', Australia: '🇦🇺',
  Alemania: '🇩🇪', Japón: '🇯🇵', España: '🇪🇸', 'Costa Rica': '🇨🇷', Inglaterra: '🏴', México: '🇲🇽',
  Portugal: '🇵🇹', Ghana: '🇬🇭', Uruguay: '🇺🇾', 'Corea del Sur': '🇰🇷', Suiza: '🇨🇭'
};

const views = ['matches', 'groups', 'leaderboard', 'analytics', 'admin'];
const state = {
  token: localStorage.getItem('token') || '',
  user: readStoredUser(),
  currentView: 'matches',
  authMode: 'login',
  matches: [],
  predictions: [],
  groups: [],
  leaderboard: [],
  insights: [],
  drafts: {},
  matchFilter: 'all',
  selectedGroupId: null,
  theme: localStorage.getItem('theme') || 'dark'
};

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function showToast(message, type = 'info') {
  const region = document.getElementById('toast-region');
  const toast = document.createElement('div');
  const symbols = { success: '✓', error: '!', warning: '◷', info: 'i' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-symbol">${symbols[type] || 'i'}</span><span class="toast-message">${escapeHTML(message)}</span><span class="toast-timer"></span>`;
  region.append(toast);
  window.setTimeout(() => {
    toast.classList.add('toast-leaving');
    window.setTimeout(() => toast.remove(), 220);
  }, 4000);
}

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('No se pudo conectar con la API. Comprueba que el backend siga activo.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && state.user) logout(false);
    throw new Error(data.error || 'No se pudo completar la solicitud.');
  }
  return data;
}

function setAuthMode(mode) {
  state.authMode = mode;
  document.querySelectorAll('[data-auth-mode]').forEach((tab) => {
    const active = tab.dataset.authMode === mode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  const isRegister = mode === 'register';
  document.getElementById('terms-row').classList.toggle('hidden', !isRegister);
  document.getElementById('terms-check').required = isRegister;
  document.getElementById('auth-password').autocomplete = isRegister ? 'new-password' : 'current-password';
  document.querySelector('#auth-submit span:first-child').textContent = isRegister ? 'Crear cuenta' : 'Iniciar sesión';
  document.getElementById('auth-title').textContent = isRegister ? 'Crea tu perfil' : 'Entra al juego';
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('profile-name').textContent = state.user.username;
  document.getElementById('profile-avatar').textContent = state.user.username.slice(0, 1).toUpperCase();
  document.getElementById('admin-nav').classList.toggle('hidden', state.user.role !== 'admin');
  document.documentElement.dataset.theme = state.theme;
  document.getElementById('theme-toggle').textContent = state.theme === 'dark' ? '☼' : '☾';
  document.getElementById('local-zone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
  switchView(state.currentView);
}

function switchView(view) {
  if (view === 'admin' && state.user?.role !== 'admin') {
    showToast('El panel está disponible solo para administración.', 'warning');
    return;
  }
  state.currentView = views.includes(view) ? view : 'matches';
  views.forEach((name) => document.getElementById(`${name}-view`).classList.toggle('hidden', name !== state.currentView));
  document.querySelectorAll('[data-view]').forEach((button) => {
    const active = button.dataset.view === state.currentView;
    button.classList.toggle('is-active', active);
    if (button.matches('.nav-link')) button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  if (state.currentView === 'groups') renderGroups();
  if (state.currentView === 'leaderboard') renderLeaderboard();
  if (state.currentView === 'analytics') renderAnalytics();
  if (state.currentView === 'admin') renderAdmin();
}

function setLoading(container, kind = 'match') {
  container.innerHTML = Array.from({ length: 3 }, () => `<div class="skeleton skeleton-${kind}"><i></i><i></i><i></i></div>`).join('');
}

async function loadData() {
  const matchList = document.getElementById('match-list');
  setLoading(matchList);
  try {
    const [matches, predictions, groups, leaderboard, insights] = await Promise.all([
      apiFetch('/matches'), apiFetch('/matches/predictions/me'), apiFetch('/groups'),
      apiFetch('/leaderboard/global'), apiFetch('/ai/insights')
    ]);
    state.matches = matches;
    state.predictions = predictions;
    state.groups = groups;
    state.leaderboard = leaderboard;
    state.insights = insights.insights || [];
    renderMatches();
    updateProfilePoints();
    if (state.currentView === 'groups') renderGroups();
    if (state.currentView === 'leaderboard') renderLeaderboard();
    if (state.currentView === 'analytics') renderAnalytics();
    if (state.currentView === 'admin') renderAdmin();
    const inviteCode = new URLSearchParams(window.location.search).get('join');
    if (inviteCode) openGroupModal('join-group', inviteCode);
  } catch (error) {
    matchList.innerHTML = `<div class="empty-state"><span class="empty-mark">!</span><h3>No pudimos cargar los partidos</h3><p>${escapeHTML(error.message)}</p><button class="button button-quiet" data-action="reload" type="button">Intentar otra vez</button></div>`;
    showToast(error.message, 'error');
  }
}

function userPrediction(matchId) {
  return state.predictions.find((prediction) => Number(prediction.match_id) === Number(matchId));
}

function getMatchState(match) {
  if (match.home_score !== null && match.away_score !== null) return { label: 'Finalizado', tone: 'final', locked: true };
  if (match.status === 'live') return { label: 'En juego · cerrado', tone: 'locked', locked: true };
  const minutes = (new Date(match.kickoff_at).getTime() - Date.now()) / 60000;
  if (minutes <= 10) return { label: minutes < 0 ? 'En juego · cerrado' : 'Cierre de pronóstico', tone: 'locked', locked: true };
  if (minutes > 1440) return { label: 'Anticipada · +1 pt', tone: 'early', locked: false };
  return { label: 'Puntos base', tone: 'soon', locked: false };
}

function formatKickoff(date) {
  return new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

function renderMatchCard(match) {
  const prediction = userPrediction(match.id);
  const timing = getMatchState(match);
  const saved = Boolean(prediction);
  const disabled = timing.locked || saved;
  const homeValue = state.drafts[match.id]?.home ?? prediction?.home_score ?? 0;
  const awayValue = state.drafts[match.id]?.away ?? prediction?.away_score ?? 0;
  const score = timing.tone === 'final' ? `<span class="real-score">${match.home_score}<i>:</i>${match.away_score}</span>` : '<span class="vs-label">VS</span>';
  const saveLabel = saved ? 'Pronóstico guardado' : timing.locked ? 'Pronóstico cerrado' : 'Guardar pronóstico';
  return `<article class="match-card ${timing.tone === 'final' ? 'match-finished' : ''}" data-match-card="${match.id}">
    <div class="match-card-top"><span class="match-stage">PARTIDO ${String(match.id).padStart(2, '0')} <i>·</i> FASE DE GRUPOS</span><span class="match-time">${escapeHTML(formatKickoff(match.kickoff_at))}</span></div>
    <div class="match-card-main">
      <div class="team-side"><span class="team-flag">${TEAM_FLAGS[match.home_team] || '⚽'}</span><span class="team-name">${escapeHTML(match.home_team)}</span><div class="score-stepper"><button data-step="-1" data-match="${match.id}" data-team="home" type="button" aria-label="Quitar gol local" ${disabled ? 'disabled' : ''}>−</button><input data-score="home" data-match="${match.id}" type="number" min="0" max="20" value="${homeValue}" aria-label="Goles de ${escapeHTML(match.home_team)}" ${disabled ? 'disabled' : ''} /><button data-step="1" data-match="${match.id}" data-team="home" type="button" aria-label="Sumar gol local" ${disabled ? 'disabled' : ''}>+</button></div></div>
      <div class="match-center">${score}<span class="center-line"></span></div>
      <div class="team-side team-away"><span class="team-flag">${TEAM_FLAGS[match.away_team] || '⚽'}</span><span class="team-name">${escapeHTML(match.away_team)}</span><div class="score-stepper"><button data-step="-1" data-match="${match.id}" data-team="away" type="button" aria-label="Quitar gol visitante" ${disabled ? 'disabled' : ''}>−</button><input data-score="away" data-match="${match.id}" type="number" min="0" max="20" value="${awayValue}" aria-label="Goles de ${escapeHTML(match.away_team)}" ${disabled ? 'disabled' : ''} /><button data-step="1" data-match="${match.id}" data-team="away" type="button" aria-label="Sumar gol visitante" ${disabled ? 'disabled' : ''}>+</button></div></div>
    </div>
    <div class="match-card-bottom"><span class="timing-badge badge-${timing.tone}"><i></i>${timing.tone === 'locked' ? '▣ ' : ''}${timing.label}</span>${saved ? `<span class="saved-note">Tu jugada: ${prediction.home_score} – ${prediction.away_score}</span>` : `<button class="match-save" data-save-match="${match.id}" type="button" ${timing.locked ? 'disabled' : ''}>${saveLabel}<span aria-hidden="true">↗</span></button>`}</div>
  </article>`;
}

function renderMatches() {
  const search = document.getElementById('match-search').value.trim().toLocaleLowerCase('es');
  const filtered = state.matches.filter((match) => {
    const hasPrediction = Boolean(userPrediction(match.id));
    const finished = match.home_score !== null && match.away_score !== null;
    const matchesFilter = state.matchFilter === 'all'
      || (state.matchFilter === 'pending' && !hasPrediction && !finished && !getMatchState(match).locked)
      || (state.matchFilter === 'predicted' && hasPrediction)
      || (state.matchFilter === 'finished' && finished);
    const matchesSearch = `${match.home_team} ${match.away_team}`.toLocaleLowerCase('es').includes(search);
    return matchesFilter && matchesSearch;
  });
  document.getElementById('match-count').textContent = `${String(filtered.length).padStart(2, '0')} PARTIDOS`;
  const list = document.getElementById('match-list');
  list.innerHTML = filtered.length
    ? filtered.map(renderMatchCard).join('')
    : '<div class="empty-state"><span class="empty-mark">⌕</span><h3>No hay partidos en esta vista</h3><p>Prueba otro filtro o búsqueda.</p></div>';
  updateSaveDock();
}

function updateDraft(matchId, team, value) {
  const match = state.matches.find((item) => Number(item.id) === Number(matchId));
  if (!match || userPrediction(matchId) || getMatchState(match).locked) return;
  const score = Math.max(0, Math.min(20, Number.parseInt(value, 10) || 0));
  state.drafts[matchId] = { ...(state.drafts[matchId] || {}), [team]: score };
  const input = document.querySelector(`[data-score="${team}"][data-match="${matchId}"]`);
  if (input) input.value = score;
  updateSaveDock();
}

function updateSaveDock() {
  const count = Object.keys(state.drafts).length;
  document.getElementById('pending-count').textContent = count;
  document.getElementById('save-dock').classList.toggle('hidden', count === 0 || state.currentView !== 'matches');
}

async function savePrediction(matchId) {
  const match = state.matches.find((item) => Number(item.id) === Number(matchId));
  if (!match || !state.drafts[matchId]) return;
  const button = document.querySelector(`[data-save-match="${matchId}"]`);
  if (button) { button.disabled = true; button.innerHTML = '<span class="spinner"></span> Guardando'; }
  try {
    await apiFetch(`/matches/${matchId}/predictions`, { method: 'POST', body: JSON.stringify({ home_score: state.drafts[matchId].home ?? 0, away_score: state.drafts[matchId].away ?? 0 }) });
    delete state.drafts[matchId];
    state.predictions = await apiFetch('/matches/predictions/me');
    updateProfilePoints();
    renderMatches();
    showToast('Pronóstico guardado. ¡Que ruede el balón!', 'success');
  } catch (error) {
    if (button) { button.disabled = false; button.textContent = 'Guardar pronóstico'; }
    showToast(error.message, 'error');
  }
}

async function saveAllPredictions() {
  const entries = Object.entries(state.drafts);
  if (!entries.length) return;
  const saveButton = document.getElementById('save-all-button');
  saveButton.disabled = true;
  saveButton.innerHTML = '<span class="spinner"></span> Guardando…';
  let savedCount = 0;
  for (const [matchId, score] of entries) {
    try {
      await apiFetch(`/matches/${matchId}/predictions`, { method: 'POST', body: JSON.stringify({ home_score: score.home ?? 0, away_score: score.away ?? 0 }) });
      delete state.drafts[matchId];
      savedCount += 1;
    } catch (error) {
      showToast(`${state.matches.find((match) => String(match.id) === matchId)?.home_team || 'Partido'}: ${error.message}`, 'error');
      delete state.drafts[matchId];
    }
  }
  state.predictions = await apiFetch('/matches/predictions/me').catch(() => state.predictions);
  updateProfilePoints();
  renderMatches();
  saveButton.disabled = false;
  saveButton.innerHTML = 'Guardar todos <span aria-hidden="true">↗</span>';
  if (savedCount) showToast(`${savedCount} pronóstico${savedCount === 1 ? '' : 's'} guardado${savedCount === 1 ? '' : 's'}.`, 'success');
}

function updateProfilePoints() {
  const points = state.predictions.reduce((sum, prediction) => sum + Number(prediction.points || 0), 0);
  const target = document.getElementById('profile-points');
  const start = Number(target.textContent) || 0;
  const duration = 360;
  const began = performance.now();
  function tick(now) {
    const progress = Math.min(1, (now - began) / duration);
    target.textContent = Math.round(start + (points - start) * progress);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderGroups() {
  const list = document.getElementById('group-list');
  document.getElementById('group-summary').textContent = `${state.groups.length} sala${state.groups.length === 1 ? '' : 's'} privada${state.groups.length === 1 ? '' : 's'} · comparte tu código para invitar.`;
  list.innerHTML = state.groups.length ? state.groups.map((group, index) => `<article class="group-card"><div class="group-card-top"><span class="group-emblem">${['01', '02', '03'][index % 3]}</span><span class="group-status">PRIVADA</span></div><h2>${escapeHTML(group.name)}</h2><p>Creada ${new Date(group.created_at).toLocaleDateString('es')}</p><div class="invite-code-row"><span>CÓDIGO <b>${escapeHTML(group.invite_code)}</b></span><button class="icon-button copy-code" data-code="${escapeHTML(group.invite_code)}" type="button" title="Copiar código" aria-label="Copiar código">▣</button></div><button class="button button-quiet group-open" data-group-id="${group.id}" type="button">Ver clasificación <span>↗</span></button></article>`).join('') : '<div class="empty-state group-empty"><span class="empty-mark">＋</span><h3>Tu primera sala empieza aquí</h3><p>Crea una quiniela privada o únete con un código de invitación.</p><div class="empty-actions"><button class="button button-primary" data-modal="create-group" type="button">Crear sala</button><button class="button button-quiet" data-modal="join-group" type="button">Unirse con código</button></div></div>';
}

async function openGroupDetail(groupId) {
  const group = state.groups.find((item) => Number(item.id) === Number(groupId));
  if (!group) return;
  const detail = document.getElementById('group-detail');
  detail.classList.remove('hidden');
  detail.innerHTML = '<div class="skeleton skeleton-table"><i></i><i></i><i></i></div>';
  try {
    const ranking = await apiFetch(`/groups/${groupId}/leaderboard`);
    detail.innerHTML = `<div class="detail-heading"><div><p class="eyebrow">CLASIFICACIÓN PRIVADA</p><h2>${escapeHTML(group.name)}</h2><p>Código de sala: <b>${escapeHTML(group.invite_code)}</b></p></div><button class="icon-button" data-action="close-group-detail" type="button" aria-label="Cerrar sala">×</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>POS.</th><th>PARTICIPANTE</th><th>PUNTOS</th></tr></thead><tbody>${ranking.map((row, index) => `<tr><td>${rankMark(index)}</td><td>${escapeHTML(row.username)}</td><td class="points-cell">${Number(row.total_points) || 0} <small>PTS</small></td></tr>`).join('')}</tbody></table></div>`;
    state.selectedGroupId = Number(groupId);
    detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { showToast(error.message, 'error'); }
}

function rankMark(index) {
  return index < 3 ? `<span class="rank-medal medal-${index + 1}">${['I', 'II', 'III'][index]}</span>` : `<span class="rank-number">${String(index + 1).padStart(2, '0')}</span>`;
}

function renderLeaderboard() {
  const search = document.getElementById('leaderboard-search').value.trim().toLocaleLowerCase('es');
  const sorted = [...state.leaderboard].sort((a, b) => Number(b.total_points) - Number(a.total_points));
  const currentRank = sorted.findIndex((entry) => entry.username === state.user.username);
  const current = currentRank >= 0 ? sorted[currentRank] : { username: state.user.username, total_points: 0 };
  const top = sorted.slice(0, 3);
  document.getElementById('leaderboard-summary').innerHTML = `<div class="podium-intro"><span class="eyebrow">AL FRENTE DEL TORNEO</span><strong>${sorted.length} <small>JUGADORES</small></strong></div><div class="podium-list">${top.length ? top.map((entry, index) => `<div class="podium-entry"><span class="podium-place">${['01', '02', '03'][index]}</span><span class="avatar">${escapeHTML(entry.username.slice(0, 1).toUpperCase())}</span><span class="podium-name">${escapeHTML(entry.username)}</span><b>${Number(entry.total_points) || 0}<small>PTS</small></b></div>`).join('') : '<span class="muted-label">Todavía no hay puntuaciones.</span>'}</div>`;
  const filtered = sorted.filter((entry) => entry.username.toLocaleLowerCase('es').includes(search));
  document.getElementById('leaderboard-body').innerHTML = filtered.length ? filtered.map((entry) => {
    const index = sorted.indexOf(entry);
    return `<tr class="${entry.username === state.user.username ? 'is-current-user' : ''}"><td>${rankMark(index)}</td><td><span class="table-player"><span class="avatar avatar-small">${escapeHTML(entry.username.slice(0, 1).toUpperCase())}</span>${escapeHTML(entry.username)}${entry.username === state.user.username ? '<small class="you-tag">TÚ</small>' : ''}</span></td><td>${Number(entry.total_predictions) || 0}</td><td>${Number(entry.exact_hits) || 0}</td><td>${Number(entry.winner_hits) || 0}</td><td>${Number(entry.goal_difference_hits) || 0}</td><td class="points-cell">${Number(entry.total_points) || 0} <small>PTS</small></td></tr>`;
  }).join('') : '<tr><td colspan="7" class="table-empty">No encontramos participantes con ese nombre.</td></tr>';
  const currentRow = document.getElementById('current-player-row');
  currentRow.classList.toggle('hidden', currentRank < 5);
  currentRow.innerHTML = `<span>Tu posición <b>#${String(currentRank + 1).padStart(2, '0')}</b></span><span>${Number(current.total_points) || 0} PTS</span>`;
}

function getWinner(home, away) {
  return home === away ? 'draw' : home > away ? 'home' : 'away';
}

function scoreBreakdown(homePrediction, awayPrediction, homeActual, awayActual, early = false, previousStreak = 0) {
  const exact = homePrediction === homeActual && awayPrediction === awayActual;
  const winner = getWinner(homePrediction, awayPrediction) === getWinner(homeActual, awayActual);
  const difference = winner && Math.abs(homePrediction - awayPrediction) === Math.abs(homeActual - awayActual);
  const streak = winner && (previousStreak + 1) % 3 === 0;
  return { exact: exact ? 5 : 0, winner: winner && !exact ? 3 : 0, difference: difference && !exact ? 2 : 0, streak: streak ? 2 : 0, early: early ? 1 : 0 };
}

function renderAnalytics() {
  const list = document.getElementById('ai-list');
  const insightValues = state.insights;
  list.innerHTML = insightValues.length ? insightValues.map((team, index) => `<article class="ai-card"><div class="ai-card-heading"><span class="ai-rank">${String(index + 1).padStart(2, '0')}</span><span class="team-flag">${TEAM_FLAGS[team.team] || '⚽'}</span><strong>${escapeHTML(team.team)}</strong><span class="confidence-tag">${escapeHTML(team.confidence || 'DEMO')}</span></div><div class="probability-row"><span>Probabilidad indicativa</span><b>${Number(team.winProbability) || 0}%</b></div><div class="probability-track"><i style="--probability:${Math.max(0, Math.min(100, Number(team.winProbability) || 0))}%"></i></div><p>Forma reciente <b>${escapeHTML(team.form || 'Sin datos')}</b></p></article>`).join('') : '<div class="empty-state"><h3>Sin datos de modelo</h3><p>Las estimaciones aparecerán cuando la API las publique.</p></div>';
  const completed = state.predictions.map((prediction) => ({ prediction, match: state.matches.find((match) => Number(match.id) === Number(prediction.match_id)) })).filter((item) => item.match && item.match.home_score !== null && item.match.away_score !== null);
  const exact = completed.filter(({ prediction, match }) => Number(prediction.home_score) === Number(match.home_score) && Number(prediction.away_score) === Number(match.away_score)).length;
  const winners = completed.filter(({ prediction, match }) => getWinner(Number(prediction.home_score), Number(prediction.away_score)) === getWinner(Number(match.home_score), Number(match.away_score))).length;
  const accuracy = completed.length ? Math.round((winners / completed.length) * 100) : 0;
  document.getElementById('accuracy-value').textContent = `${accuracy}%`;
  document.getElementById('accuracy-ring').style.setProperty('--accuracy', `${accuracy * 3.6}deg`);
  document.getElementById('personal-predictions').textContent = state.predictions.length;
  document.getElementById('personal-exact').textContent = exact;
  document.getElementById('personal-winners').textContent = winners;
}

function renderAdmin() {
  if (state.user.role !== 'admin') return;
  const list = document.getElementById('admin-match-list');
  list.innerHTML = state.matches.map((match) => `<article class="admin-match"><div class="admin-match-info"><span class="match-stage">PARTIDO ${String(match.id).padStart(2, '0')}</span><h3>${escapeHTML(match.home_team)} <i>vs</i> ${escapeHTML(match.away_team)}</h3><span>${escapeHTML(formatKickoff(match.kickoff_at))} · ${match.status === 'completed' ? 'Finalizado' : match.status === 'live' ? 'En juego' : 'Programado'}</span></div><form class="admin-result-form" data-admin-match="${match.id}"><label class="admin-status"><span>ESTADO</span><select name="status"><option value="scheduled" ${match.status === 'scheduled' ? 'selected' : ''}>Programado</option><option value="live" ${match.status === 'live' ? 'selected' : ''}>En juego</option><option value="completed" ${match.status === 'completed' ? 'selected' : ''}>Finalizado</option></select></label><label><span>LOCAL</span><input name="home_score" type="number" min="0" max="20" value="${match.home_score ?? ''}" placeholder="–" /></label><b>:</b><label><span>VISITANTE</span><input name="away_score" type="number" min="0" max="20" value="${match.away_score ?? ''}" placeholder="–" /></label><button class="button button-quiet" type="submit">Guardar</button></form></article>`).join('') || '<div class="empty-state"><h3>No hay partidos cargados</h3></div>';
}

function showModal(content) {
  const modal = document.getElementById('app-modal');
  document.getElementById('modal-body').innerHTML = content;
  modal.showModal();
}

function closeModal() {
  document.getElementById('app-modal').close();
}

function openGroupModal(type, inviteCode = '') {
  if (type === 'create-group') {
    showModal(`<p class="eyebrow">NUEVA COMUNIDAD</p><h2>Crea tu sala</h2><p class="modal-description">Ponle nombre y comparte el código con tu grupo.</p><form id="create-group-form" class="form-stack"><label class="field-label" for="new-group-name">Nombre de la sala</label><input id="new-group-name" name="name" maxlength="48" placeholder="Ej. Quiniela del barrio" required /><button class="button button-primary button-wide" type="submit">Generar sala <span>↗</span></button></form>`);
  } else {
    showModal(`<p class="eyebrow">TE INVITARON A JUGAR</p><h2>Únete a una sala</h2><p class="modal-description">Ingresa el código de invitación que te compartieron.</p><form id="join-group-form" class="form-stack"><label class="field-label" for="join-code">Código de invitación</label><input id="join-code" name="invite_code" class="invite-input" maxlength="12" value="${escapeHTML(inviteCode)}" placeholder="ABC123" autocomplete="off" required /><button class="button button-primary button-wide" type="submit">Unirme al grupo <span>↗</span></button></form>`);
  }
}

function openRulesModal() {
  showModal(`<p class="eyebrow">REGLAS DE LA QUINIELA</p><h2>Cada acierto suma.</h2><div class="rules-list"><div><b>+5</b><span><strong>Marcador exacto</strong><small>Acertar los goles de ambos equipos.</small></span></div><div><b>+3</b><span><strong>Ganador correcto</strong><small>Acertar la victoria local, visitante o empate.</small></span></div><div><b>+2</b><span><strong>Diferencia de goles</strong><small>El mismo ganador y el mismo margen, sin marcador exacto.</small></span></div><div><b>+2</b><span><strong>Racha de tres</strong><small>Cada tres ganadores acertados seguidos.</small></span></div><div><b>+1</b><span><strong>Anticipación</strong><small>Pronosticar con más de 24 horas de antelación.</small></span></div></div><div class="calculator"><div class="section-title"><div><h3>Prueba el marcador</h3><p>Simula puntos base y el bonus por anticipación.</p></div></div><div class="calculator-fields"><label>Tu pronóstico<div><input id="calc-home-pred" aria-label="Goles locales pronosticados" type="number" min="0" max="20" value="2"><i>:</i><input id="calc-away-pred" aria-label="Goles visitantes pronosticados" type="number" min="0" max="20" value="1"></div></label><label>Resultado real<div><input id="calc-home-real" aria-label="Goles locales reales" type="number" min="0" max="20" value="2"><i>:</i><input id="calc-away-real" aria-label="Goles visitantes reales" type="number" min="0" max="20" value="1"></div></label></div><label class="check-row"><input id="calc-early" type="checkbox" checked> <span>Lo pronostiqué con más de 24 horas</span></label><div id="calculator-result" class="calculator-result"></div></div>`);
  ['calc-home-pred', 'calc-away-pred', 'calc-home-real', 'calc-away-real', 'calc-early'].forEach((id) => document.getElementById(id).addEventListener('input', updateCalculator));
  updateCalculator();
}

function updateCalculator() {
  const values = ['calc-home-pred', 'calc-away-pred', 'calc-home-real', 'calc-away-real'].map((id) => Number(document.getElementById(id).value) || 0);
  const points = scoreBreakdown(...values, document.getElementById('calc-early').checked);
  const labels = [['exact', 'Exacto'], ['winner', 'Ganador'], ['difference', 'Diferencia'], ['streak', 'Racha'], ['early', 'Anticipación']];
  const total = Object.values(points).reduce((sum, value) => sum + value, 0);
  document.getElementById('calculator-result').innerHTML = `<div class="breakdown-list">${labels.map(([key, label]) => `<span>${label}<b class="${points[key] ? 'earned' : ''}">${points[key] ? `+${points[key]}` : '—'}</b></span>`).join('')}</div><div class="total-points"><span>PUNTOS TOTALES</span><b>${total}<small>PTS</small></b></div>`;
}

function logout(confirm = true) {
  if (confirm) {
    showModal('<p class="eyebrow">SALIR DE CANCHA 26</p><h2>¿Cerrar sesión?</h2><p class="modal-description">Tu progreso queda guardado. Puedes volver cuando quieras.</p><div class="modal-actions"><button class="button button-quiet" data-action="cancel-logout" type="button">Seguir aquí</button><button class="button button-primary" data-action="confirm-logout" type="button">Cerrar sesión</button></div>');
    return;
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  state.token = '';
  state.user = null;
  closeModal();
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  showToast('Sesión cerrada.', 'info');
}

async function submitAuth(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (state.authMode === 'register' && !document.getElementById('terms-check').checked) {
    showToast('Acepta las reglas para crear tu cuenta.', 'warning');
    return;
  }
  const button = document.getElementById('auth-submit');
  button.disabled = true;
  button.innerHTML = `<span class="spinner"></span>${state.authMode === 'register' ? 'Creando cuenta…' : 'Ingresando…'}`;
  try {
    const action = state.authMode === 'register' ? 'register' : 'login';
    const data = await apiFetch(`/auth/${action}`, { method: 'POST', body: JSON.stringify({ username: form.username.value.trim(), password: form.password.value }) });
    state.token = data.token;
    state.user = data.user;
    state.currentView = 'matches';
    localStorage.setItem('token', state.token);
    localStorage.setItem('user', JSON.stringify(state.user));
    showApp();
    await loadData();
    showToast(state.authMode === 'register' ? 'Cuenta creada. ¡Bienvenido al torneo!' : `Qué bueno verte, ${state.user.username}.`, 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = `<span>${state.authMode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}</span><span aria-hidden="true">↗</span>`;
  }
}

async function submitGroupForm(event, mode) {
  event.preventDefault();
  const form = event.currentTarget;
  const path = mode === 'create' ? '/groups' : '/groups/join';
  const payload = mode === 'create' ? { name: form.name.value.trim() } : { invite_code: form.invite_code.value.trim().toUpperCase() };
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const result = await apiFetch(path, { method: 'POST', body: JSON.stringify(payload) });
    if (mode === 'create') {
      showModal(`<span class="success-mark">✓</span><p class="eyebrow">SALA LISTA</p><h2>${escapeHTML(result.name)}</h2><p class="modal-description">Comparte este código con las personas que jugarán contigo.</p><div class="created-code"><span>CÓDIGO DE INVITACIÓN</span><strong>${escapeHTML(result.invite_code)}</strong></div><div class="modal-actions"><button class="button button-quiet" data-code="${escapeHTML(result.invite_code)}" data-action="copy-code" type="button">Copiar código</button><button class="button button-primary" data-action="share-code" data-code="${escapeHTML(result.invite_code)}" data-name="${escapeHTML(result.name)}" type="button">Compartir por WhatsApp</button></div>`);
      showToast('Sala creada correctamente.', 'success');
    } else {
      closeModal();
      showToast('Ya estás dentro de la sala.', 'success');
    }
    state.groups = await apiFetch('/groups');
    renderGroups();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function saveAdminResult(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const matchId = form.dataset.adminMatch;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    if (form.status.value !== 'completed') {
      await apiFetch(`/admin/matches/${matchId}/status`, { method: 'PATCH', body: JSON.stringify({ status: form.status.value }) });
      state.matches = await apiFetch('/matches');
      renderAdmin();
      showToast('Estado del partido actualizado.', 'success');
      return;
    }
    if (form.home_score.value === '' || form.away_score.value === '') {
      showToast('Ingresa ambos goles para finalizar el partido.', 'warning');
      return;
    }
    await apiFetch(`/admin/matches/${matchId}/result`, { method: 'POST', body: JSON.stringify({ home_score: Number(form.home_score.value), away_score: Number(form.away_score.value) }) });
    state.matches = await apiFetch('/matches');
    state.predictions = await apiFetch('/matches/predictions/me');
    state.leaderboard = await apiFetch('/leaderboard/global');
    renderAdmin();
    showToast('Marcador actualizado y puntos recalculados.', 'success');
  } catch (error) { showToast(error.message, 'error'); }
  finally { button.disabled = false; }
}

async function recalculateScores() {
  const button = document.getElementById('recalculate-button');
  button.disabled = true;
  button.innerHTML = '<span class="spinner"></span> Procesando…';
  try {
    await apiFetch('/admin/recalculate', { method: 'POST' });
    state.predictions = await apiFetch('/matches/predictions/me');
    state.leaderboard = await apiFetch('/leaderboard/global');
    updateProfilePoints();
    showToast('Puntuaciones y ranking actualizados.', 'success');
  } catch (error) { showToast(error.message, 'error'); }
  finally { button.disabled = false; button.innerHTML = '↻ Procesar puntos'; }
}

function bindEvents() {
  document.querySelectorAll('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));
  document.getElementById('auth-form').addEventListener('submit', submitAuth);
  document.querySelector('.password-toggle').addEventListener('click', (event) => {
    const input = document.getElementById('auth-password');
    input.type = input.type === 'password' ? 'text' : 'password';
    event.currentTarget.setAttribute('aria-label', input.type === 'password' ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
  document.getElementById('match-search').addEventListener('input', renderMatches);
  document.getElementById('leaderboard-search').addEventListener('input', renderLeaderboard);
  document.querySelectorAll('[data-match-filter]').forEach((button) => button.addEventListener('click', () => {
    state.matchFilter = button.dataset.matchFilter;
    document.querySelectorAll('[data-match-filter]').forEach((item) => item.classList.toggle('is-active', item === button));
    renderMatches();
  }));
  document.getElementById('match-list').addEventListener('click', (event) => {
    const stepper = event.target.closest('[data-step]');
    if (stepper) {
      const input = document.querySelector(`[data-score="${stepper.dataset.team}"][data-match="${stepper.dataset.match}"]`);
      updateDraft(stepper.dataset.match, stepper.dataset.team, Number(input.value) + Number(stepper.dataset.step));
      return;
    }
    const save = event.target.closest('[data-save-match]');
    if (save) savePrediction(save.dataset.saveMatch);
  });
  document.getElementById('match-list').addEventListener('change', (event) => {
    if (event.target.matches('[data-score]')) updateDraft(event.target.dataset.match, event.target.dataset.score, event.target.value);
  });
  document.getElementById('save-all-button').addEventListener('click', saveAllPredictions);
  document.getElementById('group-list').addEventListener('click', async (event) => {
    const open = event.target.closest('.group-open');
    if (open) openGroupDetail(open.dataset.groupId);
    const copy = event.target.closest('.copy-code');
    if (copy) copyCode(copy.dataset.code);
  });
  document.getElementById('group-detail').addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close-group-detail"]')) document.getElementById('group-detail').classList.add('hidden');
  });
  document.getElementById('admin-match-list').addEventListener('submit', (event) => {
    if (event.target.matches('.admin-result-form')) saveAdminResult(event);
  });
  document.getElementById('recalculate-button').addEventListener('click', recalculateScores);
  document.querySelectorAll('.rules-open, .floating-rules').forEach((button) => button.addEventListener('click', openRulesModal));
  document.getElementById('theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem('theme', state.theme);
    document.getElementById('theme-toggle').textContent = state.theme === 'dark' ? '☼' : '☾';
  });
  document.getElementById('notifications-button').addEventListener('click', () => showToast('No tienes novedades pendientes.', 'info'));
  document.getElementById('logout-button').addEventListener('click', () => logout(true));
  document.getElementById('mobile-profile').addEventListener('click', () => showToast(`${state.user.username} · ${document.getElementById('profile-points').textContent} puntos`, 'info'));
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('app-modal').addEventListener('click', (event) => { if (event.target === event.currentTarget) closeModal(); });
  document.getElementById('modal-body').addEventListener('submit', (event) => {
    if (event.target.id === 'create-group-form') submitGroupForm(event, 'create');
    if (event.target.id === 'join-group-form') submitGroupForm(event, 'join');
  });
  document.getElementById('modal-body').addEventListener('input', (event) => {
    if (event.target.id === 'join-code') event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  });
  document.getElementById('modal-body').addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    const code = event.target.closest('[data-code]')?.dataset.code;
    if (action === 'confirm-logout') logout(false);
    if (action === 'cancel-logout') closeModal();
    if (action === 'copy-code' || (!action && event.target.closest('[data-code]'))) copyCode(code);
    if (action === 'share-code') {
      const name = event.target.closest('[data-name]')?.dataset.name || 'mi sala';
      const link = `${window.location.origin}/?join=${encodeURIComponent(code)}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(`Únete a ${name} en Cancha 26: ${link}`)}`, '_blank', 'noopener');
    }
  });
  document.addEventListener('click', (event) => {
    const modalTrigger = event.target.closest('[data-modal]');
    if (modalTrigger) openGroupModal(modalTrigger.dataset.modal);
    if (event.target.closest('[data-action="reload"]')) loadData();
  });
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    showToast('Código copiado al portapapeles.', 'success');
  } catch { showToast(`Código de invitación: ${code}`, 'info'); }
}

function initialize() {
  bindEvents();
  setAuthMode('login');
  if (state.token && state.user) {
    showApp();
    loadData();
  } else {
    document.getElementById('auth-screen').classList.remove('hidden');
  }
}

initialize();