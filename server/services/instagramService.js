/**
 * Instagram / Meta Graph API Entegrasyon Şablonu
 *
 * Resmi dokümantasyon:
 * https://developers.facebook.com/docs/instagram-api/
 * https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag-search
 *
 * Gerekli ortam değişkenleri (.env):
 *   INSTAGRAM_APP_ID
 *   INSTAGRAM_APP_SECRET
 *   INSTAGRAM_ACCESS_TOKEN
 */

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

async function instagramRequest(path, params = {}) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    throw new Error("Instagram: INSTAGRAM_ACCESS_TOKEN tanımlı değil.");
  }

  const url = new URL(`${GRAPH_API_BASE}${path}`);
  url.searchParams.set("access_token", token);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Instagram API hatası (${response.status}): ${body}`);
  }

  return response.json();
}

function mapInstagramMedia(item) {
  return {
    id: item.id,
    platform: "instagram",
    title: item.caption?.slice(0, 120) || "Instagram Reels",
    author: item.username || item.owner?.username || "unknown",
    thumbnail: item.thumbnail_url || item.media_url,
    views: item.play_count ?? item.video_view_count ?? item.like_count ?? 0,
    likes: item.like_count ?? 0,
    shares: item.share_count ?? Math.floor((item.like_count ?? 0) * 0.05),
    url: item.permalink || `https://www.instagram.com/p/${item.id}/`,
  };
}

/**
 * Hashtag ID'sini bulur, ardından top media listesini çeker.
 */
async function fetchInstagramVideosByHashtag(hashtag) {
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!igUserId) {
    throw new Error("Instagram: INSTAGRAM_BUSINESS_ACCOUNT_ID tanımlı değil.");
  }

  const hashtagSearch = await instagramRequest("/ig_hashtag_search", {
    user_id: igUserId,
    q: hashtag,
  });

  const hashtagId = hashtagSearch?.data?.[0]?.id;
  if (!hashtagId) {
    return [];
  }

  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,like_count,timestamp,username";

  const topMedia = await instagramRequest(`/${hashtagId}/top_media`, {
    user_id: igUserId,
    fields,
  });

  let items = (topMedia?.data || []).filter(
    (item) => item.media_type === "VIDEO" || item.media_type === "REELS"
  );

  if (items.length === 0) {
    const recentMedia = await instagramRequest(`/${hashtagId}/recent_media`, {
      user_id: igUserId,
      fields,
    });
    items = (recentMedia?.data || []).filter(
      (item) => item.media_type === "VIDEO" || item.media_type === "REELS"
    );
  }

  return items.map(mapInstagramMedia);
}

/**
 * Uzun ömürlü access token alma şablonu.
 */
async function exchangeInstagramToken(shortLivedToken) {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Instagram: APP_ID ve APP_SECRET gerekli.");
  }

  const url = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Instagram token değişimi başarısız.");
  }

  const { access_token } = await response.json();
  return access_token;
}

module.exports = {
  fetchInstagramVideosByHashtag,
  exchangeInstagramToken,
  mapInstagramMedia,
};
