// Skoor WORK — jagatud vasak sidebar-navigatsioon.
// Üks tõe-allikas kogu admin-menüüle: markup + stiil + mobiil-drawer.
//
// Kasutamine igal lehel (asendab vana <header> bloki):
//   <div id="app">
//     <script src="nav.js"></script>   <!-- SÜNKROONNE, kohe #app alguses -->
//     <main> ... </main>
//   </div>
//
// NB: skript peab olema sünkroonne (ei defer/module), et logout-btn jms
// jõuaks DOM-i ENNE lehe enda inline-skripti (mis paneb handlerid külge).
//
// Uue lingi lisamine = muuda AINULT alltoodud LINKS massiivi (mitte 8 lehte).
(function () {
  if (document.getElementById('skoor-sidebar')) return; // idempotentne

  // ── Menüü-struktuur (üks koht) ──────────────────────────────────────────
  const LINKS = [
    { file: 'index.html',      label: 'Töölaud' },
    { file: 'timer.html',      label: 'Tööaeg' },
    { file: 'tasks.html',      label: 'Ülesanded' },
    { file: 'reports.html',    label: 'Arved' },
    { file: 'clients.html',    label: 'Kliendid' },
    { file: 'templates.html',  label: 'Mallid' },
    { file: 'diginaator.html', label: 'DiginaatoR' },
    { file: 'settings.html',   label: 'Seaded' },
  ];

  const LOGO_SVG =
    '<svg class="sk-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Skoor">' +
    '<path d="M16 72 A38 38 0 1 1 84 72" fill="none" stroke="var(--logo-track)" stroke-width="10" stroke-linecap="round"/>' +
    '<path d="M16 72 A38 38 0 0 1 62 22" fill="none" stroke="#10b981" stroke-width="10" stroke-linecap="round"/>' +
    '<line x1="50" y1="72" x2="68" y2="44" stroke="var(--logo-needle)" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="50" cy="72" r="7" fill="#10b981"/></svg>';

  // ── Aktiivse lehe tuvastus location.pathname järgi ──────────────────────
  let current = location.pathname.substring(location.pathname.lastIndexOf('/') + 1);
  if (!current || current === '') current = 'index.html';

  // ── Stiil (Apple-tokenid: 8px-rütm, raadius-skaala, scale()-vajutus,
  //    hairline-äärised; Skoori roheline aktsent + tume/hele teema säilib) ──
  const css = `
    #app.skoor-shell { flex-direction: row; align-items: stretch; }

    .skoor-sidebar {
      flex: 0 0 220px; width: 220px;
      display: flex; flex-direction: column;
      gap: 2px; padding: 16px 12px;
      background: var(--bg2);
      border-right: 1px solid var(--border);
      position: sticky; top: 0; height: 100vh; overflow-y: auto;
    }
    #app.skoor-shell > main { flex: 1 1 auto; min-width: 0; }

    .sk-brand {
      display: flex; align-items: center; gap: 10px;
      padding: 4px 8px 14px; color: var(--text);
      letter-spacing: -0.02em;
    }
    .sk-brand:hover { opacity: 1; }
    .sk-logo { width: 30px; height: 30px; flex: 0 0 auto; }
    .sk-brand-title { font-size: 15px; font-weight: 700; letter-spacing: 0.3px; }
    .sk-badge {
      display: inline-block; margin-left: 7px;
      background: var(--accent); color: #fff;
      font-size: 9px; font-weight: 700; letter-spacing: 1px;
      padding: 2px 7px; border-radius: 5px; vertical-align: middle;
    }

    .sk-nav { display: flex; flex-direction: column; gap: 2px; }
    .sk-link {
      display: block; width: 100%; text-align: left;
      padding: 9px 12px; border-radius: 8px;
      font-family: inherit; font-size: 14px; font-weight: 500;
      letter-spacing: -0.01em; color: var(--text2);
      background: transparent; border: 1px solid transparent;
      cursor: pointer; transition: background .15s, color .15s, transform .1s;
    }
    .sk-link:hover { color: var(--text); background: var(--hover-strong); opacity: 1; }
    .sk-link:active { transform: scale(0.97); }
    .sk-link.active {
      color: var(--text); background: rgba(16,185,129,0.10);
      border-color: rgba(16,185,129,0.30);
    }

    .sk-bottom {
      margin-top: auto; display: flex; flex-direction: column; gap: 2px;
      padding-top: 12px; border-top: 1px solid var(--border);
    }
    .sk-link--muted { color: var(--text3); font-size: 13px; }
    .sk-logout { color: var(--neg); }
    .sk-logout:hover { color: var(--neg); background: rgba(239,68,68,0.10); }

    /* Mobiil-riba + drawer */
    .skoor-mobilebar { display: none; }
    .skoor-overlay { display: none; }

    @media (max-width: 768px) {
      #app.skoor-shell { flex-direction: column; }
      .skoor-mobilebar {
        display: flex; align-items: center; gap: 12px;
        position: sticky; top: 0; z-index: 30;
        padding: 10px 16px;
        background: var(--bg2); border-bottom: 1px solid var(--border);
      }
      .sk-hamburger {
        background: transparent; border: 1px solid var(--border);
        color: var(--text); border-radius: 8px;
        width: 38px; height: 38px; font-size: 18px; line-height: 1;
        cursor: pointer; transition: transform .1s;
      }
      .sk-hamburger:active { transform: scale(0.95); }
      .sk-mobile-title { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: 0.3px; }

      .skoor-sidebar {
        position: fixed; top: 0; left: 0; bottom: 0; height: 100vh;
        width: 250px; flex-basis: 250px;
        transform: translateX(-100%); transition: transform .25s ease;
        z-index: 50; box-shadow: 0 0 40px rgba(0,0,0,0.45);
      }
      .skoor-sidebar.open { transform: translateX(0); }

      .skoor-overlay {
        display: block; position: fixed; inset: 0; z-index: 40;
        background: rgba(0,0,0,0.5);
        opacity: 0; pointer-events: none; transition: opacity .25s;
      }
      .skoor-overlay.visible { opacity: 1; pointer-events: auto; }
    }
  `;
  const style = document.createElement('style');
  style.id = 'skoor-nav-style';
  style.textContent = css;
  document.head.appendChild(style);

  // ── Markup ──────────────────────────────────────────────────────────────
  const navLinks = LINKS.map(l => {
    const active = (l.file === current) ? ' active' : '';
    return `<a href="${l.file}" class="sk-link${active}">${l.label}</a>`;
  }).join('');

  const sidebar = document.createElement('aside');
  sidebar.className = 'skoor-sidebar';
  sidebar.id = 'skoor-sidebar';
  sidebar.innerHTML =
    `<a class="sk-brand" href="../">${LOGO_SVG}` +
      `<span class="sk-brand-title">Skoor<span class="sk-badge">WORK</span></span></a>` +
    `<nav class="sk-nav">${navLinks}</nav>` +
    `<div class="sk-bottom">` +
      `<a href="../" class="sk-link sk-link--muted">← Klientide vaade</a>` +
      `<button class="sk-link sk-logout" id="logout-btn">Logi välja</button>` +
    `</div>`;

  const mobilebar = document.createElement('div');
  mobilebar.className = 'skoor-mobilebar';
  mobilebar.id = 'skoor-mobilebar';
  mobilebar.innerHTML =
    `<button class="sk-hamburger" id="sk-hamburger" aria-label="Ava menüü">☰</button>` +
    `<span class="sk-mobile-title">Skoor<span class="sk-badge">WORK</span></span>`;

  const overlay = document.createElement('div');
  overlay.className = 'skoor-overlay';
  overlay.id = 'skoor-overlay';

  // ── Paigutus #app sisse: [sidebar, mobilebar, ...main] ──────────────────
  const app = document.getElementById('app');
  if (app) {
    app.classList.add('skoor-shell');
    app.prepend(mobilebar); // läheb #app etteotsa
    app.prepend(sidebar);   // sidebar mobilebar'i ette → [sidebar, mobilebar, main]
  } else {
    // fallback (ei tohiks juhtuda): pane body algusesse
    document.body.prepend(mobilebar);
    document.body.prepend(sidebar);
  }
  document.body.appendChild(overlay);

  // ── Drawer-loogika (mobiil) ─────────────────────────────────────────────
  function openDrawer() { sidebar.classList.add('open'); overlay.classList.add('visible'); }
  function closeDrawer() { sidebar.classList.remove('open'); overlay.classList.remove('visible'); }

  document.getElementById('sk-hamburger').addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeDrawer() : openDrawer();
  });
  overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
  // Lingile vajutamisel sulge drawer (lehevahetus niikuinii toimub)
  sidebar.querySelectorAll('.sk-link').forEach(a => {
    if (a.tagName === 'A') a.addEventListener('click', closeDrawer);
  });
})();
