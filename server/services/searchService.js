const { fetchYouTubeVideosByHashtag } = require("./youtubeService");
const { generateMockVideos } = require("./mockDataService");
const { generateInsights } = require("./insightsService");

const USE_MOCK = process.env.USE_MOCK_DATA !== "false";
const HAS_YOUTUBE_KEY = Boolean(process.env.YOUTUBE_API_KEY);

// AI analizi opsiyoneldir: başarısız olursa arama sonucunu etkilememeli.
async function safeGenerateInsights(hashtag, videos) {
  try {
    return await generateInsights(hashtag, videos);
  } catch (err) {
    console.error("[Insights Error]", err.message);
    return null;
  }
}

async function searchVideos(hashtag) {
  if (USE_MOCK || !HAS_YOUTUBE_KEY) {
    const videos = generateMockVideos(hashtag);
    return {
      hashtag,
      isMock: true,
      videos,
      insights: await safeGenerateInsights(hashtag, videos),
    };
  }

  const videos = await fetchYouTubeVideosByHashtag(hashtag);

  return {
    hashtag,
    isMock: false,
    videos,
    insights: await safeGenerateInsights(hashtag, videos),
  };
}

module.exports = { searchVideos };
