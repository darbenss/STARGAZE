(function () {
  const BASE_URL = AppConfig.BASE_URL;
  const API_BASE = BASE_URL + '/api/statistics';
  const statusEl = document.getElementById('statistic-status');

  let grantsChartInstance = null; // <-- To store and destroy the chart on refresh

  const formatNum = n => (typeof n === 'number' ? n.toLocaleString() : (n ?? '—'));
  const formatMoney = n => (typeof n === 'number' ? 'RM ' + n.toLocaleString() : (n ?? '—'));
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
    // payload may be { data: { ... } } or { data: ... } or the object itself
    return payload?.data ?? payload;
  }

  // Helper to safely read nested fields (supports dot-notation)
  function getNested(obj, path) {
    if (!obj) return undefined;
    return path.split('.').reduce((acc, k) => acc?.[k], obj);
  }

  // --- NEW FUNCTION TO CREATE THE PIE CHART ---
  function createGrantsChart(data) {
    const ctx = document.getElementById('myChart');
    if (!ctx) {
      // Don't log an error, maybe the chart isn't on every page
      console.warn('Chart canvas with id "myChart" not found.');
      return;
    }

    // If a chart already exists on this canvas, destroy it
    if (grantsChartInstance) {
      grantsChartInstance.destroy();
    }

    // Get dynamic data from the API response
    // ** We match the xValues to the corresponding data fields **
    const xValues = ["National Grants", "Industry Grants", "Internal Grants"];
    const yValues = [
      safeNum(getNested(data, 'totalNationalGrants')),
      safeNum(getNested(data, 'totalIndustryGrants')),
      safeNum(getNested(data, 'totalInternalGrants'))
    ];
    const barColors = [
      "#00534a",
      "#00796B",
      "#00a592",
    ];

    // Create the new chart and store the instance
    grantsChartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: xValues,
        datasets: [{
          backgroundColor: barColors,
          data: yValues
        }]
      },
      options: {
        plugins: {
          legend: {
            display: true,          // show legend
            position: 'right',      // 'top', 'bottom', 'left', or 'right'
            labels: {
              color: '#222',       // text color
              font: {
                size: 14,         // font size
                family: 'Poppins, sans-serif',
                weight: 'normal',   // font weight
              },
              boxWidth: 20,         // size of color box
              boxHeight: 20,        // height of color box
              padding: 15,          // space between legend items
              usePointStyle: true,  // use circle instead of box
            }
          }
        }
      },
    });
  }
  // --- END OF NEW FUNCTION ---

  function populateMode(mode, data) {
    const fieldFormatters = formattersMap[mode] || {};
    const nodes = document.querySelectorAll(`.stat-value[data-component="statistics"][data-mode="${mode}"]`);
    nodes.forEach(node => {
      const field = node.getAttribute('data-field');

      // Special combined fields handled here
      if (field === 'wwos_summary') {
        const q1Raw = getNested(data, 'classificationCounts.WWoS Q1');
        const q2Raw = getNested(data, 'classificationCounts.WWoS Q2');
        const q3Raw = getNested(data, 'classificationCounts.WWoS Q3');
        const q4Raw = getNested(data, 'classificationCounts.WWoS Q4');
        const q1 = safeNum(q1Raw);
        const q2 = safeNum(q2Raw);
        const q3 = safeNum(q3Raw);
        const q4 = safeNum(q4Raw);
        const f1 = q1 !== null ? formatNumber(q1) : (q1Raw ?? '—');
        const f2 = q2 !== null ? formatNumber(q2) : (q2Raw ?? '—');
        const f3 = q3 !== null ? formatNumber(q3) : (q3Raw ?? '—');
        const f4 = q4 !== null ? formatNumber(q4) : (q4Raw ?? '—');
        const combo = [f1, f2, f3, f4].filter(v => v && v !== '—').join(' | ');
        node.textContent = combo || '—';
        return;
      }

      if (field === 'patent_summary') {
        const grantedRaw = getNested(data, 'classificationCounts.Patent Granted');
        const filedRaw = getNested(data, 'classificationCounts.Patent Filed');
        const granted = safeNum(grantedRaw);
        const filed = safeNum(filedRaw);
        const fg = granted !== null ? formatNumber(granted) : (grantedRaw ?? '—');
        const ff = filed !== null ? formatNumber(filed) : (filedRaw ?? '—');
        const combo = [fg, ff].filter(v => v && v !== '—').join(' | ');
        node.textContent = combo || '—';
        return;
      }

      if (field === 'totalFunding') {
        const totalFundingRaw = getNested(data, 'totalFunding');
        const totalFunding = safeNum(totalFundingRaw);
        const formatted = totalFunding !== null ? formatMoney(totalFunding) : (totalFundingRaw ?? '—');
        node.textContent = formatted || '—';
        return;
      }

      // Default handling: support nested keys like "classificationCounts.WWoS Q1"
      const formatter = fieldFormatters[field] || (v => v ?? '—');
      const value = getNested(data, field);
      try {
        node.textContent = formatter(value);
      } catch (e) {
        node.textContent = value ?? '—';
      }
    });

    // --- ADDED THIS CALL ---
    // After populating all fields, create the chart if the mode is 'grants'
    if (mode === 'grants') {
      createGrantsChart(data);
    }
  }

  async function fetchAndPopulateAll() {
    setStatus('Loading...');
    try {
      // find all distinct modes in the DOM
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

  // Initial load
  fetchAndPopulateAll();

})();