const { fetchYouTubeVideosByHashtag } = require("./youtubeService");
const { generateMockVideos } = require("./mockDataService");

const USE_MOCK = process.env.USE_MOCK_DATA !== "false";
const HAS_YOUTUBE_KEY = Boolean(process.env.YOUTUBE_API_KEY);

async function searchVideos(hashtag) {
  if (USE_MOCK || !HAS_YOUTUBE_KEY) {
    return {
      hashtag,
      isMock: true,
      videos: generateMockVideos(hashtag),
    };
  }

  const videos = await fetchYouTubeVideosByHashtag(hashtag);

  return {
    hashtag,
    isMock: false,
    videos,
  };
}

module.exports = { searchVideos };
