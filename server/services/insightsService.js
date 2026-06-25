/**
 * AI Trend Analiz Servisi (Anthropic Claude API)
 *
 * Video listesini alır, Claude'a gönderir ve şunları üretir:
 *   - trendSummary: genel trend özeti (2-3 cümle)
 *   - topTopics: en popüler konu/temalar (etiket listesi)
 *   - topFormats: en çok izlenen video formatları (örn. "rehber", "inceleme")
 *   - contentIdeas: içerik üreticileri için video önerileri
 *
 * Gerekli ortam değişkeni (.env):
 *   ANTHROPIC_API_KEY
 *
 * Dokümantasyon: https://docs.claude.com/en/api/messages
 */

const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

function getApiKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY tanımlı değil. .env dosyanıza ekleyin."
    );
  }
  return key;
}

function buildPrompt(hashtag, videos) {
  // Claude'a gönderilecek video özetini hazırla (token tasarrufu için
  // sadece gerekli alanları, ilk 20 video ile sınırlı olarak gönderiyoruz).
  const compact = videos.slice(0, 20).map((v) => ({
    title: v.title,
    author: v.author,
    views: v.views,
    likes: v.likes,
    shares: v.shares,
  }));

  return `Aşağıda "${hashtag}" hashtag'i için YouTube'dan çekilmiş video verileri var (JSON formatında). Bu verileri analiz et ve SADECE aşağıdaki şemaya uyan bir JSON nesnesi döndür, başka hiçbir açıklama veya metin ekleme:

{
  "trendSummary": "Bu konudaki genel trendi özetleyen 2-3 cümlelik Türkçe bir analiz",
  "topTopics": ["en popüler konu/tema 1", "konu 2", "konu 3", "konu 4"],
  "topFormats": ["en çok izlenen format 1 (örn: rehber videosu, ürün incelemesi, vlog)", "format 2", "format 3"],
  "contentIdeas": ["içerik üreticisi için somut video önerisi 1", "öneri 2", "öneri 3"]
}

Video verileri:
${JSON.stringify(compact, null, 2)}`;
}

function extractJson(text) {
  // Claude bazen kod bloğu (```json ... ```) ile dönebilir, temizle.
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Video listesinden AI destekli trend analizi üretir.
 * Video yoksa ya da API anahtarı tanımlı değilse null döner
 * (insights opsiyonel bir özellik olduğu için ana arama akışını bozmaz).
 */
async function generateInsights(hashtag, videos) {
  if (!videos || videos.length === 0) {
    return null;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  const response = await fetch(ANTHROPIC_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: buildPrompt(hashtag, videos) }],
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      body.error?.message || `Anthropic API isteği başarısız (${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find((block) => block.type === "text");

  if (!textBlock) {
    throw new Error("Anthropic API'den metin yanıtı alınamadı.");
  }

  return extractJson(textBlock.text);
}

module.exports = { generateInsights };
