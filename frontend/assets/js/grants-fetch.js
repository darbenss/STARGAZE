(function () {
  const BASE_URL = AppConfig.BASE_URL;
  const API_PATH = '/api/grants-n-projects';
  const statusEl = document.getElementById('grants-status');

  // defaults
  let currentMode = 'list'; // 'list' or 'searching'
  let lastListOpts = { limit: 10, page: 1 };
  let lastSearchOpts = { title: '', pi_name: '', year: '', limit: 10, page: 1 };

  const cache = {};

  function setStatus(text, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('error', !!isError);
  }

  const formatNumber = n =>
    typeof n === 'number' ? (Number.isInteger(n) ? n.toString() : String(n)) : (n ?? '—');

  const formatMoney = n =>
    typeof n === 'number' ? 'RM ' + n.toLocaleString() : (n ?? '—');
    
  const safeNum = v => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(/[, ]+/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  function buildUrlForMode(mode, opts = {}) {
    // ... (This function is unchanged and correct) ...
    const qs = new URLSearchParams();
    qs.set('mode', mode);
    if (mode === 'list') {
      qs.set('limit', opts.limit ?? lastListOpts.limit ?? 10);
      qs.set('page', opts.page ?? lastListOpts.page ?? 1);
    } else if (mode === 'searching') {
      if (opts.title) qs.set('title', opts.title);
      if (opts.pi_name) qs.set('pi_name', opts.pi_name);
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
    // Caching is disabled for pagination to work reliably
    console.debug('grants-fetch: fetching', url);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${txt ? ' — ' + txt : ''} for ${url}`);
    }
    const payload = await res.json();
    
    // Keep cache logic for compatibility
    const arr = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
    cache[url] = arr;
    
    // **RETURN THE FULL PAYLOAD**
    return payload;
  }

  // Resolve common shapes (flat or attributes wrapper)
  function resolve(item, path) {
    // ... (This function is unchanged and correct) ...
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
    // ... (This function is unchanged and correct) ...
    if (!item) {
      node.textContent = '—';
      return;
    }
    if (field === 'scheme') {
      const name = resolve(item, 'grant_scheme_name');
      const code = resolve(item, 'grant_code');
      node.textContent = name ? (code ? `${name} (${code})` : name) : '—';
      return;
    }
    if (field === "start_date" || field === "end_date") { 
      const dateStr = resolve(item, field);
      const date = new Date(dateStr); 
      if (!dateStr || isNaN(date.getTime())) { 
        node.textContent = '—';
        return;
      }
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' }); 
      const year = date.getFullYear();
      node.textContent = `${day} ${month}, ${year}`; 
      return;
    }
    let val = resolve(item, field);
    if (field === 'total_funding') {
      const n = safeNum(val);
      val = n !== null ? formatMoney(n) : (val ?? '—');
    } else {
      if (typeof val === 'number') val = formatNumber(val);
      else if (val === null || val === undefined || val === '') val = '—';
    }
    node.textContent = val;
  }

  // --- RENDER function
  function renderGrantsList(items) {
    // ... (This function is unchanged and correct) ...
    const container = document.getElementById('grants-container');
    const template = document.getElementById('grant-card-template');
    if (!container || !template) {
      console.error('Missing #grants-container or #grant-card-template in HTML.');
      setStatus('Page layout error.', true);
      return;
    }
    container.innerHTML = '';
    if (!items || items.length === 0) {
      container.innerHTML = '<p>No grants found matching your criteria.</p>';
      return;
    }
    items.forEach(item => {
      const clone = template.content.cloneNode(true);
      const nodes = clone.querySelectorAll('.stat-value[data-component="grants"]');
      const link = clone.querySelector('a');
      if (link) {
        const instanceId = String(item.documentId ?? '');
        link.href = `grants_fullpage.html?id=${encodeURIComponent(instanceId)}`;
      }
      nodes.forEach(node => {
        const field = node.getAttribute('data-field');
        if (field) {
          populateNode(node, item, field);
        }
      });
      container.appendChild(clone);
    });
  }

  // --- NEW PAGINATION RENDER FUNCTION ---
  // (Copied from news-fetch.js and adapted for 'grants')
  function updatePaginationUI(currentPage, totalPages) {
    // **ASSUMING** your pagination container has this ID
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) {
      console.warn('Pagination container "#grants-pagination" not found.');
      return; 
    }

    paginationContainer.innerHTML = ''; 

    if (totalPages <= 1) {
      return; // No pagination needed
    }

    function handlePageClick(newPage) {
      if (newPage < 1 || newPage > totalPages || newPage === currentPage) {
        return;
      }
      
      if (currentMode === 'list') {
        // **ADAPTED**
        window.grantsSetListOptions({ page: newPage });
      } else {
        const opts = { ...lastSearchOpts, page: newPage };
        // **ADAPTED**
        window.grantsSearch(opts);
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

    // Page numbers (with ellipsis logic)
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


  // --- MODIFIED Main fetch + populate routine ---
  async function loadCurrentMode() {
    try {
      setStatus('Loading grants...');
      const url = buildUrlForMode(currentMode, currentMode === 'list' ? lastListOpts : lastSearchOpts);
      
      // **PAYLOAD** is now the full object
      const payload = await fetchUrl(url, false);
      
      // **ITEMS** are extracted from payload
      const items = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
      
      // Call our render function
      renderGrantsList(items);

      // **NEW PAGINATION LOGIC**
      const paginationMeta = payload.meta?.pagination;
      const limit = (currentMode === 'list' ? lastListOpts.limit : lastSearchOpts.limit);

      if (paginationMeta) {
          const currentPage = paginationMeta.page || (currentMode === 'list' ? lastListOpts.page : lastSearchOpts.page);
          const totalPages = paginationMeta.pageCount || Math.ceil(paginationMeta.total / (paginationMeta.pageSize || limit));
          
          updatePaginationUI(currentPage, totalPages);
      } else {
          // No pagination metadata found
          const paginationContainer = document.getElementById('grants-pagination');
          if (paginationContainer) paginationContainer.innerHTML = '';
          if (items.length > 0) {
            console.warn("Pagination metadata (e.g., payload.meta.pagination) not found in API response. Pagination UI will not be rendered.");
          }
      }
      // **END NEW PAGINATION LOGIC**

      setStatus('Last updated: ' + new Date().toLocaleString());
    } catch (err) {
      console.error('grants fetch error', err);
      setStatus('Error: ' + (err.message || err), true);
      // **NEW** Clear pagination on error
      const paginationContainer = document.getElementById('grants-pagination');
      if (paginationContainer) paginationContainer.innerHTML = '';
    }
  }

  // Public API: list controls
  window.grantsSetListOptions = function (opts = {}) {
    lastListOpts.limit = opts.limit ?? lastListOpts.limit;
    lastListOpts.page = opts.page ?? lastListOpts.page;
    currentMode = 'list';
    loadCurrentMode();
  };

  // Public API: run search
  window.grantsSearch = function (opts = {}) {
    // ... (Your existing logic here is correct) ...
    lastSearchOpts.title = opts.title ?? null;
    lastSearchOpts.pi_name = opts.pi_name ?? null;
    lastSearchOpts.year = opts.year ?? null;
    lastSearchOpts.limit = opts.limit ?? lastSearchOpts.limit;
    lastSearchOpts.page = opts.page ?? 1; // Resets to page 1
    currentMode = 'searching';
    
    const url = buildUrlForMode(currentMode, lastSearchOpts);
    delete cache[url];
    loadCurrentMode();
  };

  // --- MODIFIED FUNCTION ---
  window.grantsClearSearch = function () {
    currentMode = 'list';
    lastListOpts.page = 1; // **Added this reset**
    loadCurrentMode();
  };

  window.grantsRefresh = function () {
    Object.keys(cache).forEach(k => delete cache[k]);
    loadCurrentMode();
  };

  // ---------- UI glue (search inputs, debounce, events) ----------
  // (This entire section was already correct and handles page resets)
  
  const inputPI = document.getElementById('pi-search');
  const inputGrant = document.getElementById('grant-search');
  const inputYear = document.getElementById('year');

  function debounce(fn, wait = 350) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function buildSearchOpts() {
    const pi = (inputPI?.value || '').trim();
    const grant = (inputGrant?.value || '').trim();
    const year = (inputYear?.value || '').trim();

    const limit = lastSearchOpts?.limit ?? lastListOpts?.limit ?? 10;
    const page = 1; // <-- This is correct, always resets on new search

    const opts = { limit, page };
    if (pi) opts.pi_name = pi;
    if (grant) opts.title = grant;
    if (year) opts.year = year;

    return opts;
  }

  const runSearch = debounce(() => {
    const opts = buildSearchOpts();
    const hasFilter = Object.keys(opts).some(k => !['limit','page'].includes(k));

    if (!hasFilter) {
      window.grantsSetListOptions?.({ limit: opts.limit, page: opts.page });
      return;
    }
    window.grantsSearch?.(opts);
  }, 350);

  if (inputPI) {
    inputPI.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const opts = buildSearchOpts(); // <-- Correctly gets page 1
        const hasFilter = Object.keys(opts).some(k => !['limit','page'].includes(k));
        
        if (hasFilter) {
          window.grantsSearch?.(opts);
        } else {
          window.grantsSetListOptions?.({ limit: opts.limit, page: opts.page });
        }
      }
    });
    inputPI.addEventListener('input', runSearch);
  }

  if (inputGrant) inputGrant.addEventListener('input', runSearch);
  if (inputYear) inputYear.addEventListener('input', runSearch);

  window.grantsClearFilters = function () {
    if (inputPI) inputPI.value = '';
    if (inputGrant) inputGrant.value = '';
    if (inputYear) inputYear.value = '';
    // This correctly resets to page 1
    window.grantsSetListOptions?.({ limit: lastListOpts?.limit, page: 1 });
  };

  // Initial load
  loadCurrentMode();

})();