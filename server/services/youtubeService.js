/**
 * YouTube Data API v3 entegrasyon şablonu
 *
 * Kurulum:
 * 1. https://console.cloud.google.com/ → Yeni proje oluştur
 * 2. "YouTube Data API v3" etkinleştir
 * 3. Kimlik bilgileri → API anahtarı oluştur
 * 4. .env dosyasına YOUTUBE_API_KEY=... ekle
 * 5. USE_MOCK_DATA=false yap
 *
 * Dokümantasyon: https://developers.google.com/youtube/v3/docs
 */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey() {
  const key = process.env.YOUTUBE_API_KEY;AIzaSyCtUaLWY00W8TS_jl3lC-kevnbIqmNXs3Y
  if (!key) {
    throw new Error(
      "YOUTUBE_API_KEY tanımlı değil. .env.example dosyasındaki adımları izleyin."
    );
  }
  return key;
}

async function youtubeFetch(endpoint, params) {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  url.searchParams.set("key", getApiKey());

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      body.error?.message || `YouTube API isteği başarısız (${response.status})`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Hashtag ile YouTube videolarını arar ve istatistikleri birleştirir.
 *
 * Akış:
 * 1. search.list → hashtag ile video ID'leri
 * 2. videos.list → izlenme, beğeni ve yorum sayıları
 *
 * Not: YouTube Data API paylaşım (share) sayısı sağlamaz;
 * bu alan yorum sayısından türetilmiş tahmini etkileşim olarak kullanılır.
 */
async function fetchYouTubeVideosByHashtag(hashtag) {
  const query = hashtag.startsWith("#") ? hashtag : `#${hashtag}`;

  const searchData = await youtubeFetch("search", {
    part: "snippet",
    q: query,
    type: "video",
    maxResults: 25,
    order: "viewCount",
    relevanceLanguage: "tr",
  });

  const searchItems = searchData.items || [];
  if (searchItems.length === 0) {
    return [];
  }

  const videoIds = searchItems
    .map((item) => item.id?.videoId)
    .filter(Boolean)
    .join(",");

  const videoData = await youtubeFetch("videos", {
    part: "statistics,snippet",
    id: videoIds,
  });

  const detailsById = Object.fromEntries(
    (videoData.items || []).map((item) => [item.id, item])
  );

  return searchItems
    .map((item) => {
      const videoId = item.id?.videoId;
      if (!videoId) return null;

      const details = detailsById[videoId];
      const snippet = details?.snippet || item.snippet;
      const stats = details?.statistics || {};

      const views = parseInt(stats.viewCount || "0", 10);
      const likes = parseInt(stats.likeCount || "0", 10);
      const comments = parseInt(stats.commentCount || "0", 10);

      return {
        id: videoId,
        platform: "youtube",
        title: snippet.title,
        author: snippet.channelTitle,
        thumbnail:
          snippet.thumbnails?.medium?.url ||
          snippet.thumbnails?.default?.url ||
          "",
        views,
        likes,
        shares: comments,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.views - a.views);
}

module.exports = { fetchYouTubeVideosByHashtag };
