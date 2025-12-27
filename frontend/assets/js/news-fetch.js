// assets/js/news-fetch.js
(function () {
  const BASE_URL = AppConfig.BASE_URL;
  const API_PATH = '/api/news';
  const statusEl = document.getElementById('news-status');

  // defaults / state
  let currentMode = 'list'; // 'list' or 'searching'
  let lastListOpts = { limit: 8, page: 1 };
  let lastSearchOpts = { title: '', limit: 8, page: 1 };

  const cache = {};

  function setStatus(text, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('error', !!isError);
  }

  const safeText = v => (v === null || v === undefined || v === '') ? '—' : String(v);

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  function buildUrlForMode(mode, opts = {}) {
    const qs = new URLSearchParams();
    qs.set('mode', mode);
    if (mode === 'list') {
      qs.set('limit', opts.limit ?? lastListOpts.limit ?? 8);
      qs.set('page', opts.page ?? lastListOpts.page ?? 1);
    } else if (mode === 'searching') {
      if (opts.title) qs.set('title', opts.title);
      qs.set('limit', opts.limit ?? lastSearchOpts.limit ?? 8);
      qs.set('page', opts.page ?? lastSearchOpts.page ?? 1);
    } else {
      throw new Error('Unknown mode: ' + mode);
    }
    return `${BASE_URL}${API_PATH}?${qs.toString()}`;
  }

  // --- MODIFIED FUNCTION ---
  async function fetchUrl(url, useCache = false) {
    // Caching is disabled for pagination to work reliably
    console.debug('news-fetch: fetching', url);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${txt ? ' — ' + txt : ''} for ${url}`);
    }
    const payload = await res.json();
    
    // Keep original cache behavior for compatibility (if other scripts use it)
    const arr = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
    cache[url] = arr;
    
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

  // populate individual placeholder node
  function populateNode(node, item, field) {
    // ... (This function is unchanged) ...
    if (!item) {
      node.textContent = '—';
      return;
    }
    if (field === 'title') {
      node.textContent = safeText(resolve(item, 'title') ?? resolve(item, 'headline') ?? 'Untitled');
      return;
    }
    if (field === 'date') {
      const dateStr = resolve(item, 'date') ?? resolve(item, 'published_at') ?? resolve(item, 'createdAt');
      node.textContent = formatDate(dateStr);
      return;
    }
    if (field === 'excerpt') {
      const ex = resolve(item, 'description') ?? resolve(item, 'excerpt') ?? resolve(item, 'summary') ?? resolve(item, 'content');
      const text = typeof ex === 'string' ? ex.replace(/\s+/g, ' ').trim() : (ex ? String(ex) : '');
      node.textContent = text ? (text.length > 160 ? text.slice(0, 157) + '…' : text) : '';
      return;
    }
    let val = resolve(item, field);
    node.textContent = val ?? '—';
  }

  // --- RENDER function
  function renderNewsList(items) {
    // ... (This function is unchanged) ...
    const container = document.getElementById('news-cards-container');
    const template = document.getElementById('news-card-template');
    if (!container || !template) {
      console.error('Missing #news-cards-container or #news-card-template in HTML.');
      setStatus('Page layout error.', true);
      return;
    }
    container.innerHTML = '';
    if (!items || items.length === 0) {
      container.innerHTML = '<p>No news found matching your criteria.</p>';
      return;
    }
    items.forEach(item => {
      const clone = template.content.cloneNode(true);
      const link = clone.querySelector('a');
      if (link) {
        const instanceId = String(item.documentId ?? resolve(item, 'id') ?? '');
        link.href = `news_fullpage.html?id=${encodeURIComponent(instanceId)}`;
      }
      const imgEl = clone.querySelector('img.publication_photo');
      const cpUrl = resolve(item, 'cover_picture.url') ?? resolve(item, 'cover_picture.data.attributes.url') ?? resolve(item, 'cover_picture.attributes.url');
      let finalImg = cpUrl || '';
      if (finalImg && finalImg.startsWith('/')) finalImg = BASE_URL + finalImg;
      if (!finalImg) finalImg = 'https://placehold.co/600x400?text=No+Image';
      if (imgEl) {
        imgEl.src = finalImg;
        imgEl.alt = safeText(resolve(item, 'title') ?? 'news image');
        imgEl.addEventListener('error', () => {
          imgEl.src = 'https://placehold.co/600x400?text=No+Image';
        });
      }
      const nodes = clone.querySelectorAll('.stat-value[data-component="news"]');
      nodes.forEach(node => {
        const field = node.getAttribute('data-field');
        if (field) populateNode(node, item, field);
      });
      const h2 = clone.querySelector('h2');
      if (h2) populateNode(h2, item, 'title');
      const p = clone.querySelector('p.excerpt');
      if (p) populateNode(p, item, 'excerpt');
      const span = clone.querySelector('span.date');
      if (span) populateNode(span, item, 'date');
      container.appendChild(clone);
    });
  }

  // --- NEW PAGINATION RENDER FUNCTION ---
  // This replaces your old 'renderPagination'
  function updatePaginationUI(currentPage, totalPages) {
    // Use the ID from your old function
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) {
        console.warn('Pagination container "#news-pagination" not found.');
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
        
        if (currentMode === 'list') {
            // **ADAPTED**
            window.newsSetListOptions({ page: newPage });
        } else {
            const opts = { ...lastSearchOpts, page: newPage };
            // **ADAPTED**
            window.newsSearch(opts);
        }
    }

    // Previous button (using <a> tags like publications script)
    const prev = document.createElement('a');
    prev.innerHTML = '&laquo; Prev';
    prev.classList.add('prev'); // Add classes for styling
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


  // --- MODIFIED MAIN fetch + populate routine ---
  async function loadCurrentMode() {
    try {
      setStatus('Loading news...');
      const url = buildUrlForMode(currentMode, currentMode === 'list' ? lastListOpts : lastSearchOpts);
      
      // **PAYLOAD** is now the full object, not just the items array
      const payload = await fetchUrl(url, false);
      
      // **ITEMS** are extracted from payload (assuming {data: [...]} or [...])
      const items = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);

      // **NEW PAGINATION LOGIC**
      const paginationMeta = payload.meta?.pagination;
      const limit = (currentMode === 'list' ? lastListOpts.limit : lastSearchOpts.limit);

      if (paginationMeta) {
          const currentPage = paginationMeta.page || (currentMode === 'list' ? lastListOpts.page : lastSearchOpts.page);
          const totalPages = paginationMeta.pageCount || Math.ceil(paginationMeta.total / (paginationMeta.pageSize || limit));
          
          updatePaginationUI(currentPage, totalPages);
      } else {
          // No pagination metadata found, clear the pagination container
          const paginationContainer = document.getElementById('news-pagination');
          if (paginationContainer) paginationContainer.innerHTML = '';
          if (items.length > 0) {
            console.warn("Pagination metadata (e.g., payload.meta.pagination) not found in API response. Pagination UI will not be rendered.");
          }
      }
      // **END NEW PAGINATION LOGIC**

      renderNewsList(items);
      // renderPagination(items.length); // <-- OLD FUNCTION REMOVED

      setStatus('Last updated: ' + new Date().toLocaleString());
    } catch (err) {
      console.error('news fetch error', err);
      setStatus('Error: ' + (err.message || err), true);
      // Clear pagination on error
      const paginationContainer = document.getElementById('news-pagination');
      if (paginationContainer) paginationContainer.innerHTML = '';
    }
  }

  // Public API: list controls
  window.newsSetListOptions = function (opts = {}) {
    lastListOpts.limit = opts.limit ?? lastListOpts.limit;
    lastListOpts.page = opts.page ?? lastListOpts.page;
    currentMode = 'list';
    loadCurrentMode();
  };

  // Public API: run search
  window.newsSearch = function (opts = {}) {
    lastSearchOpts.title = opts.title ?? lastSearchOpts.title ?? '';
    lastSearchOpts.limit = opts.limit ?? lastSearchOpts.limit;
    lastSearchOpts.page = opts.page ?? 1; // page is correctly set
    currentMode = 'searching';

    const url = buildUrlForMode(currentMode, lastSearchOpts);
    delete cache[url];
    loadCurrentMode();
  };

  window.newsClearSearch = function () {
    currentMode = 'list';
    // **MODIFICATION**: Reset to page 1
    lastListOpts.page = 1; 
    loadCurrentMode();
  };

  window.newsRefresh = function () {
    Object.keys(cache).forEach(k => delete cache[k]);
    loadCurrentMode();
  };

  // ---------- UI glue (search input, debounce, events) ----------
  const inputSearch = document.getElementById('news-search');

  function debounce(fn, wait = 350) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function buildSearchOpts() {
    const title = (inputSearch?.value || '').trim();
    const limit = lastSearchOpts?.limit ?? lastListOpts?.limit ?? 8;
    const page = 1; // Always reset to page 1 on a new search
    const opts = { limit, page };
    if (title) opts.title = title;
    return opts;
  }

  const runSearch = debounce(() => {
    const opts = buildSearchOpts();
    const hasFilter = Object.keys(opts).some(k => !['limit','page'].includes(k));
    if (!hasFilter) {
      window.newsSetListOptions?.({ limit: opts.limit, page: opts.page });
      return;
    }
    window.newsSearch?.(opts);
  }, 350);

  if (inputSearch) {
    // ... (This logic is unchanged and correct) ...
    inputSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const opts = buildSearchOpts(); // This will reset page to 1
        const hasFilter = Object.keys(opts).some(k => !['limit','page'].includes(k));
        if (hasFilter) window.newsSearch?.(opts);
        else window.newsSetListOptions?.({ limit: opts.limit, page: opts.page });
      }
    });
    inputSearch.addEventListener('input', runSearch);
  }

  // init
  loadCurrentMode();

})();