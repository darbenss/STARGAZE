(function () {
  const BASE_URL = AppConfig.BASE_URL;
  const API_BASE = BASE_URL + '/api/statistics';
  const statusEl = document.getElementById('statistic-status');

  let grantsChartInstance = null;

  // --- FORMATTERS ---
  const formatNum = n => (typeof n === 'number' ? n.toLocaleString() : (n ?? '—'));
  const formatMoney = n => (typeof n === 'number' ? 'RM ' + n.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) : (n ?? '—'));
  const formatPct = n => (typeof n === 'number' ? (n * 100).toFixed(1) + '%' : (n ?? '—'));
  const formatNumber = n => (typeof n === 'number' ? (Number.isInteger(n) ? n.toString() : String(n)) : (n ?? '—'));

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

  const formattersMap = {
    grants: {
      totalPhd: formatNum,
      totalMaster: formatNum,
      totalPaper: formatNum,
      totalPatent: formatNum,
      totalGrants: formatNum,
      totalIndustryGrants: formatNum,
      totalInternalGrants: formatNum,
      totalNationalGrants: formatNum,
      industryPercentage: formatPct,
      internalPercentage: formatPct,
      nationalPercentage: formatPct,
      deliveryRate: formatPct,
      totalFunding: formatMoney,
    },
    publication: {
      totalPapers: formatNum,
      "classificationCounts.WWoS Q1": formatNum,
      "classificationCounts.WWoS Q2": formatNum,
      "classificationCounts.WWoS Q3": formatNum,
      "classificationCounts.WWoS Q4": formatNum,
      "classificationCounts.Conference Paper": formatNum,
      "classificationCounts.Scopus-indexed": formatNum,
      "classificationCounts.Non-indexed": formatNum,
      "classificationCounts.Patent Granted": formatNum,
      "classificationCounts.Patent Filed": formatNum,
    }
  };

  async function fetchData(mode) {
    const url = `${API_BASE}?mode=${encodeURIComponent(mode)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}${txt ? ' — ' + txt : ''}`);
    }
    const payload = await res.json();
    return payload?.data ?? payload;
  }

  function getNested(obj, path) {
    if (!obj) return undefined;
    return path.split('.').reduce((acc, k) => acc?.[k], obj);
  }

  // --- ANIMATION 1: Single Value ---
  function animateValue(node, targetValue, formatter, duration = 1000, delay = 0) {
    // If null, undefined, or ZERO, just show it immediately (No Animation)
    if (targetValue === null || targetValue === undefined || targetValue === 0) {
      node.textContent = formatter(targetValue);
      return;
    }

    // Start with a random number strictly below the target
    node.textContent = formatter(Math.floor(Math.random() * targetValue));

    setTimeout(() => {
        const startTime = performance.now();
        let lastUpdate = 0;
        const interval = 50; 
        const isInt = Number.isInteger(targetValue);

        function update(currentTime) {
          const elapsed = currentTime - startTime;

          if (elapsed < duration) {
            if (currentTime - lastUpdate > interval) {
                // Generate random value strictly BELOW the target value
                let randomVal = Math.random() * targetValue;
                
                if (isInt) randomVal = Math.floor(randomVal);

                node.textContent = formatter(randomVal);
                lastUpdate = currentTime;
            }
            requestAnimationFrame(update);
          } else {
            // Done: Snap to exact value
            node.textContent = formatter(targetValue);
          }
        }
        requestAnimationFrame(update);
    }, delay);
  }

  // --- ANIMATION 2: Complex String (e.g., "31 | 46 | 71") ---
  function animateComplexString(node, finalParts, duration = 1000, delay = 0) {
    
    // Check if there is anything to animate (if all are 0 or null, skip animation)
    const hasNonZero = finalParts.some(p => typeof p === 'number' && p > 0);
    
    // Helper to generate string layout
    const renderStatic = () => {
        const validParts = finalParts.map(v => v !== null ? formatNumber(v) : '—');
        return validParts.filter(v => v !== '—').length > 0 ? validParts.join(' | ') : '—';
    };

    if (!hasNonZero) {
        node.textContent = renderStatic();
        return;
    }

    // Helper to generate random string where each part is < its target
    const generateRandomString = () => {
        return finalParts.map(part => {
             if (part === null || part === undefined) return '—';
             if (part === 0) return formatNumber(0); // If part is 0, show 0, don't randomize
             
             // Random integer strictly below the part value
             const rnd = Math.floor(Math.random() * part); 
             return formatNumber(rnd);
        }).filter(v => v !== '—').join(' | ');
    };

    node.textContent = generateRandomString();

    setTimeout(() => {
        const startTime = performance.now();
        let lastUpdate = 0;
        const interval = 50;

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            if (elapsed < duration) {
                if (currentTime - lastUpdate > interval) {
                    node.textContent = generateRandomString();
                    lastUpdate = currentTime;
                }
                requestAnimationFrame(update);
            } else {
                node.textContent = renderStatic();
            }
        }
        requestAnimationFrame(update);
    }, delay);
  }

  // --- CHART FUNCTION ---
  function createGrantsChart(data) {
    const ctx = document.getElementById('myChart');
    if (!ctx) {
      console.warn('Chart canvas with id "myChart" not found.');
      return;
    }
    if (grantsChartInstance) {
      grantsChartInstance.destroy();
    }
    const xValues = ["National Grants", "Industry Grants", "Internal Grants"];
    const yValues = [
      safeNum(getNested(data, 'totalNationalGrants')),
      safeNum(getNested(data, 'totalIndustryGrants')),
      safeNum(getNested(data, 'totalInternalGrants'))
    ];
    const barColors = ["#00534a", "#00796B", "#00a592"];

    grantsChartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: xValues,
        datasets: [{ backgroundColor: barColors, data: yValues }]
      },
      options: {
        plugins: {
          legend: {
            display: true, position: 'right',
            labels: { color: '#222', font: { size: 14, family: 'Poppins, sans-serif' }, boxWidth: 20, usePointStyle: true }
          }
        }
      },
    });
  }

  function populateMode(mode, data) {
    const fieldFormatters = formattersMap[mode] || {};
    const nodes = document.querySelectorAll(`.stat-value[data-component="statistics"][data-mode="${mode}"]`);
    
    nodes.forEach(node => {
      const field = node.getAttribute('data-field');
      
      // --- DETERMINE DELAY (Waterfall effect for Grants only) ---
      let delay = 0;
      if (mode === 'grants') {
          // Top Level: Total Funding (0ms)
          if (field === 'totalFunding') delay = 0;
          // Middle Level: Rates, Papers, Patents (200ms)
          else if (['deliveryRate', 'totalPaper', 'totalPatent'].includes(field)) delay = 200;
          // Bottom Level: Students (400ms)
          else if (['totalMaster', 'totalPhd'].includes(field)) delay = 400;
      }
      
      // 1. Handle Complex Summaries (Q1-Q4, Patents)
      if (field === 'wwos_summary' || field === 'patent_summary') {
        let parts = [];
        if (field === 'wwos_summary') {
             parts = [
                safeNum(getNested(data, 'classificationCounts.WWoS Q1')),
                safeNum(getNested(data, 'classificationCounts.WWoS Q2')),
                safeNum(getNested(data, 'classificationCounts.WWoS Q3')),
                safeNum(getNested(data, 'classificationCounts.WWoS Q4'))
             ];
        } else {
             parts = [
                safeNum(getNested(data, 'classificationCounts.Patent Granted')),
                safeNum(getNested(data, 'classificationCounts.Patent Filed'))
             ];
        }
        // Animate for 1000ms
        animateComplexString(node, parts, 1000, delay);
        return;
      }

      // 2. Handle Total Funding
      if (field === 'totalFunding') {
        const valRaw = getNested(data, 'totalFunding');
        const val = safeNum(valRaw);
        animateValue(node, val, formatMoney, 1000, delay);
        return;
      }

      // 3. Default Handling
      const formatter = fieldFormatters[field] || (v => v ?? '—');
      const value = safeNum(getNested(data, field));
      
      if (value !== null) {
          animateValue(node, value, formatter, 1000, delay);
      } else {
          node.textContent = getNested(data, field) ?? '—';
      }
    });

    if (mode === 'grants') {
      createGrantsChart(data);
    }
  }

  async function fetchAndPopulateAll() {
    setStatus('Loading...');
    try {
      const allNodes = document.querySelectorAll('[data-component="statistics"][data-mode]');
      const modes = [...new Set(Array.from(allNodes).map(n => n.getAttribute('data-mode')))];
      for (const m of modes) {
        const data = await fetchData(m);
        populateMode(m, data);
      }
      setStatus('Last updated: ' + new Date().toLocaleString());
    } catch (err) {
      console.error('fetchAndPopulateAll error', err);
      setStatus('Error: ' + (err.message || err), true);
    }
  }

  fetchAndPopulateAll();

})();