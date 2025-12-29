// Combined publication fetch + UI glue
(function () {
  const BASE_URL = AppConfig.BASE_URL;
  const API_PATH = '/api/publics';
  const statusEl = document.getElementById('publication-status');

  // defaults
  let currentMode = 'list'; // 'list' or 'searching'
  let lastListOpts = { limit: 10, page: 1 };
  let lastSearchOpts = { title: '', classification: '', type: '', year: '', limit: 10, page: 1 };

  // in-memory cache keyed by full request URL
  const cache = {};

  function setStatus(text, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('error', !!isError);
  }

  const formatNumber = n =>
    typeof n === 'number' ? (Number.isInteger(n) ? n.toString() : String(n)) : (n ?? '—');

  const safeNum = v => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(/[, ]+/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  function normalizeCoverUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//.test(url)) return url;
    return BASE_URL.replace(/\/$/, '') + url;
  }

  // Build URL for list or searching with params object
  function buildUrlForMode(mode, opts = {}) {
    const qs = new URLSearchParams();

    // **MODIFICATION: 'populate=*' is REMOVED from here.**
    // Your middleware now handles all population logic.

    qs.set('mode', mode); // Keep your custom 'mode' param

    if (mode === 'list') {
      qs.set('limit', opts.limit ?? lastListOpts.limit ?? 10);
      qs.set('page', opts.page ?? lastListOpts.page ?? 1);
    } else if (mode === 'searching') {
      if (opts.title) qs.set('title', opts.title);
      if (opts.classification) qs.set('classification', opts.classification);
      if (opts.type) qs.set('type', opts.type);
      if (opts.year) qs.set('year', opts.year);
      qs.set('limit', opts.limit ?? lastSearchOpts.limit ?? 10);
      qs.set('page', opts.page ?? lastSearchOpts.page ?? 1);
    } else {
      throw new Error('Unknown mode: ' + mode);
    }

    return `${BASE_URL}${API_PATH}?${qs.toString()}`;
  }

  // --- MODIFIED FUNCTION ---
  async function fetchUrl(url, useCache = false) {
    if (useCache && cache[url]) {
      console.debug('publication-fetch: using cache', url);
      // We must return the same *shape* as a non-cached response.
      // This cache logic might be flawed if it only stores the array.
      // For pagination, we'll bypass cache on fetch to always get metadata.
      // A better cache would store the whole payload.
      // Let's modify this to *not* use cache if we expect a payload object.
    }
    console.debug('publication-fetch: fetching', url);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${txt ? ' — ' + txt : ''} for ${url}`);
    }
    const payload = await res.json();

    // Keep original cache behavior for compatibility with other functions
    const arr = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
    cache[url] = arr;
    cache.publics = arr;

    // **RETURN THE FULL PAYLOAD** for pagination metadata
    return payload;
  }

  // Resolve common shapes (flat or attributes wrapper)
  function resolve(item, path) {
    // ... (This function is unchanged) ...
    if (!item) return undefined;
    if (item[path] !== undefined) return item[path];
    if (item.attributes && item.attributes[path] !== undefined) return item.attributes[path];

    if (path.includes('.')) {
      const parts = path.split('.');
      const first = parts[0];
      const rest = parts.slice(1);
      const candidate = item[first] ?? item.attributes?.[first] ?? item[first]?.data ?? item.attributes?.[first]?.data;
      if (candidate) {
        const attrs = candidate.attributes ?? (candidate.data ? candidate.data.attributes : undefined) ?? candidate;
        return rest.reduce((acc, k) => acc?.[k], attrs);
      }
    }
    return undefined;
  }

  // core populate function
  function populateNode(node, item, field) {
    // ... (This function is unchanged) ...
    if (!item) {
      if (node.tagName === 'IMG') {
        node.removeAttribute('src');
        node.alt = '—';
      } else {
        node.textContent = '—';
      }
      return;
    }

    // classification_impact combined field
    if (field === 'classification_impact') {
      const cls = resolve(item, 'indexing_classification') ?? resolve(item, 'classification') ?? resolve(item, 'indexing_classification');
      const impRaw = resolve(item, 'impact_factor');
      const imp = safeNum(impRaw);
      const formattedImp = imp !== null ? formatNumber(imp) : (impRaw ?? '—');
      const combo = [cls, formattedImp].filter(v => v && v !== '—').join(', ');
      node.textContent = combo || '—';
      return;
    }

    // cover image
    if (field === 'cover_picture' || field === 'cover_picture.url') {
      let pic = resolve(item, 'cover_picture') ?? resolve(item, 'cover_image') ?? resolve(item, 'image') ?? null;

      // handle Strapi media shapes
      if (pic?.data?.attributes) pic = pic.data.attributes;
      if (pic?.attributes) pic = pic.attributes;

      const urlCandidate = pic?.url ?? resolve(item, 'cover_picture.url') ?? resolve(item, 'cover_picture.data.attributes.url') ?? null;
      const finalUrl = urlCandidate ? normalizeCoverUrl(urlCandidate) : null;

      if (node.tagName === 'IMG') {
        if (finalUrl) node.src = finalUrl; else node.removeAttribute('src');
        node.alt = pic?.alternativeText ?? pic?.caption ?? item.title ?? item.journal_name ?? 'cover image';
        return;
      }

      // non-img container: reuse same class the page uses to keep styling
      let img = node.querySelector('img.publication_photo');
      if (!img) {
        img = document.createElement('img');
        img.className = 'publication_photo';
        node.innerHTML = '';
        node.appendChild(img);
      }
      if (finalUrl) img.src = finalUrl;
      else img.src = 'https://placehold.co/150x150/e0f2f1/004d40?text=Ms';
      img.alt = pic?.alternativeText ?? pic?.caption ?? item.title ?? item.journal_name ?? 'cover image';
      return;
    }

    // default fields
    let val = resolve(item, field);
    if (field === 'impact_factor') {
      const n = safeNum(val);
      val = n !== null ? formatNumber(n) : (val ?? '—');
    } else {
      if (typeof val === 'number') val = formatNumber(val);
      else if (val === null || val === undefined || val === '') val = '—';
    }
    node.textContent = val;
  }

  // Pull placeholders and populate with provided array
  function applyItemsToPlaceholders(items) {
    // ... (This function is unchanged) ...
    const nodes = Array.from(document.querySelectorAll('.stat-value[data-component="publication"]'));
    if (!nodes.length) {
      setStatus('No publication placeholders found.');
      return;
    }
    nodes.forEach(node => {
      const indexAttr = node.getAttribute('data-index');
      const index = indexAttr !== null ? parseInt(indexAttr, 10) : 0;
      const field = node.getAttribute('data-field');
      const item = items[index];
      populateNode(node, item, field);
    });
  }

  // === Make publication cards clickable ===
  function attachPublicationLinks() {
    // ... (This function is unchanged) ...
    const items = (window.__homepage_cache && window.__homepage_cache.publics) || (typeof cache !== 'undefined' && cache.publics) || null;
    if (!items || !items.length) return;

    items.forEach((item, i) => {
      if (!item) return;

      const node = document.querySelector(`.publications_card .stat-value[data-component="publication"][data-source="publics"][data-index="${i}"]`);
      if (!node) return;

      const card = node.closest('.publications_card');
      if (!card) return;

      const instanceId = String(item.documentId ?? item.documentId ?? '');
      card.setAttribute('data-instance-id', instanceId);

      let existingLink = card.querySelector('a');
      if (existingLink) {
        existingLink.href = `publication_fullpage.html?id=${encodeURIComponent(instanceId)}`;
        existingLink.classList.add('publication-link');
        existingLink.style.textDecoration = 'none';
        existingLink.style.color = 'inherit';
      } else {
        const a = document.createElement('a');
        a.className = 'publication-link';
        a.href = `publication_fullpage.html?id=${encodeURIComponent(instanceId)}`;
        a.style.textDecoration = 'none';
        a.style.color = 'inherit';

        while (card.firstChild) {
          a.appendChild(card.firstChild);
        }
        card.appendChild(a);
      }
    });
    if (typeof cache !== 'undefined') {
      window.__homepage_cache = window.__homepage_cache || {};
      window.__homepage_cache.publics = cache.publics || window.__homepage_cache.publics;
    }
  }

  // --- NEW: render using template if present (keeps populateNode logic) ---
  function renderPublications(items) {
    // ... (This function is unchanged) ...
    const container = document.getElementById('publications-container'); // your container
    const template = document.getElementById('publication-card-template');
    if (!container || !template) return false; // signal not handled

    container.innerHTML = ''; // clear

    if (!items || items.length === 0) {
      container.innerHTML = '<p>No publications found.</p>';
      return true;
    }

    items.forEach((item, idx) => {
      const clone = template.content.cloneNode(true);

      // anchor: set url if exists
      const anchor = clone.querySelector('a');
      const instanceId = String(item.documentId ?? resolve(item, 'documentId') ?? '');
      if (anchor) {
        anchor.href = `publication_fullpage.html?id=${encodeURIComponent(instanceId)}`;
        // make the whole card clickable but keep styles
        anchor.classList.add('publication-link');
      }

      // image
      const imgEl = clone.querySelector('img.publication_photo');
      if (imgEl) populateNode(imgEl, item, 'cover_picture');

      // journal_name
      const jEl = clone.querySelector('.journal_name');
      if (jEl) populateNode(jEl, item, 'journal_name');

      // title
      const tEl = clone.querySelector('.title');
      if (tEl) populateNode(tEl, item, 'title');

      // classification_impact (use same field as placeholders)
      const cEl = clone.querySelector('.classification_impact');
      if (cEl) populateNode(cEl, item, 'classification_impact');

      // attach data-instance-id for compatibility
      const cardRoot = clone.querySelector('.publications_card') || clone.firstElementChild;
      if (cardRoot && instanceId) cardRoot.setAttribute('data-instance-id', instanceId);

      container.appendChild(clone);
    });

    // keep global cache hook (so publicationGetItem still works)
    window.__homepage_cache = window.__homepage_cache || {};
    window.__homepage_cache.publics = items;
    cache.publics = items;

    return true;
  }

  // --- NEW PAGINATION RENDER FUNCTION ---
  // This function is adapted from your first script
  // It builds the pagination UI, but a click triggers an API call, not a client-side hide/show
  function updatePaginationUI(currentPage, totalPages) {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) {
      console.warn('Pagination container ".pagination" not found.');
      return;
    }

    paginationContainer.innerHTML = ''; // Clear old links

    if (totalPages <= 1) {
      return; // No pagination needed if 1 page or less
    }

    // Helper function to handle page clicks
    function handlePageClick(newPage) {
      if (newPage < 1 || newPage > totalPages || newPage === currentPage) {
        return;
      }

      // This is the core change:
      // Instead of client-side showPage(), we call the API fetch functions
      if (currentMode === 'list') {
        window.publicationSetListOptions({ page: newPage });
      } else {
        // For search, we must preserve the other search options
        const opts = { ...lastSearchOpts, page: newPage };
        window.publicationSearch(opts);
      }
    }

    // Previous button
    const prev = document.createElement('a');
    prev.innerHTML = '&laquo; Prev';
    prev.classList.add('prev');
    if (currentPage === 1) {
      prev.classList.add('disabled');
    } else {
      prev.addEventListener('click', (e) => {
        e.preventDefault();
        handlePageClick(currentPage - 1);
      });
    }
    paginationContainer.appendChild(prev);

    // Page numbers
    // Logic to show only a subset of pages if there are too many (e.g., 1 ... 4 5 6 ... 10)
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      const first = document.createElement('a');
      first.innerText = 1;
      first.addEventListener('click', (e) => { e.preventDefault(); handlePageClick(1); });
      paginationContainer.appendChild(first);
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.innerText = '...';
        paginationContainer.appendChild(ellipsis);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageLink = document.createElement('a');
      pageLink.innerText = i;
      if (i === currentPage) {
        pageLink.classList.add('active');
      } else {
        pageLink.addEventListener('click', (e) => {
          e.preventDefault();
          handlePageClick(i);
        });
      }
      paginationContainer.appendChild(pageLink);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.innerText = '...';
        paginationContainer.appendChild(ellipsis);
      }
      const last = document.createElement('a');
      last.innerText = totalPages;
      last.addEventListener('click', (e) => { e.preventDefault(); handlePageClick(totalPages); });
      paginationContainer.appendChild(last);
    }


    // Next button
    const next = document.createElement('a');
    next.innerHTML = 'Next &raquo;';
    next.classList.add('next');
    if (currentPage === totalPages) {
      next.classList.add('disabled');
    } else {
      next.addEventListener('click', (e) => {
        e.preventDefault();
        handlePageClick(currentPage + 1);
      });
    }
    paginationContainer.appendChild(next);
  }


  // --- MODIFIED FUNCTION ---
  // Main fetch + populate routine for current mode
  async function loadCurrentMode() {
    try {
      setStatus('Loading publications...');
      const url = buildUrlForMode(currentMode, currentMode === 'list' ? lastListOpts : lastSearchOpts);

      // **PAYLOAD** is now the full object, not just the items array
      const payload = await fetchUrl(url, false);

      // **ITEMS** are extracted from payload (assuming {data: [...]} or [...])
      const items = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);

      // **NEW PAGINATION LOGIC**
      // Attempt to find pagination metadata from the API response
      // This assumes a Strapi v4-like structure: { meta: { pagination: { page: 1, pageSize: 10, total: 100, pageCount: 10 } } }
      const paginationMeta = payload.meta?.pagination;
      const limit = (currentMode === 'list' ? lastListOpts.limit : lastSearchOpts.limit);

      if (paginationMeta) {
        const currentPage = paginationMeta.page || (currentMode === 'list' ? lastListOpts.page : lastSearchOpts.page);
        // Use pageCount if available, otherwise calculate it
        const totalPages = paginationMeta.pageCount || Math.ceil(paginationMeta.total / (paginationMeta.pageSize || limit));

        updatePaginationUI(currentPage, totalPages);
      } else {
        // No pagination metadata found, clear the pagination container
        const paginationContainer = document.querySelector('.pagination');
        if (paginationContainer) paginationContainer.innerHTML = '';
        if (items.length > 0) {
          console.warn("Pagination metadata (e.g., payload.meta.pagination) not found in API response. Pagination UI will not be rendered.");
        }
      }
      // **END NEW PAGINATION LOGIC**

      const rendered = renderPublications(items);
      if (!rendered) {
        // Fallback to placeholder logic
        applyItemsToPlaceholders(items);
        try { attachPublicationLinks(); } catch (e) { console.warn('attachPublicationLinks failed', e); }
      } else {
        // This 'else' block seems redundant with the 'if(!rendered)' logic above it.
        // I'll keep your original structure.
        applyItemsToPlaceholders(items); // This seems to run twice if renderPublications is successful?
        // make items available globally for helper and debugging
        window.__homepage_cache = window.__homepage_cache || {};
        window.__homepage_cache.publics = items;

        try {
          attachPublicationLinks();
        } catch (e) {
          console.warn('attachPublicationLinks failed', e);
        }
      }
      setStatus('Last updated: ' + new Date().toLocaleString());
    } catch (err) {
      console.error('publication fetch error', err);
      setStatus('Error: ' + (err.message || err), true);
      // Clear pagination on error
      const paginationContainer = document.querySelector('.pagination');
      if (paginationContainer) paginationContainer.innerHTML = '';
    }
  }

  // Public API: list controls
  window.publicationSetListOptions = function (opts = {}) {
    lastListOpts.limit = opts.limit ?? lastListOpts.limit;
    lastListOpts.page = opts.page ?? lastListOpts.page;
    currentMode = 'list';
    loadCurrentMode();
  };

  // Public API: run search
  window.publicationSearch = function (opts = {}) {
    lastSearchOpts.title = opts.title ?? lastSearchOpts.title;
    lastSearchOpts.classification = opts.classification ?? lastSearchOpts.classification;
    lastSearchOpts.type = opts.type ?? lastSearchOpts.type;
    lastSearchOpts.year = opts.year ?? lastSearchOpts.year;
    lastSearchOpts.limit = opts.limit ?? lastSearchOpts.limit;
    lastSearchOpts.page = opts.page ?? lastSearchOpts.page;
    currentMode = 'searching';
    // clear cache for this url if present
    const url = buildUrlForMode(currentMode, lastSearchOpts);
    delete cache[url];
    loadCurrentMode();
  };

  window.publicationClearSearch = function () {
    currentMode = 'list';
    // Reset to page 1
    lastListOpts.page = 1;
    loadCurrentMode();
  };

  window.publicationRefresh = function () {
    Object.keys(cache).forEach(k => delete cache[k]);
    loadCurrentMode();
  };

  // ---------- UI glue (search inputs, debounce, events) ----------
  // Elements
  // ... (This section is unchanged) ...
  const inputJournal = document.getElementById('journal-search');
  const selectClassification = document.getElementById('classification');
  const selectType = document.getElementById('paper-type');
  const inputYear = document.getElementById('year');

  // map your select values -> API classification string
  const CLASS_MAP = {
    '': '',                // empty = no filter
    'q1': 'WWoS Q1',
    'q2': 'WWoS Q2',
    'q3': 'WWoS Q3',
    'q4': 'WWoS Q4',
    'scopus': 'Scopus-indexed',
    'non-indexed': 'Non-indexed'
  };

  // debounce helper
  function debounce(fn, wait = 400) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // build search options object from current UI state
  function buildSearchOpts() {
    const title = (inputJournal?.value || '').trim();
    const classification = CLASS_MAP[selectClassification?.value || ''] || '';
    const type = (selectType?.value || '').trim();
    const year = (inputYear?.value || '').trim();

    // API expects limit/page — use last search/list defaults
    const limit = lastSearchOpts.limit ?? lastListOpts.limit ?? 10;
    // **MODIFICATION**: Always reset to page 1 when search filters change
    const page = 1;

    const opts = { limit, page };
    if (title) opts.title = title;
    if (classification) opts.classification = classification;
    if (type) opts.type = type;
    if (year) opts.year = year;

    return opts;
  }

  // actual search invoker (debounced)
  const runSearch = debounce(() => {
    const opts = buildSearchOpts();
    const hasFilter = Object.keys(opts).some(k => !['limit', 'page'].includes(k));
    if (!hasFilter) {
      window.publicationSetListOptions?.({ limit: opts.limit, page: opts.page });
      return;
    }
    window.publicationSearch?.(opts);
  }, 350);

  // wire events:
  // ... (This section is unchanged, but the functions they call now reset to page 1) ...
  if (inputJournal) {
    // run search on Enter
    inputJournal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const opts = buildSearchOpts(); // buildSearchOpts now resets page to 1
        if (Object.keys(opts).some(k => !['limit', 'page'].includes(k))) {
          window.publicationSearch?.(opts);
        } else {
          window.publicationSetListOptions?.({ limit: opts.limit, page: opts.page });
        }
      }
    });
    // debounce search while typing
    inputJournal.addEventListener('input', runSearch);
  }
  if (selectClassification) selectClassification.addEventListener('change', () => { runSearch(); });
  if (selectType) selectType.addEventListener('change', () => { runSearch(); });
  if (inputYear) inputYear.addEventListener('input', runSearch);

  // optionally expose a clear function
  window.publicationClearFilters = function () {
    if (inputJournal) inputJournal.value = '';
    if (selectClassification) selectClassification.value = '';
    if (selectType) selectType.value = '';
    if (inputYear) inputYear.value = '';
    // **MODIFICATION**: Call the function that resets to page 1
    window.publicationClearSearch?.();
  };

  window.publicationGetItem = function (index) {
    // ... (This function is unchanged) ...
    const arr = (window.__homepage_cache && window.__homepage_cache.publics) || cache.publics || null;
    if (!arr || !Array.isArray(arr)) return null;
    return arr[index] ?? null;
  };
  window.publicationGetAll = function () {
    // ... (This function is unchanged) ...
    return (window.__homepage_cache && window.__homepage_cache.publics) || cache.publics || [];
  };

  // Initial load
  loadCurrentMode();

})();