const express = require("express");
const { searchVideos } = require("../services/searchService");

const router = express.Router();

router.get("/search", async (req, res, next) => {
  try {
    const hashtag = (req.query.hashtag || "").trim().replace(/^#+/, "");

    if (!hashtag) {
      return res.status(400).json({ message: "Hashtag gerekli." });
    }

    const result = await searchVideos(hashtag);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/health", (_req, res) => {
  const mockMode =
    process.env.USE_MOCK_DATA !== "false" || !process.env.YOUTUBE_API_KEY;

  res.json({
    status: "ok",
    mockMode,
    youtubeConfigured: Boolean(process.env.YOUTUBE_API_KEY),
  });
});

module.exports = router;
