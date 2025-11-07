(function () {
  const BASE_URL = AppConfig.BASE_URL;
  const API_BASE = BASE_URL + '/api/grants-n-projects';
  const statusEl = document.getElementById('grant-full');

  // === HELPER FUNCTIONS ===

  function setStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.toggle('error', !!isError);
  }

  // Gets a query string parameter from the URL (e.g., ?id=3)
  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  // Ensures a value is a string, even if null/undefined
  function safeText(s) {
    if (s === null || s === undefined) return '';
    return String(s);
  }

  // Formats a number or returns '—'
  function formatNumber(n) {
    if (n === null || n === undefined || n === '') return '—';
    const num = Number(n);
    return Number.isFinite(num) ? num.toLocaleString() : String(n);
  }
  
  // Formats a number as currency
  const formatMoney = n => {
    if (n === null || n === undefined || n === '') return '—';
    const num = Number(String(n).replace(/[, ]+/g, ''));
    return Number.isFinite(num) ? 'RM ' + num.toLocaleString() : (n ?? '—');
  };

  // Formats a date string (e.g., "2025-10-19") to "October 19, 2025"
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Safely get a nested value (e.g., item.project_output.master)
  function getNested(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, k) => acc?.[k], obj);
  }

  // === API FETCHING LOGIC ===

  // Extracts the first item from the API response (which is an array)
  function extractSingleItemFromPayload(payload) {
    if (!payload) return null;
    if (Array.isArray(payload) && payload.length > 0) {
      // The grant data is flat, so just return the first item
      return payload[0]; 
    }
    // Add fallback for other possible Strapi structures
    if (payload) return payload;
    if (payload.data) {
      if (Array.isArray(payload.data) && payload.data.length > 0) {
        return payload.data[0].attributes ? { id: payload.data[0].id, ...payload.data[0].attributes } : payload.data[0];
      }
      if (!Array.isArray(payload.data) && typeof payload.data === 'object') {
        return payload.data.attributes ? { id: payload.data.id, ...payload.data.attributes } : payload.data;
      }
    }
    return null;
  }

  async function fetchById(id) {
    try {
      const url = `${API_BASE}?mode=detail&id=${encodeURIComponent(id)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${txt ? ' — ' + txt : ''}`);
      }
      const payload = await res.json();
      return extractSingleItemFromPayload(payload);
    } catch (e) {
      console.warn('fetchById failed', e);
      return null;
    }
  }

  // === DOM POPULATION LOGIC ===

  function populateFullPage(item) {
    if (!item) return;
    const nodes = document.querySelectorAll('.stat-value[data-component="grant-full"]');
    
    nodes.forEach(node => {
      const field = node.getAttribute('data-field');
      if (!field) return;

      // --- Custom Handlers for Specific Fields ---

      // 1. Scheme: Combine name and code
      if (field === 'scheme') {
        const name = safeText(item.grant_scheme_name);
        const code = safeText(item.grant_code);
        node.textContent = name ? (code ? `${name} (${code})` : name) : '—';
        return;
      }

      // 2. Dates: Format as "January 1, 2023"
      if (field === 'start_date' || field === 'end_date') {
        node.textContent = formatDate(item[field]);
        return;
      }

      // 3. Team Members: Generate HTML cards
      if (field === 'team_members_cards') {
        const members = item.team_members ?? [];
        if (!members.length) {
          node.innerHTML = '<p>No team members listed.</p>';
          return;
        }
        const html = members.map(member => {
          const name = safeText(member.person ?? 'Unnamed Member');
          const altText = `Photo of ${name}`;
          // Use first initial for placeholder text
          const initial = (name.match(/[a-zA-Z]/) || ['M'])[0].toUpperCase();
          const placeholderUrl = `https://placehold.co/150x150/e0f2f1/004d40?text=${initial}`;
          
          return `
            <div class="member-card">
              <img src="${placeholderUrl}" alt="${altText}" class="member-photo">
              <h3 class="member-name">${name}</h3>
            </div>
          `;
        }).join('');
        node.innerHTML = html;
        return;
      }

      // 4a. Collaborators List (Names)
      if (field === 'collaborators_list') {
        const collaborators = item.collaborator ?? [];
        if (!collaborators.length) {
          node.innerHTML = '<ul><li>No collaborators listed.</li></ul>';
          return;
        }
        const listHtml = collaborators.map(c => `<li>${safeText(c.name ?? 'Unnamed Collaborator')}</li>`).join('');
        node.innerHTML = `<ul>${listHtml}</ul>`;
        return;
      }

      // 4b. Collaborators Images
      if (field === 'collaborators_images') {
        const collaborators = item.collaborator ?? [];
        if (!collaborators.length) {
          node.innerHTML = ''; // No images
          return;
        }
        const imgHtml = collaborators.map(c => {
          const name = safeText(c.name ?? 'Collaborator');
          const altText = `Logo of ${name}`;
          let logoUrl = 'https://placehold.co/800x150/e0f2f1/004d40?text=Logo'; // Default
          
          if (c.logo && c.logo.url) {
            logoUrl = c.logo.url.startsWith('http') ? c.logo.url : (BASE_URL + c.logo.url);
          }
          return `<img src="${logoUrl}" alt="${altText}" class="grants_collaborators_photo">`;
        }).join('');
        node.innerHTML = imgHtml;
        return;
      }

      // 5a. Paper Citations List
      if (field === 'papers_list') {
        const papers = getNested(item, 'project_output.paper_citation') ?? [];
        if (!papers.length) {
          node.innerHTML = '<ul><li>No papers listed.</li></ul>';
          return;
        }
        const listHtml = papers.map(p => `<li>${safeText(p.text ?? 'N/A')}</li>`).join('');
        node.innerHTML = `<ul>${listHtml}</ul>`;
        return;
      }

      // 5b. Patent Citations List
      if (field === 'patents_list') {
        const patents = getNested(item, 'project_output.patent_citation') ?? [];
        if (!patents.length) {
          node.innerHTML = '<ul><li>No patents listed.</li></ul>';
          return;
        }
        const listHtml = patents.map(p => `<li>${safeText(p.text ?? 'N/A')}</li>`).join('');
        node.innerHTML = `<ul>${listHtml}</ul>`;
        return;
      }

      // --- Special Handling for Images ---
      if (field === 'graphical_abstract') {
        let url = null;
        const pic = item.graphical_abstract;
        if (pic && pic.url) {
          url = pic.url.startsWith('http') ? pic.url : (BASE_URL + pic.url);
        }
        if (node.tagName === 'IMG') {
          node.src = url || 'https://placehold.co/600x400/e0f2f1/004d40?text=Abstract';
          node.alt = item.project_title ?? 'Graphical Abstract';
        }
        return;
      }

      // --- Handle Nested Fields (e.g., project_output.master) ---
      if (field.includes('.')) {
        const val = getNested(item, field);
        node.textContent = formatNumber(val); // Use formatNumber for these
        return;
      }

      // --- Default Handler for Simple Fields ---
      const val = item[field];
      if (field === 'total_funding') {
        node.textContent = formatMoney(val);
      } else {
        node.textContent = safeText(val ?? '—');
      }
    });
  }

  // === SCRIPT ENTRY POINT ===
  
  (async function init() {
    try {
      setStatus('Loading grant details...');
      const id = qs('id');
      if (!id) {
        setStatus('No ID provided in URL', true);
        return;
      }
      const item = await fetchById(id);
      console.log('Populating with item:', item);
      if (!item) {
        setStatus('Grant not found', true);
        return;
      }
      
      document.querySelectorAll('.stat-value[data-component="grant-full"]').forEach(n => console.log(n.getAttribute('data-field'), n.tagName));
      populateFullPage(item);
      // Also update the browser tab title
      document.title = item.project_title || document.title;
      setStatus('Loaded');
    } catch (err) {
      console.error('Grant full-page fetch error', err);
      setStatus('Error: ' + (err.message || err), true);
    }
  })();

})();