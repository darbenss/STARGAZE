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

  // Formats a date string (e.g., "2025-10-19") to just the year "2025"
  // Returns null if no valid date exists (so we can hide the element)
  function formatYear(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.getFullYear().toString();
  }

  // Check if a value is empty (null, undefined, empty string, empty array)
  function isEmpty(val) {
    if (val === null || val === undefined || val === '') return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
  }

  // Hide an element and optionally its parent container
  function hideElement(node, hideParent = false) {
    if (hideParent && node.parentElement) {
      node.parentElement.style.display = 'none';
    } else {
      node.style.display = 'none';
    }
  }

  // Hide the section including its subtitle (the previous sibling .grants-subtitle)
  function hideSection(node) {
    // Traverse up from the node to find the section container
    // We need to find the outermost container that is a direct child of .grants-info
    let current = node;
    let container = null;

    while (current && current.parentElement) {
      const parent = current.parentElement;
      // Check if parent is .grants-info - then current is the section container
      if (parent.classList && parent.classList.contains('grants-info')) {
        container = current;
        break;
      }
      // Or check if current matches one of our known section classes
      if (current.classList && (
        current.classList.contains('grants-members') ||
        current.classList.contains('grants-collaborators') ||
        current.classList.contains('papers-published') ||
        current.classList.contains('patents-published') ||
        current.classList.contains('masterphd-students') ||
        current.classList.contains('grants-img-attached')
      )) {
        // Make sure we get the outermost one (in case of nested same-class divs)
        const outerContainer = current.parentElement.closest('.grants-members, .grants-collaborators, .papers-published, .patents-published, .masterphd-students, .grants-img-attached');
        container = outerContainer || current;
        break;
      }
      current = parent;
    }

    if (container) {
      // Look for the preceding subtitle
      let prevSibling = container.previousElementSibling;
      while (prevSibling) {
        if (prevSibling.classList && prevSibling.classList.contains('grants-subtitle')) {
          prevSibling.style.display = 'none';
          break;
        }
        prevSibling = prevSibling.previousElementSibling;
      }
      container.style.display = 'none';
    }
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

      // 1. Scheme: Combine name and code - hide if no data
      if (field === 'scheme') {
        const name = safeText(item.grant_scheme_name);
        const code = safeText(item.grant_code);
        if (!name && !code) {
          hideElement(node);
          return;
        }
        node.textContent = name ? (code ? `${name} (${code})` : name) : code;
        return;
      }

      // 2. PI Name - hide if no data
      if (field === 'pi_name') {
        const val = item[field];
        if (isEmpty(val)) {
          // Hide the entire parent <p> element containing the label
          hideElement(node, true);
          return;
        }
        node.textContent = safeText(val);
        return;
      }

      // 3. Dates: Format as year only - hide if no data
      // End date is optional
      if (field === 'start_date') {
        const year = formatYear(item[field]);
        if (!year) {
          // Hide the entire .grants-startdate container
          hideElement(node, true);
          return;
        }
        node.textContent = year;
        return;
      }

      if (field === 'end_date') {
        const year = formatYear(item[field]);
        if (!year) {
          // Hide the entire .grants-enddate container (optional field)
          hideElement(node, true);
          return;
        }
        node.textContent = year;
        return;
      }

      // 4. Funder - hide if no data
      if (field === 'funder') {
        const val = item[field];
        if (isEmpty(val)) {
          // Hide the grants-funding container
          let fundingContainer = node.closest('.grants-funding');
          if (fundingContainer) fundingContainer.style.display = 'none';
          return;
        }
        node.textContent = safeText(val);
        return;
      }

      // 5. Team Members: Generate HTML cards - hide section if no data
      if (field === 'team_members_cards') {
        const members = item.team_members ?? [];
        if (!members.length) {
          hideSection(node);
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

      // 6a. Collaborators List (Names) - hide section if no data
      if (field === 'collaborators_list') {
        const collaborators = item.collaborators ?? [];
        if (!collaborators.length) {
          hideSection(node);
          return;
        }
        const listHtml = collaborators.map(c => `<li>${safeText(c.name ?? 'Unnamed Collaborator')}</li>`).join('');
        node.innerHTML = `<ul>${listHtml}</ul>`;
        return;
      }

      // 6b. Collaborators Images - hide if no data
      if (field === 'collaborators_images') {
        const collaborators = item.collaborators ?? [];
        if (!collaborators.length) {
          // collaborators_list handler will hide the section
          return;
        }
        const numPhotos = collaborators.length;
        const imgHtml = collaborators.map((c, index) => {
          const name = safeText(c.name ?? 'Collaborator');
          const altText = `Logo of ${name}`;
          let logoUrl = 'https://placehold.co/800x150/e0f2f1/004d40?text=Logo'; // Default

          if (c.logo && c.logo.url) {
            logoUrl = c.logo.url.startsWith('http') ? c.logo.url : (BASE_URL + c.logo.url);
          }
          // Set initial transform for all if multiple to prevent stacking
          const initialStyle = (numPhotos > 1) ? ' style="transform: translateX(100%);"' : '';
          return `<img src="${logoUrl}" alt="${altText}" class="grants_collaborators_photo"${initialStyle}>`;
        }).join('');
        node.innerHTML = imgHtml;

        // Set parent styles
        node.style.position = 'relative';
        node.style.overflow = 'hidden';

        // Dynamically handle animation based on number of photos
        const photos = node.querySelectorAll('.grants_collaborators_photo');
        if (numPhotos > 1) {
          const displayTime = 2; // Seconds each image is displayed
          const cycleTime = numPhotos * displayTime; // Total cycle time in seconds
          const visiblePercent = 100 / numPhotos;
          const transitionFraction = 0.25; // Fraction of visible time for in/out transitions (25% in, 25% out, 50% stay)
          const transitionPercent = transitionFraction * visiblePercent;
          const slideInEnd = transitionPercent;
          const stayStart = slideInEnd;
          const slideOutStart = visiblePercent - transitionPercent;
          const slideOutEnd = visiblePercent;

          const keyframes = `
            @keyframes slideLeft {
              0% { transform: translateX(100%); }
              ${slideInEnd}% { transform: translateX(0%); }
              ${stayStart}% { transform: translateX(0%); }
              ${slideOutStart}% { transform: translateX(0%); }
              ${slideOutEnd}% { transform: translateX(-100%); }
              100% { transform: translateX(-100%); }
            }
          `;

          // Create and append style element for dynamic keyframes
          const style = document.createElement('style');
          style.innerHTML = keyframes;
          document.head.appendChild(style);

          const delayStep = displayTime; // Delay increment in seconds
          photos.forEach((photo, index) => {
            photo.style.animation = `slideLeft ${cycleTime}s ${index * delayStep}s infinite`;
            photo.style.animationFillMode = 'backwards';
          });
        }
        return;
      }

      // 7a. Paper Citations List - hide section if no data
      if (field === 'papers_list') {
        const papers = getNested(item, 'project_output.paper_citation') ?? [];
        if (!papers.length) {
          hideSection(node);
          return;
        }
        const listHtml = papers.map(p => `<li>${safeText(p.text ?? 'N/A')}</li>`).join('');
        node.innerHTML = `<ul>${listHtml}</ul>`;
        return;
      }

      // 7b. Patent Citations List - hide section if no data
      if (field === 'patents_list') {
        const patents = getNested(item, 'project_output.patent_citation') ?? [];
        if (!patents.length) {
          hideSection(node);
          return;
        }
        const listHtml = patents.map(p => `<li>${safeText(p.text ?? 'N/A')}</li>`).join('');
        node.innerHTML = `<ul>${listHtml}</ul>`;
        return;
      }

      // 8. Graphical Abstract Image - hide if no data
      if (field === 'graphical_abstract') {
        const pic = item.graphical_abstract;
        if (!pic || !pic.url) {
          hideSection(node);
          return;
        }
        const url = pic.url.startsWith('http') ? pic.url : (BASE_URL + pic.url);
        if (node.tagName === 'IMG') {
          node.src = url;
          node.alt = item.project_title ?? 'Graphical Abstract';
        }
        return;
      }

      // 9. Handle Nested Fields (e.g., project_output.master) - hide if no data
      if (field.includes('.')) {
        const val = getNested(item, field);
        if (isEmpty(val)) {
          // For nested fields like master/phd, hide the stat container
          let statContainer = node.closest('.stat');
          if (statContainer) {
            statContainer.style.display = 'none';
            // Check if all siblings are hidden, then hide the parent section
            const statsRow = statContainer.closest('.stats-row');
            if (statsRow) {
              const visibleStats = Array.from(statsRow.querySelectorAll('.stat')).filter(s => s.style.display !== 'none');
              if (visibleStats.length === 0) {
                hideSection(node);
              }
            }
          }
          return;
        }
        node.textContent = formatNumber(val);
        return;
      }

      // 10. Default Handler for Simple Fields - hide if no data
      const val = item[field];
      if (isEmpty(val)) {
        hideElement(node);
        return;
      }
      node.textContent = safeText(val);
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

      // Update dynamic SEO meta tags
      const seoTitle = item.project_title || 'Grant Details';
      const seoDescription = item.grant_scheme_name
        ? `${item.project_title || 'Research grant'} funded by ${item.funder || 'external funding'}. PI: ${item.pi_name || 'N/A'}. Scheme: ${item.grant_scheme_name}.`
        : `View details about ${item.project_title || 'this research grant'} from Stargaze Centre of Excellence.`;
      if (typeof updateDynamicSEO === 'function') {
        updateDynamicSEO(seoTitle, seoDescription);
      }

      setStatus('Loaded');
    } catch (err) {
      console.error('Grant full-page fetch error', err);
      setStatus('Error: ' + (err.message || err), true);
    }
  })();

})();