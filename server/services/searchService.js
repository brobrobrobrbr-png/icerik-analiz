const { fetchYouTubeVideosByHashtag } = require("./youtubeService");
const { generateMockVideos } = require("./mockDataService");
const { analyzeTitles } = require("./titleAnalysisService");

const USE_MOCK = process.env.USE_MOCK_DATA !== "false";
const HAS_YOUTUBE_KEY = Boolean(process.env.YOUTUBE_API_KEY);
const HAS_ANTHROPIC_KEY = Boolean(process.env.ANTHROPIC_API_KEY);

// AI başlık analizi opsiyoneldir: key yoksa veya hata olursa
// videoları olduğu gibi (titleAnalysis: null) döndürür, arama
// sonucunu hiçbir şekilde bozmaz.
async function attachTitleAnalysis(videos) {
  if (!HAS_ANTHROPIC_KEY || videos.length === 0) {
    return videos.map((video) => ({ ...video, titleAnalysis: null }));
  }

  try {
    const analyses = await analyzeTitles(videos.map((v) => v.title));
    return videos.map((video, i) => ({
      ...video,
      titleAnalysis: analyses[i] || null,
    }));
  } catch (err) {
    console.error("[Search Title Analysis Error]", err.message);
    return videos.map((video) => ({ ...video, titleAnalysis: null }));
  }
}

async function searchVideos(hashtag) {
  if (USE_MOCK || !HAS_YOUTUBE_KEY) {
    const videos = await attachTitleAnalysis(generateMockVideos(hashtag));
    return {
      hashtag,
      isMock: true,
      videos,
    };
  }

  const videos = await attachTitleAnalysis(await fetchYouTubeVideosByHashtag(hashtag));

  return {
    hashtag,
    isMock: false,
    videos,
  };
}

module.exports = { searchVideos };