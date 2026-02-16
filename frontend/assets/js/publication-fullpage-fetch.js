(function () {
  const BASE_URL = AppConfig.BASE_URL;
  const API_BASE = BASE_URL + '/api/publics';
  const statusEl = document.getElementById('publication-full-status');

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

  function formatNumber(n) {
    if (n === null || n === undefined || n === '') return '—';
    const num = Number(n);
    return Number.isFinite(num) ? (Number.isInteger(num) ? String(num) : String(num)) : String(n);
  }

  function normalizeStrapiItem(raw) {
    if (!raw) return null;
    if (raw?.attributes) {
      return { id: raw.id, ...raw.attributes };
    }
    return raw;
  }

  function extractSingleItemFromPayload(payload) {
    if (!payload) return null;
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

  // Basic markdown -> HTML converter (supports headings, bold, italic, links, lists, paragraphs)
  // Not a full parser but good enough for your executive_summary and funding_section.
  function markdownToHtml(md) {
    if (!md) return '';
    // Normalize line endings
    let s = String(md).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Escape HTML special chars first to avoid injection, then unescape allowed constructs
    const escapeHtml = (str) => str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

    // We'll process line-by-line
    const lines = s.split('\n');

    const out = [];
    let inList = false;

    for (let rawLine of lines) {
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

      // unordered list: - or *
      const ulMatch = line.match(/^[-*]\s+(.*)$/);
      if (ulMatch) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${inlineFormatting(ulMatch[1])}</li>`);
        continue;
      }

      // paragraph
      out.push(`<p>${inlineFormatting(line)}</p>`);
    }

    if (inList) out.push('</ul>');

    return out.join('\n');

    // helper for inline formatting: bold **text**, italic *text*, links [t](u)
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

      // italic *text* (avoid double-star matches)
      t = t.replace(/\*([^*]+)\*/g, (m, inner) => `<em>${escapeHtml(inner)}</em>`);

      // inline code `code`
      t = t.replace(/`([^`]+)`/g, (m, inner) => `<code>${escapeHtml(inner)}</code>`);

      return t;
    }
  }

  // Populate placeholders: elements with data-component="publication-full" and data-field
  function populateFullPage(item) {
    if (!item) return;
    const nodes = document.querySelectorAll('.stat-value[data-component="publication-full"]');
    nodes.forEach(node => {
      const field = node.getAttribute('data-field');
      if (!field) return;

      // image handling
      if (field === 'cover_picture' || field === 'cover_picture.url') {
        const pic = item.cover_picture ?? item.cover_image ?? null;
        let url = null;
        if (pic) {
          if (pic?.data?.attributes) url = pic.data.attributes.url;
          else if (pic?.attributes) url = pic.attributes.url;
          else if (pic?.url) url = pic.url;
        }
        if (!url && typeof item.cover_picture === 'string') url = item.cover_picture;
        const finalUrl = url ? (url.startsWith('http') ? url : (BASE_URL + url)) : null;

        if (node.tagName === 'IMG') {
          if (finalUrl) {
            node.src = finalUrl;
            node.alt = '';
          } else {
            // Replace IMG with placeholder div
            const placeholder = document.createElement('div');
            placeholder.className = 'no-image-placeholder';
            placeholder.innerHTML = '<span>No Image</span>';
            node.parentNode.replaceChild(placeholder, node);
          }
        } else {
          if (finalUrl) {
            let img = node.querySelector('img.publication_photo');
            if (!img) {
              img = document.createElement('img');
              img.className = 'publication_photo';
              node.innerHTML = '';
              node.appendChild(img);
            }
            img.src = finalUrl;
            img.alt = '';
          } else {
            // Show no-image placeholder
            node.innerHTML = '<div class="no-image-placeholder"><span>No Image</span></div>';
          }
        }
        return;
      }

      // classification_impact: combine indexing_classification + impact_factor + publication_type
      if (field === 'classification_impact') {
        const cls = item.indexing_classification ?? '';
        const impRaw = item.impact_factor ?? '';
        const imp = (typeof impRaw === 'number' || !isNaN(Number(impRaw))) ? formatNumber(impRaw) : impRaw;
        const type = item.publication_type ?? '';
        // if type looks like 'granted patent', prefer just type text
        if (type && /patent/i.test(type)) {
          node.textContent = `${type}`;
        } else {
          const parts = [];
          if (imp && imp !== '—') parts.push(imp);
          const innerParts = [];
          if (cls) innerParts.push(cls);
          if (type) {
            // normalize 'technical' -> 'technical paper' unless already contains 'paper'
            let typ = String(type);
            if (!/paper/i.test(typ)) typ = typ + ' paper';
            innerParts.push(typ);
          }
          const inner = innerParts.join(', ');
          node.textContent = (parts.length ? parts.join('') + (inner ? ` (${inner})` : '') : (inner || '—'));
        }
        return;
      }

      // volume/issue/pages/year combined field: vol_issue_pages_year
      if (field === 'vol_issue_pages_year') {
        // example: Vol. 16, No. 9, pp. 2031-2048, 2025
        const vol = item.vol ?? item.volume ?? '';
        const issue = item.issue ?? item.no ?? '';
        const start = item.page_start ?? item.pageStart ?? item.start_page ?? '';
        const end = item.page_end ?? item.pageEnd ?? item.end_page ?? '';
        const year = (item.date ? new Date(item.date).getFullYear() : (item.year ?? item.pub_year ?? '')) || '';
        const parts = [];
        if (vol) parts.push(`Vol. ${vol}`);
        if (issue) parts.push(`No. ${issue}`);
        if (start || end) {
          if (start && end) parts.push(`pp. ${start}-${end}`);
          else if (start) parts.push(`pp. ${start}`);
        }
        if (year) parts.push(year);
        node.textContent = parts.length ? parts.join(', ') : '—';
        return;
      }

      // authors array - adjusted to simple text as requested
      if (field === 'author' || field === 'authors') {
        const val = item.author ?? item.authors ?? '—';
        node.textContent = val;
        return;
      }

      // DOI link special handling - hide if no DOI
      if (node.tagName === 'A' && field === 'doi_link') {
        const val = item.doi_link ?? item.doi ?? '';
        if (val && val.trim() !== '') {
          node.href = val;
          node.textContent = 'Open DOI';
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        } else {
          // Hide the DOI button completely
          node.style.display = 'none';
        }
        return;
      }

      // executive_summary / funding_section: markdown -> HTML, hide if empty
      if (field === 'executive_summary' || field === 'funding_section') {
        const md = item[field] ?? '';
        const html = markdownToHtml(md);
        if (!md || md.trim() === '') {
          // Hide the content paragraph
          node.style.display = 'none';
          // Hide the preceding h2 subtitle
          const prevH2 = node.previousElementSibling;
          if (prevH2 && prevH2.tagName === 'H2') {
            prevH2.style.display = 'none';
          }
        } else {
          node.innerHTML = html;
        }
        return;
      }

      // default: write text/plain
      const val = (item[field] !== undefined) ? item[field] : (item.attributes?.[field] ?? '');
      if (node.tagName === 'IMG') {
        if (val) node.src = val;
      } else {
        node.textContent = safeText(val ?? '—');
      }
    });
  }

  // start
  (async function init() {
    try {
      setStatus('Loading publication...');
      const id = qs('id');
      if (!id) {
        setStatus('No id provided in URL', true);
        return;
      }
      const item = await fetchById(id);
      if (!item) {
        setStatus('Publication not found', true);
        return;
      }
      populateFullPage(item);

      // Update dynamic SEO meta tags
      const seoTitle = item.title || 'Publication Details';
      const seoDescription = item.executive_summary
        ? item.executive_summary.substring(0, 160)
        : `${item.title || 'Research publication'} published in ${item.journal_name || 'academic journal'}. Authors: ${Array.isArray(item.author) ? item.author.map(a => a.person || a.name).join(', ').substring(0, 80) : 'N/A'}.`;
      if (typeof updateDynamicSEO === 'function') {
        updateDynamicSEO(seoTitle, seoDescription);
      }

      setStatus('Loaded');
    } catch (err) {
      console.error('publication full fetch error', err);
      setStatus('Error: ' + (err.message || err), true);
    }
  })();

})();
