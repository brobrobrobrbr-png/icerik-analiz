/**
 * Grafik Modülü (Chart.js)
 *
 * Arama sonucundaki video listesinden iki grafik üretir:
 *   1. Video başına izlenme sayısı (bar chart)
 *   2. Video formatı dağılımı (doughnut chart) — başlıklardaki
 *      anahtar kelimelere göre basit kural tabanlı sınıflandırma,
 *      hiçbir API/AI kullanmaz.
 *
 * Bağımsız bir modüldür; window.renderCharts(videos) fonksiyonunu
 * dışa açar, app.js bunu çağırır.
 */

const FORMAT_RULES = [
  { label: "Rehber / ipuçları", color: "#ffb020", keywords: ["rehber", "ipucu", "ipuçları", "nasıl", "adım"] },
  { label: "İnceleme", color: "#ffc658", keywords: ["inceleme", "review", "karşılaştırma", "test"] },
  { label: "Vlog / günlük", color: "#3ddc97", keywords: ["vlog", "günlük", "rutin", "gün"] },
  { label: "Trend / viral", color: "#8b8f99", keywords: ["viral", "trend", "kaçırma", "herkes"] },
];
const OTHER_FORMAT = { label: "Diğer", color: "#3a3d47" };

let viewsChartInstance = null;
let formatChartInstance = null;

function classifyFormat(title) {
  const lower = (title || "").toLowerCase();
  for (const rule of FORMAT_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.label;
    }
  }
  return OTHER_FORMAT.label;
}

function buildFormatDistribution(videos) {
  const counts = new Map();
  videos.forEach((video) => {
    const label = classifyFormat(video.title);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  const total = videos.length || 1;
  const allLabels = [...FORMAT_RULES.map((r) => r.label), OTHER_FORMAT.label];
  const allColors = [...FORMAT_RULES.map((r) => r.color), OTHER_FORMAT.color];

  const entries = allLabels
    .map((label, i) => ({
      label,
      color: allColors[i],
      count: counts.get(label) || 0,
    }))
    .filter((entry) => entry.count > 0);

  return entries.map((entry) => ({
    ...entry,
    percent: Math.round((entry.count / total) * 100),
  }));
}

function formatCompactNumber(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function renderViewsChart(videos) {
  const canvas = document.getElementById("viewsChart");
  if (!canvas) return;

  const sorted = [...videos].sort((a, b) => b.views - a.views).slice(0, 15);
  const labels = sorted.map((_, i) => `V${i + 1}`);
  const data = sorted.map((v) => v.views);

  if (viewsChartInstance) {
    viewsChartInstance.destroy();
  }

  viewsChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: "#ffb020",
          borderRadius: 4,
          maxBarThickness: 28,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#5b5f6a", font: { size: 11 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#5b5f6a",
            font: { size: 11 },
            callback: (value) => formatCompactNumber(value),
          },
        },
      },
    },
  });
}

function renderFormatChart(videos) {
  const canvas = document.getElementById("formatChart");
  const legendEl = document.getElementById("formatLegend");
  if (!canvas || !legendEl) return;

  const distribution = buildFormatDistribution(videos);

  if (formatChartInstance) {
    formatChartInstance.destroy();
  }

  formatChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: distribution.map((d) => d.label),
      datasets: [
        {
          data: distribution.map((d) => d.count),
          backgroundColor: distribution.map((d) => d.color),
          borderColor: "#07080a",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      cutout: "65%",
    },
  });

  legendEl.replaceChildren();
  distribution.forEach((entry) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="chart-legend__swatch" style="background:${entry.color}"></span>
      ${entry.label} — %${entry.percent}
    `;
    legendEl.appendChild(li);
  });
}

function renderCharts(videos) {
  const panel = document.getElementById("chartsPanel");
  if (!panel) return;

  if (!videos || videos.length === 0) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  renderViewsChart(videos);
  renderFormatChart(videos);
}

window.renderCharts = renderCharts;
