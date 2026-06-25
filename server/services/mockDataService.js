const TITLES = [
  "{tag} ile ilgili en iyi ipuçları",
  "Bu {tag} trendini kaçırma!",
  "{tag} rehberi — adım adım",
  "3 dakikada {tag} anlatımı",
  "{tag} hakkında bilmen gerekenler",
  "Viral {tag} içeriği",
  "{tag} ile kanal büyütme stratejisi",
  "Herkesin izlediği {tag} videosu",
];

const AUTHORS = [
  "TechReview TR",
  "İçerikLab",
  "CreatorHub",
  "ViralTips",
  "MedyaAjans",
  "SocialPro",
  "TrendWatch",
  "VideoMaster",
];

function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function pick(arr, rand) {
  return arr[Math.floor(rand() * arr.length)];
}

function generateMockVideos(hashtag) {
  const rand = seededRandom(hashtag.toLowerCase());
  const count = 8 + Math.floor(rand() * 5);
  const videos = [];

  for (let i = 0; i < count; i++) {
    const titleTemplate = pick(TITLES, rand);
    const title = titleTemplate.replace(/\{tag\}/g, `#${hashtag}`);

    videos.push({
      id: `youtube-${hashtag}-${i}`,
      platform: "youtube",
      title,
      author: pick(AUTHORS, rand),
      thumbnail: `https://picsum.photos/seed/${hashtag}-yt-${i}/144/192`,
      views: Math.floor(rand() * 5_000_000) + 15_000,
      likes: Math.floor(rand() * 250_000) + 800,
      shares: Math.floor(rand() * 30_000) + 100,
      url: `https://www.youtube.com/results?search_query=%23${encodeURIComponent(hashtag)}`,
    });
  }

  return videos.sort((a, b) => b.views - a.views);
}

module.exports = { generateMockVideos };
