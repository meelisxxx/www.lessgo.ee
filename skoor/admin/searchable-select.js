/* Searchable Select — peidab natiivse <select> ja loob otsinguga UI selle ette.
   Säilitab kõik <select>'iga seotud event listener'id ja form submissions —
   `change` event dispatch'itakse alusele <select>'ile, kui kasutaja valib.

   Kasutus: SkoorSearchable.attach(document.getElementById('timer-client'), { placeholder: 'Otsi klienti...' });
   Pärast <select> sisuga manipuleerimist (nt populate options dünaamiliselt): SkoorSearchable.refresh(selectEl); */
(function () {
  const REGISTRY = new WeakMap();

  function attach(selectEl, opts = {}) {
    if (!selectEl || REGISTRY.has(selectEl)) return REGISTRY.get(selectEl);

    const placeholder = opts.placeholder || 'Otsi või vali...';
    const wrap = document.createElement('div');
    wrap.className = 'searchable-select';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ss-input';
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.spellcheck = false;

    const dropdown = document.createElement('ul');
    dropdown.className = 'ss-dropdown';
    dropdown.hidden = true;

    wrap.append(input, dropdown);
    selectEl.style.display = 'none';
    selectEl.parentNode.insertBefore(wrap, selectEl);

    let activeIndex = -1;

    function selectedOption() {
      return selectEl.options[selectEl.selectedIndex] || null;
    }

    function syncInput() {
      const opt = selectedOption();
      input.value = opt && opt.value ? opt.textContent : '';
    }

    function buildList(query) {
      const q = (query || '').trim().toLowerCase();
      dropdown.innerHTML = '';
      activeIndex = -1;
      let visibleCount = 0;
      const currentValue = selectEl.value;
      for (let i = 0; i < selectEl.options.length; i++) {
        const opt = selectEl.options[i];
        const text = opt.textContent;
        if (q && !text.toLowerCase().includes(q)) continue;
        const li = document.createElement('li');
        li.textContent = text;
        li.dataset.value = opt.value;
        if (opt.value === currentValue) li.classList.add('selected');
        dropdown.appendChild(li);
        visibleCount++;
      }
      if (visibleCount === 0) {
        const empty = document.createElement('li');
        empty.className = 'empty';
        empty.textContent = 'Vastet ei leitud';
        dropdown.appendChild(empty);
      }
    }

    function openDropdown(useInputAsFilter) {
      buildList(useInputAsFilter ? input.value : '');
      dropdown.hidden = false;
    }

    function closeDropdown() {
      dropdown.hidden = true;
      syncInput();
    }

    function commitValue(value) {
      if (selectEl.value === value) {
        // sama valik — sulge ja sünkroni
      } else {
        selectEl.value = value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      closeDropdown();
    }

    input.addEventListener('focus', () => openDropdown(false));
    input.addEventListener('click', () => { if (dropdown.hidden) openDropdown(false); });
    input.addEventListener('input', () => openDropdown(true));
    input.addEventListener('blur', () => {
      // viivitus, et klikk dropdown'is jõuaks toimida enne sulgemist
      setTimeout(() => { if (document.activeElement !== input) closeDropdown(); }, 120);
    });
    input.addEventListener('keydown', (e) => {
      const items = Array.from(dropdown.querySelectorAll('li:not(.empty)'));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (dropdown.hidden) openDropdown(false);
        activeIndex = Math.min(items.length - 1, activeIndex + 1);
        updateHighlight(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
        updateHighlight(items);
      } else if (e.key === 'Enter') {
        if (!dropdown.hidden && activeIndex >= 0 && items[activeIndex]) {
          e.preventDefault();
          commitValue(items[activeIndex].dataset.value);
        }
      } else if (e.key === 'Escape') {
        closeDropdown();
        input.blur();
      }
    });
    dropdown.addEventListener('mousedown', (e) => {
      const li = e.target.closest('li:not(.empty)');
      if (!li) return;
      e.preventDefault();
      commitValue(li.dataset.value);
    });
    selectEl.addEventListener('change', syncInput);

    function updateHighlight(items) {
      items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
      const act = items[activeIndex];
      if (act) act.scrollIntoView({ block: 'nearest' });
    }

    syncInput();

    const handle = { refresh: syncInput, root: wrap, input, dropdown };
    REGISTRY.set(selectEl, handle);
    return handle;
  }

  function refresh(selectEl) {
    const h = REGISTRY.get(selectEl);
    if (h) h.refresh();
  }

  window.SkoorSearchable = { attach, refresh };
})();
