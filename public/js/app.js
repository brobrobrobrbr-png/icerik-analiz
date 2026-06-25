const API_BASE = "/api";

const elements = {
  form: document.getElementById("searchForm"),
  input: document.getElementById("hashtagInput"),
  searchBtn: document.getElementById("searchBtn"),
  resultsSection: document.getElementById("resultsSection"),
  emptyState: document.getElementById("emptyState"),
  loadingState: document.getElementById("loadingState"),
  errorState: document.getElementById("errorState"),
  errorMessage: document.getElementById("errorMessage"),
  retryBtn: document.getElementById("retryBtn"),
  tableBody: document.getElementById("videoTableBody"),
  resultsHashtag: document.getElementById("resultsHashtag"),
  resultsMeta: document.getElementById("resultsMeta"),
  mockBadge: document.getElementById("mockBadge"),
  summaryStats: document.getElementById("summaryStats"),
  statVideos: document.getElementById("statVideos"),
  statViews: document.getElementById("statViews"),
};

let lastQuery = null;

function normalizeHashtag(value) {
  return value.trim().replace(/^#+/, "").replace(/\s+/g, "");
}

function formatNumber(num) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString("tr-TR");
}

function setView(state) {
  elements.emptyState.hidden = state !== "empty";
  elements.loadingState.hidden = state !== "loading";
  elements.errorState.hidden = state !== "error";
  elements.resultsSection.hidden = state !== "results";
}

function renderVideoRow(video) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>
      <a href="${escapeAttr(video.url)}" target="_blank" rel="noopener noreferrer">
        <img
          class="video-table__thumb"
          src="${escapeAttr(video.thumbnail)}"
          alt="${escapeHtml(video.title)} kapak görseli"
          loading="lazy"
          width="128"
          height="72"
        >
      </a>
    </td>
    <td>
      <a class="video-table__title-link" href="${escapeAttr(video.url)}" target="_blank" rel="noopener noreferrer">
        <div class="video-table__title">${escapeHtml(video.title)}</div>
      </a>
      <div class="video-table__author">${escapeHtml(video.author)}</div>
    </td>
    <td class="num"><span class="metric">${formatNumber(video.views)}</span></td>
    <td class="num"><span class="metric">${formatNumber(video.likes)}</span></td>
    <td class="num"><span class="metric">${formatNumber(video.shares)}</span></td>
  `;
  return row;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderResults(data) {
  elements.tableBody.replaceChildren();
  data.videos.forEach((video) => {
    elements.tableBody.appendChild(renderVideoRow(video));
  });

  elements.resultsHashtag.textContent = `#${data.hashtag}`;
  elements.resultsMeta.textContent = `${data.videos.length} YouTube videosu bulundu`;
  elements.mockBadge.hidden = !data.isMock;

  const totalViews = data.videos.reduce((sum, v) => sum + v.views, 0);
  elements.statVideos.textContent = data.videos.length;
  elements.statViews.textContent = formatNumber(totalViews);
  elements.summaryStats.hidden = false;

  setView("results");
}

async function searchHashtag(hashtag) {
  const params = new URLSearchParams({ hashtag });
  const response = await fetch(`${API_BASE}/search?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Arama sırasında bir hata oluştu.");
  }

  return response.json();
}

async function handleSearch(event) {
  event?.preventDefault();

  const hashtag = normalizeHashtag(elements.input.value);
  if (!hashtag) return;

  lastQuery = hashtag;
  elements.searchBtn.disabled = true;
  setView("loading");

  try {
    const data = await searchHashtag(hashtag);
    renderResults(data);
  } catch (err) {
    elements.errorMessage.textContent = err.message;
    setView("error");
  } finally {
    elements.searchBtn.disabled = false;
  }
}

elements.form.addEventListener("submit", handleSearch);
elements.retryBtn.addEventListener("click", () => {
  if (lastQuery) {
    elements.input.value = lastQuery;
  }
  handleSearch();
});
