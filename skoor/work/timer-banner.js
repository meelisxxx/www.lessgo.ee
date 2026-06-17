// Skoor admin — jagatud running-timer banner
// Kasutamine:
//   <link rel="stylesheet" href="timer-banner.css">
//   <script src="timer-banner.js" defer></script>
//   ... peale auth + clients laadimist:
//   await SkoorTimerBanner.init({ sb, currentUser, getClientName });
//
// Iga lehe enda timer-mutatsiooni järel (start/stop) kutsu:
//   SkoorTimerBanner.refresh();
(function () {
  const BANNER_ID = 'skoor-timer-banner';
  const STOP_MODAL_ID = 'skoor-timer-stop-modal';
  let _sb = null;
  let _user = null;
  let _getClientName = (id) => id;
  let _activeTimer = null;
  let _baseTitle = '';
  let _tickInterval = null;
  let _pollInterval = null;
  const _clientCache = {};

  function fmt(ms) {
    const t = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function mountBanner() {
    if (document.getElementById(BANNER_ID)) return;
    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'running-banner';
    banner.innerHTML = `
      <div class="running-info">
        <div class="pulse"></div>
        <div class="running-text">
          <span class="running-label">TIMER JOOKSEB</span>
          <span class="running-client" data-tb-client>—</span>
        </div>
        <span class="running-time" data-tb-time>0:00:00</span>
      </div>
      <button class="btn-danger" data-tb-stop>⏹ Stop</button>
    `;
    // Sidebar-layout: pane bänner <main> etteotsa. Fallback vanale
    // header-layout'ile ja viimaks body algusesse.
    const main = document.querySelector('#app main') || document.querySelector('main');
    if (main) {
      main.insertBefore(banner, main.firstChild);
    } else {
      const header = document.querySelector('header');
      if (header && header.parentNode) {
        header.parentNode.insertBefore(banner, header.nextSibling);
      } else {
        document.body.insertBefore(banner, document.body.firstChild);
      }
    }

    const modal = document.createElement('div');
    modal.id = STOP_MODAL_ID;
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <h3>Peata timer</h3>
        <div class="field">
          <label for="skoor-tb-stop-comment">Kommentaar (valikuline)</label>
          <textarea id="skoor-tb-stop-comment" rows="3" placeholder="Mida tegid?"></textarea>
        </div>
        <p class="modal-error" data-tb-stop-error></p>
        <div class="modal-actions">
          <button class="btn-secondary" data-tb-stop-cancel>Tühista</button>
          <button class="btn-primary" data-tb-stop-confirm>Peata ja salvesta</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    banner.querySelector('[data-tb-stop]').addEventListener('click', openStopModal);
    modal.querySelector('[data-tb-stop-cancel]').addEventListener('click', closeStopModal);
    modal.querySelector('[data-tb-stop-confirm]').addEventListener('click', confirmStop);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeStopModal();
    });
  }

  function openStopModal() {
    if (!_activeTimer) return;
    const modal = document.getElementById(STOP_MODAL_ID);
    document.getElementById('skoor-tb-stop-comment').value = '';
    modal.querySelector('[data-tb-stop-error]').textContent = '';
    modal.classList.add('visible');
  }

  function closeStopModal() {
    const modal = document.getElementById(STOP_MODAL_ID);
    if (modal) modal.classList.remove('visible');
  }

  async function confirmStop() {
    if (!_activeTimer) { closeStopModal(); return; }
    const modal = document.getElementById(STOP_MODAL_ID);
    const errEl = modal.querySelector('[data-tb-stop-error]');
    const btn = modal.querySelector('[data-tb-stop-confirm]');
    const comment = document.getElementById('skoor-tb-stop-comment').value.trim() || null;
    btn.disabled = true;
    const { error } = await _sb.from('time_entries').update({
      ended_at: new Date().toISOString(),
      comment,
      edited_at: new Date().toISOString(),
      edited_by: _user.id
    }).eq('id', _activeTimer.id);
    btn.disabled = false;
    if (error) {
      errEl.textContent = 'Viga: ' + error.message;
      return;
    }
    _activeTimer = null;
    closeStopModal();
    updateDisplay();
  }

  function resolveClientName(id) {
    const fromHost = _getClientName(id);
    if (fromHost && fromHost !== id) return fromHost;
    if (_clientCache[id]) return _clientCache[id];
    _sb.from('clients').select('name').eq('id', id).maybeSingle().then(({ data }) => {
      if (data && data.name) {
        _clientCache[id] = data.name;
        updateDisplay();
      }
    });
    return fromHost || '—';
  }

  function updateDisplay() {
    const banner = document.getElementById(BANNER_ID);
    if (!banner) return;
    if (!_activeTimer) {
      banner.classList.remove('visible');
      document.title = _baseTitle;
      return;
    }
    const elapsed = Date.now() - new Date(_activeTimer.started_at).getTime();
    const formatted = fmt(elapsed);
    const cName = resolveClientName(_activeTimer.client_id);
    banner.classList.add('visible');
    banner.querySelector('[data-tb-time]').textContent = formatted;
    banner.querySelector('[data-tb-client]').textContent = cName;
    document.title = `(${formatted}) ${cName} — Skoor`;
  }

  async function loadActive() {
    const { data } = await _sb.from('time_entries')
      .select('*')
      .eq('admin_id', _user.id)
      .eq('entry_type', 'timer')
      .is('ended_at', null)
      .maybeSingle();
    _activeTimer = data || null;
    updateDisplay();
  }

  function startLoops() {
    if (_tickInterval) clearInterval(_tickInterval);
    _tickInterval = setInterval(updateDisplay, 1000);
    if (_pollInterval) clearInterval(_pollInterval);
    _pollInterval = setInterval(loadActive, 30000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) loadActive();
    });
  }

  window.SkoorTimerBanner = {
    async init({ sb, currentUser, getClientName }) {
      _sb = sb;
      _user = currentUser;
      if (typeof getClientName === 'function') _getClientName = getClientName;
      _baseTitle = document.title;
      mountBanner();
      await loadActive();
      startLoops();
    },
    async refresh() { await loadActive(); },
    getActive() { return _activeTimer; }
  };
})();
