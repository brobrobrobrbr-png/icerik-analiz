/**
 * AI Başlık Analizi Servisi (Anthropic Claude API)
 *
 * Her video başlığını analiz eder ve şunları üretir:
 *   - overallScore: Genel Başlık Puanı (0-100)
 *   - seoScore: SEO Puanı (0-100)
 *   - curiosityScore: Merak Uyandırma Puanı (0-100)
 *   - emotionalScore: Duygusal Etki Puanı (0-100)
 *   - readabilityScore: Okunabilirlik (0-100)
 *   - ctrProbability: Tıklanma Olasılığı (%)
 *   - strengths: Başlığın güçlü yönleri (liste)
 *   - weaknesses: Başlığın zayıf yönleri (liste)
 *   - suggestions: Daha iyi başlık önerileri (liste)
 *
 * Gerekli ortam değişkeni (.env):
 *   ANTHROPIC_API_KEY
 *
 * Tasarım notu: İstekler paralel gönderilir ama küçük gruplar
 * halinde (BATCH_SIZE) sınırlanır — rate limit'e çarpmamak için.
 * Bir başlığın analizi başarısız olursa null döner, tüm arama
 * akışını bozmaz (searchService bunu tolere eder).
 *
 * Dokümantasyon: https://docs.claude.com/en/api/messages
 */

const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const BATCH_SIZE = 5;

const ANALYSIS_SCHEMA_PROMPT = `Bir YouTube video başlığını analiz ediyorsun. Aşağıdaki başlığı incele ve SADECE aşağıdaki şemaya uyan bir JSON nesnesi döndür, başka hiçbir açıklama veya metin ekleme:

{
  "overallScore": 0-100 arası tam sayı (genel başlık kalitesi),
  "seoScore": 0-100 arası tam sayı (anahtar kelime kullanımı, aranabilirlik),
  "curiosityScore": 0-100 arası tam sayı (merak uyandırma, bilgi boşluğu yaratma),
  "emotionalScore": 0-100 arası tam sayı (duygusal çekicilik),
  "readabilityScore": 0-100 arası tam sayı (anlaşılırlık, sadelik),
  "ctrProbability": 0-100 arası tam sayı (tahmini tıklanma olasılığı yüzdesi),
  "strengths": ["güçlü yön 1", "güçlü yön 2"],
  "weaknesses": ["zayıf yön 1", "zayıf yön 2"],
  "suggestions": ["alternatif başlık önerisi 1", "alternatif başlık önerisi 2"]
}

Başlık: "{TITLE}"`;

function getApiKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY tanımlı değil.");
  }
  return key;
}

function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

function clampScore(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeAnalysis(raw) {
  return {
    overallScore: clampScore(raw.overallScore),
    seoScore: clampScore(raw.seoScore),
    curiosityScore: clampScore(raw.curiosityScore),
    emotionalScore: clampScore(raw.emotionalScore),
    readabilityScore: clampScore(raw.readabilityScore),
    ctrProbability: clampScore(raw.ctrProbability),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.slice(0, 5) : [],
    weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses.slice(0, 5) : [],
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.slice(0, 5) : [],
  };
}

/**
 * Tek bir başlığı analiz eder. Hata durumunda null döner
 * (üst seviye akışı bozmamak için exception fırlatmaz).
 */
async function analyzeTitle(title) {
  try {
    const prompt = ANALYSIS_SCHEMA_PROMPT.replace("{TITLE}", title);

    const response = await fetch(ANTHROPIC_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getApiKey(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        body.error?.message || `Anthropic API isteği başarısız (${response.status})`;
      console.error(
        `[Title Analysis] HTTP ${response.status} - "${title.slice(0, 40)}..." - ${message}`
      );
      throw new Error(message);
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((block) => block.type === "text");
    if (!textBlock) return null;

    const parsed = extractJson(textBlock.text);
    return normalizeAnalysis(parsed);
  } catch (err) {
    console.error("[Title Analysis Error]", title, "-", err.message);
    return null;
  }
}

/**
 * Birden fazla başlığı, küçük gruplar halinde paralel analiz eder.
 * @param {string[]} titles
 * @returns {Promise<(object|null)[]>} - titles ile aynı sırada, her biri analiz veya null
 */
async function analyzeTitles(titles) {
  const results = [];

  for (let i = 0; i < titles.length; i += BATCH_SIZE) {
    const batch = titles.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((title) => analyzeTitle(title)));
    results.push(...batchResults);
  }

  return results;
}

module.exports = { analyzeTitle, analyzeTitles };