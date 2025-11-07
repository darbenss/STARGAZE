(function () {
  const BASE_URL = AppConfig.BASE_URL;
  const API_BASE = BASE_URL + '/api/news'; // Changed from /api/publics
  const statusEl = document.getElementById('news-full-status'); // Changed from publication-full-status

  function setStatus(msg, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.toggle('error', !!isError);
  }

  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function safeText(s) {
    if (s === null || s === undefined) return '';
    return String(s);
  }

  // This helper function seems unused in the publication script, but keeping it in case
  function formatNumber(n) {
    if (n === null || n === undefined || n === '') return '—';
    const num = Number(n);
    return Number.isFinite(num) ? (Number.isInteger(num) ? String(num) : String(num)) : String(n);
  }

  // --- Strapi Data Normalization Helpers (Keep As-Is) ---
  function normalizeStrapiItem(raw) {
    if (!raw) return null;
    if (raw?.attributes) {
      return { id: raw.id, ...raw.attributes };
    }
    return raw;
  }

  function extractSingleItemFromPayload(payload) {
    if (!payload) return null;
    // Your news payload is an array [{}], this will correctly grab the first item.
    if (Array.isArray(payload) && payload.length > 0) {
      return normalizeStrapiItem(payload[0]);
    }
    if (payload.data) {
      if (Array.isArray(payload.data) && payload.data.length > 0) {
        return normalizeStrapiItem(payload.data[0]);
      }
      if (!Array.isArray(payload.data) && typeof payload.data === 'object') {
        return normalizeStrapiItem(payload.data);
      }
    }
    if (typeof payload === 'object') {
      return normalizeStrapiItem(payload);
    }
    return null;
  }
  
  // --- Fetch Logic (Keep As-Is, uses new API_BASE) ---
  async function fetchById(id) {
    try {
      const url = `${API_BASE}?mode=detail&id=${encodeURIComponent(id)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${txt ? ' — ' + txt : ''}`);
      }
      const payload = await res.json();
      // This function will correctly extract the single news item from the array
      return extractSingleItemFromPayload(payload);
    } catch (e) {
      console.warn('fetchById failed', e);
      return null;
    }
  }

  // --- Markdown Renderer (Keep As-Is) ---
  // This is perfect for your `news_content` field.
  function markdownToHtml(md) {
    if (!md) return '';
    // Normalize line endings
    let s = String(md).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Escape HTML special chars first
    const escapeHtml = (str) => str.replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

    // We'll process line-by-line
    const lines = s.split('\n');

    const out = [];
    let inList = false;

    for (let rawLine of lines) {
      // Handle horizontal rules ---
      if (rawLine.trim().match(/^-{3,}$/)) {
        if (inList) { out.push('</ul>'); inList = false; }
        out.push('<hr>');
        continue;
      }
      
      const line = rawLine.trim();
      if (line === '') {
        // close list if open
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        continue;
      }

      // headings: ##, ###, # etc.
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        if (inList) { out.push('</ul>'); inList = false; }
        const level = headingMatch[1].length;
        const content = inlineFormatting(headingMatch[2]);
        out.push(`<h${level}>${content}</h${level}>`);
        continue;
      }

      // blockquote: >
      const bqMatch = line.match(/^>\s+(.*)$/);
      if (bqMatch) {
        if (inList) { out.push('</ul>'); inList = false; }
        out.push(`<blockquote><p>${inlineFormatting(bqMatch[1])}</p></blockquote>`);
        continue;
      }

      // unordered list: - or *
      const ulMatch = line.match(/^[-*]\s+(.*)$/);
      if (ulMatch) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${inlineFormatting(ulMatch[1])}</li>`);
        continue;
      }
      
      // If we are in a list but the line doesn't match, close the list
      if (inList) {
         out.push('</ul>');
         inList = false;
      }

      // paragraph (default)
      out.push(`<p>${inlineFormatting(line)}</p>`);
    }

    if (inList) out.push('</ul>');

    return out.join('\n');

    // helper for inline formatting
    function inlineFormatting(txt) {
      let t = escapeHtml(txt);

      // links: [text](url)
      t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => {
        const safeUrl = escapeHtml(url);
        const safeTextInner = escapeHtml(text);
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeTextInner}</a>`;
      });

      // bold **text**
      t = t.replace(/\*\*([^*]+)\*\*/g, (m, inner) => `<strong>${escapeHtml(inner)}</strong>`);

      // italic *text*
      t = t.replace(/\*([^*]+)\*/g, (m, inner) => `<em>${escapeHtml(inner)}</em>`);

      // inline code `code`
      t = t.replace(/`([^`]+)`/g, (m, inner) => `<code>${escapeHtml(inner)}</code>`);

      return t;
    }
  }

  // --- Page Population Logic (MODIFIED) ---
  function populateFullPage(item) {
    if (!item) return;
    // Select based on 'news-full'
    const nodes = document.querySelectorAll('.stat-value[data-component="news-full"]');
    nodes.forEach(node => {
      const field = node.getAttribute('data-field');
      if (!field) return;

      // image handling (KEPT AS-IS)
      // This logic is robust and will work for your news item's cover_picture
      if (field === 'cover_picture' || field === 'cover_picture.url') {
        const pic = item.cover_picture ?? item.cover_image ?? null;
        let url = null;
        if (pic) {
          // Handles nested Strapi v4/v3 image formats
          if (pic?.data?.attributes) url = pic.data.attributes.url;
          else if (pic?.attributes) url = pic.attributes.url;
          else if (pic?.url) url = pic.url;
        }
        if (!url && typeof item.cover_picture === 'string') url = item.cover_picture;
        
        // Prepend BASE_URL if the URL is relative (e.g., /uploads/...)
        const finalUrl = url ? (url.startsWith('http') ? url : (BASE_URL + url)) : null;

        if (node.tagName === 'IMG') {
          if (finalUrl) node.src = finalUrl; else node.removeAttribute('src');
          node.alt = item.title ?? 'cover image';
        } else {
          // This handles the case where the node is a container (e.g., a div)
          let img = node.querySelector('img.news_photo'); // Use a different class
          if (!img) {
            img = document.createElement('img');
            img.className = 'news_photo'; // Use a different class
            node.innerHTML = '';
            node.appendChild(img);
          }
          img.src = finalUrl || 'https://placehold.co/600x400/e0f2f1/004d40?text=News'; // Placeholder
          img.alt = item.title ?? 'cover image';
        }
        return;
      }

      // ** REMOVED ** publication-specific fields (classification, vol_issue, authors, doi)

      // news_content: markdown -> HTML (MODIFIED)
      if (field === 'news_content') {
        const md = item[field] ?? '';
        const html = markdownToHtml(md);
        node.innerHTML = html || '—';
        return;
      }
      
      // date: Special formatting (Optional, but nice to have)
      if (field === 'date' && item[field]) {
         try {
           const d = new Date(item[field]);
           node.textContent = d.toLocaleDateString('en-US', {
             year: 'numeric',
             month: 'long',
             day: 'numeric'
           });
         } catch(e) {
           node.textContent = safeText(item[field] ?? '—');
         }
         return;
      }

      // default: write text/plain (KEPT AS-IS)
      // This will handle 'title' and 'documentId'
      const val = (item[field] !== undefined) ? item[field] : (item.attributes?.[field] ?? '');
      if (node.tagName === 'IMG') {
        if (val) node.src = val;
      } else {
        node.textContent = safeText(val ?? '—');
      }
    });
  }

  // --- Initialization (MODIFIED for news) ---
  (async function init() {
    try {
      setStatus('Loading news...');
      const id = qs('id');
      if (!id) {
        setStatus('No id provided in URL', true);
        return;
      }
      const item = await fetchById(id);
      if (!item) {
        setStatus('News not found', true);
        return;
      }
      populateFullPage(item);
      setStatus('Loaded');
      
      // Also set the page title
      if (item.title) {
        document.title = item.title;
      }
      
    } catch (err) {
      console.error('news full fetch error', err);
      setStatus('Error: ' + (err.message || err), true);
    }
  })();

})();