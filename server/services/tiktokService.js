/**
 * TikTok API Entegrasyon Şablonu
 *
 * Resmi TikTok API dokümantasyonu:
 * https://developers.tiktok.com/doc/research-api-specs-query-videos/
 *
 * Gerekli ortam değişkenleri (.env):
 *   TIKTOK_CLIENT_KEY
 *   TIKTOK_CLIENT_SECRET
 *   TIKTOK_ACCESS_TOKEN
 */

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

async function tiktokRequest(endpoint, options = {}) {
  const token = process.env.TIKTOK_ACCESS_TOKEN;

  if (!token) {
    throw new Error("TikTok: TIKTOK_ACCESS_TOKEN tanımlı değil.");
  }

  const response = await fetch(`${TIKTOK_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TikTok API hatası (${response.status}): ${body}`);
  }

  return response.json();
}

function mapTikTokVideo(item) {
  return {
    id: item.id,
    platform: "tiktok",
    title: item.title || item.video_description || "Başlıksız video",
    author: item.username || item.author?.unique_id || "unknown",
    thumbnail: item.cover_image_url || item.thumbnail_url,
    views: item.view_count ?? 0,
    likes: item.like_count ?? 0,
    shares: item.share_count ?? 0,
    url: item.share_url || `https://www.tiktok.com/@${item.username}`,
  };
}

/**
 * Hashtag'e göre TikTok videolarını getirir.
 * Research API veya Display API endpoint'ine göre uyarlayın.
 */
async function fetchTikTokVideosByHashtag(hashtag) {
  const data = await tiktokRequest("/research/video/query/", {
    method: "POST",
    body: JSON.stringify({
      query: {
        and: [{ operation: "EQ", field_name: "hashtag_name", field_values: [hashtag] }],
      },
      max_count: 20,
    }),
  });

  const items = data?.data?.videos || data?.data?.items || [];
  return items.map(mapTikTokVideo);
}

/**
 * OAuth token yenileme şablonu (client credentials).
 */
async function refreshTikTokToken() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error("TikTok: CLIENT_KEY ve CLIENT_SECRET gerekli.");
  }

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error("TikTok token yenileme başarısız.");
  }

  const { access_token } = await response.json();
  return access_token;
}

module.exports = {
  fetchTikTokVideosByHashtag,
  refreshTikTokToken,
  mapTikTokVideo,
};
