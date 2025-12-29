(function () {
  const BASE_URL = AppConfig.BASE_URL;
  const API_BASE = BASE_URL + '/api';
  const statusEl = document.getElementById('homepage-status');

  const formatMoney = n =>
    typeof n === 'number' ? 'RM' + n.toLocaleString() : (n ?? '—');

  const formatNumber = n =>
    typeof n === 'number' ? (Number.isInteger(n) ? n.toString() : String(n)) : (n ?? '—');

  const safeNum = v => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(/[, ]+/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  function setStatus(text, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('error', !!isError);
  }

  // Map friendly source keys to endpoint paths
  const ENDPOINTS = {
    grants: '/grants-n-projects?mode=homepage',
    publics: '/publics?mode=homepage',
    publications: '/publics?mode=homepage', // alias
    news: '/news?mode=homepage',
    collaborators: '/collaborators?mode=homepage'
  };

  // cache fetched arrays by source key
  const cache = {};

  async function fetchForSource(key) {
    if (cache[key]) return cache[key];
    const ep = ENDPOINTS[key];
    if (!ep) return [];
    const url = API_BASE + ep;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${txt ? ' — ' + txt : ''} for ${url}`);
    }
    const payload = await res.json();
    // endpoint could return array or { data: [...] }
    const arr = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
    cache[key] = arr;
    return arr;
  }

  // Convert cover_picture.url (relative) -> absolute full URL
  function normalizeCoverUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//.test(url)) return url;
    // Strapi often returns "/uploads/..." — prepend BASE_URL
    return BASE_URL.replace(/\/$/, '') + url;
  }

  function populateNode(node, item, field) {
    if (!item) {
      if (node.tagName === 'IMG') {
        node.removeAttribute('src');
        node.alt = '—';
      } else {
        node.textContent = '—';
      }
      return;
    }

    // helper that uses the same single-level dot logic you have
    const getFieldValueLocal = (it, f) => {
      if (!it) return undefined;
      if (f.includes('.')) return f.split('.').reduce((acc, k) => acc?.[k], it);
      return it[f];
    };

    // classification + impact combo
    if (field === 'classification_impact') {
      const cls = getFieldValueLocal(item, 'indexing_classification');
      const impRaw = getFieldValueLocal(item, 'impact_factor');
      const imp = safeNum(impRaw);
      const formattedImp = imp !== null ? formatNumber(imp) : (impRaw ?? '—');
      const combo = [cls, formattedImp].filter(v => v && v !== '—').join(', ');
      node.textContent = combo || '—';
      return;
    }


    // handle cover images
    if (field === 'cover_picture' || field === 'cover_picture.url') {
      // picture object if field === 'cover_picture', else value might be a url string
      const picObj = field === 'cover_picture' ? getFieldValueLocal(item, 'cover_picture') : null;
      const value = getFieldValueLocal(item, field);
      const url = picObj?.url ?? (typeof value === 'string' ? value : null);
      const finalUrl = url ? normalizeCoverUrl(url) : null;

      // Set on <img> placeholders directly
      if (node.tagName === 'IMG') {
        if (finalUrl) node.src = finalUrl; else node.removeAttribute('src');
        const alt = picObj?.alternativeText ?? picObj?.caption ?? (item.title || item.project_title || item.journal_name) ?? '';
        node.alt = alt || 'cover image';
        return;
      }

      // If placeholder is non-img (e.g. <p> or <div>), create or reuse an <img> inside it
      let img = node.querySelector('img.publication_photo');
      if (!img) {
        img = document.createElement('img');
        img.className = 'publication_photo';
        node.innerHTML = '';
        node.appendChild(img);
      }
      if (finalUrl) {
        img.src = finalUrl;
      } else {
        img.src = 'https://placehold.co/150x150/e0f2f1/004d40?text=Ms'; // fallback, optional
      }
      const alt = picObj?.alternativeText ?? picObj?.caption ?? (item.title || item.project_title || item.journal_name) ?? '';
      img.alt = alt || 'cover image';
      return;
    }

    // general formatting for other fields
    let value = getFieldValueLocal(item, field);

    // Handle dates - show year only
    if (field === 'start_date' || field === 'end_date') {
      if (!value) {
        node.textContent = '—';
        return;
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        node.textContent = '—';
        return;
      }
      node.textContent = date.getFullYear();
      return;
    }

    if (field === 'funder') {
      // Funder is a simple text field (e.g., "MoHE")
      value = value ?? '—';
    } else if (field === 'impact_factor') {
      const n = safeNum(value);
      value = n !== null ? formatNumber(n) : (value ?? '—');
    } else if (field === 'project_title') {
      value = value || '—';
    } else {
      if (typeof value === 'number') value = formatNumber(value);
      else if (value === null || value === undefined || value === '') value = '—';
    }

    node.textContent = value;
  }

  function attachLinksForSource(sourceKey, cardSelector, fullpagePath) {
    const items = cache[sourceKey] || [];
    if (!items || !items.length) return;

    // cardSelector may be a comma-separated list. We must build selectors
    // like ".grants_card_light .stat-value[...] , .grants_card_dark .stat-value[...]"
    const selectorsPerIndex = (i) => {
      // split by comma, trim, append the stat-value suffix for each
      return cardSelector
        .split(',')
        .map(s => s.trim())
        .map(s => `${s} .stat-value[data-component="homepage"][data-source="${sourceKey}"][data-index="${i}"]`)
        .join(', ');
    };

    items.forEach((item, i) => {
      if (!item) return;

      // build correct selector for this index
      const sel = selectorsPerIndex(i);
      const node = document.querySelector(sel);
      if (!node) return;

      // find the correct card ancestor (one of the cardSelector parts)
      const card = node.closest(cardSelector.split(',').map(s => s.trim()).join(', '));
      if (!card) return;

      const instanceId = String(item.documentId ?? '');
      card.setAttribute('data-instance-id', instanceId);

      // if there's an anchor, set href, otherwise wrap children with <a>
      let link = card.querySelector('a');
      if (link) {
        link.href = new URL(fullpagePath + '?id=' + encodeURIComponent(instanceId), location.href).href;
        link.classList.add('publication-link');
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';
      } else {
        const a = document.createElement('a');
        a.className = 'publication-link';
        a.href = new URL(fullpagePath + '?id=' + encodeURIComponent(instanceId), location.href).href;
        a.style.textDecoration = 'none';
        a.style.color = 'inherit';
        while (card.firstChild) a.appendChild(card.firstChild);
        card.appendChild(a);
      }
    });
  }


  // Convenience wrappers
  function attachPublicationLinks() {
    attachLinksForSource('publics', '.publications_card', 'publication_fullpage.html');
  }
  function attachGrantLinks() {
    attachLinksForSource('grants', '.grants_card_light, .grants_card_dark', 'grants_fullpage.html');
  }
  function attachNewsLinks() {
    attachLinksForSource('news', '.news_card', 'news_fullpage.html');
  }

  // ============ COLLABORATORS SECTION ============
  async function fetchCollaborators() {
    const track = document.getElementById('collaborators-track');
    if (!track) {
      console.warn('fetchCollaborators: #collaborators-track not found in DOM');
      return;
    }

    try {
      console.log('fetchCollaborators: Starting fetch...');
      const arr = await fetchForSource('collaborators');
      console.log('fetchCollaborators: Received', arr.length, 'collaborators');

      if (!arr || !arr.length) {
        track.innerHTML = '<p style="color: var(--gray); text-align: center; width: 100%;">No collaborators found.</p>';
        return;
      }

      // Clear existing content
      track.innerHTML = '';

      // Create logo elements
      const createLogoElement = (item) => {
        const img = document.createElement('img');
        const logoUrl = item.logo?.url ? normalizeCoverUrl(item.logo.url) : 'https://placehold.co/150x80/eeeeee/333333?text=Logo';
        img.src = logoUrl;
        img.alt = item.name || 'Partner Logo';
        img.dataset.documentId = item.documentId;

        // Click handler to open modal
        img.addEventListener('click', () => openCollaboratorModal(item.documentId));

        return img;
      };

      // Add original logos
      // Logic: Create a "base set" large enough to fill the screen (minimum 12 items or more)
      let baseSet = [...arr];
      while (baseSet.length < 12) {
        baseSet = [...baseSet, ...arr];
      }

      // Create the final display list by doubling the base set for seamless scrolling
      // [Base Set] + [Base Set] -> Scroll moves 50% (one Base Set length) then resets
      const finalItems = [...baseSet, ...baseSet];

      finalItems.forEach((item) => {
        track.appendChild(createLogoElement(item));
      });

      // Start scroll animation immediately
      track.classList.add('animate');
      console.log('fetchCollaborators: Successfully rendered', finalItems.length, 'logo elements');

    } catch (err) {
      console.error('fetchCollaborators error:', err);
      track.innerHTML = '<p style="color: var(--gray); text-align: center; width: 100%;">Failed to load collaborators.</p>';
    }
  }

  // Modal handling
  const modalOverlay = document.getElementById('collaborator-modal-overlay');
  const modalCloseBtn = document.getElementById('collaborator-modal-close');
  const modalImg = document.getElementById('collaborator-modal-img');
  const modalName = document.getElementById('collaborator-modal-name');
  const modalDescription = document.getElementById('collaborator-modal-description');
  const modalProjects = document.getElementById('collaborator-modal-projects');
  const modalLink = document.getElementById('collaborator-modal-link');

  async function openCollaboratorModal(documentId) {
    if (!modalOverlay) return;

    try {
      // Fetch detail
      const url = API_BASE + '/collaborators?mode=detail&id=' + encodeURIComponent(documentId);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch collaborator details');
      const data = await res.json();

      // Populate modal
      const logoUrl = data.logo?.url ? normalizeCoverUrl(data.logo.url) : '';
      if (modalImg) {
        modalImg.src = logoUrl;
        modalImg.alt = data.name || 'Collaborator Logo';
      }
      if (modalName) modalName.textContent = data.name || 'Unknown';
      if (modalDescription) modalDescription.textContent = data.description || '';

      // Populate related projects
      if (modalProjects) {
        modalProjects.innerHTML = '';
        const projects = data.grants_and_projects || [];
        if (projects.length > 0) {
          const projectsHeader = document.createElement('h3');
          projectsHeader.textContent = 'Related Projects';
          modalProjects.appendChild(projectsHeader);

          projects.forEach(proj => {
            const item = document.createElement('div');
            item.className = 'collaborator-modal-project-item';
            item.innerHTML = `
              <h4>${proj.project_title || 'Untitled Project'}</h4>
              <span>${proj.grant_scheme_name || ''}</span>
            `;
            modalProjects.appendChild(item);
          });
        }
      }

      // Website link
      if (modalLink) {
        if (data.link) {
          modalLink.href = data.link;
          modalLink.classList.remove('hidden');
        } else {
          modalLink.classList.add('hidden');
        }
      }

      // Show modal
      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scroll

    } catch (err) {
      console.error('openCollaboratorModal error', err);
    }
  }

  function closeCollaboratorModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('active');
    document.body.style.overflow = ''; // Restore scroll
  }

  // Modal close handlers
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeCollaboratorModal);
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeCollaboratorModal();
    });
  }

  // ESC key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay?.classList.contains('active')) {
      closeCollaboratorModal();
    }
  });

  async function fetchAndPopulateHomepage() {
    setStatus('Loading homepage data...');
    try {
      // always refresh these sources so homepage shows latest
      cache.grants = undefined;
      cache.publics = undefined;
      cache.news = undefined;
      cache.collaborators = undefined;

      // collect all nodes and group by source
      const nodes = Array.from(document.querySelectorAll('.stat-value[data-component="homepage"]'));
      if (!nodes.length) {
        setStatus('No homepage placeholders found.');
        return;
      }

      // For efficiency, determine which sources we need to fetch
      const sourcesNeeded = new Set();
      const nodeInfos = nodes.map(node => {
        const indexAttr = node.getAttribute('data-index');
        const index = indexAttr !== null ? parseInt(indexAttr, 10) : 0;
        const field = node.getAttribute('data-field');
        const source = node.getAttribute('data-source'); // must be one of endpoints
        sourcesNeeded.add(source);
        return { node, source, index, field };
      });

      // fetch each required source (in parallel)
      await Promise.all(Array.from(sourcesNeeded).map(s => fetchForSource(s).catch(err => { throw err; })));

      // populate nodes
      nodeInfos.forEach(({ node, source, index, field }) => {
        const arr = cache[source] || [];
        const item = arr[index];
        populateNode(node, item, field);
      });

      // expose fetched arrays globally for debugging & fullpage helpers
      window.__homepage_cache = window.__homepage_cache || {};
      window.__homepage_cache.publics = cache.publics || [];
      window.__homepage_cache.grants = cache.grants || [];
      window.__homepage_cache.news = cache.news || [];

      // attach links now that placeholders are populated
      try {
        attachPublicationLinks();
        attachGrantLinks();
        attachNewsLinks();
      } catch (err) {
        console.warn('attachLinks error', err);
      }

      // Fetch and populate collaborators section
      try {
        await fetchCollaborators();
      } catch (err) {
        console.warn('fetchCollaborators error', err);
      }

      setStatus('Last updated: ' + new Date().toLocaleString());
    } catch (err) {
      console.error('fetchAndPopulateHomepage error', err);
      setStatus('Error: ' + (err.message || err), true);
    }
  }

  // initial load
  fetchAndPopulateHomepage();

  // expose refresh
  window.homepageRefresh = fetchAndPopulateHomepage;
})();