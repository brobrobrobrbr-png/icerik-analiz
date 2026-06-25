require("dotenv").config();
const { fetchInstagramVideosByHashtag } = require("../services/instagramService");

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

function check(name, value) {
  if (!value || !String(value).trim()) {
    console.error(`  ✗ ${name} eksik`);
    return false;
  }
  console.log(`  ✓ ${name} tanımlı`);
  return true;
}

async function graphGet(path, params = {}) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  url.searchParams.set("access_token", token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url);
  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.error?.message || JSON.stringify(body));
  }

  return body;
}

async function main() {
  console.log("\nInstagram API bağlantı testi\n");

  const ok =
    check("INSTAGRAM_ACCESS_TOKEN", process.env.INSTAGRAM_ACCESS_TOKEN) &
    check("INSTAGRAM_BUSINESS_ACCOUNT_ID", process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID);

  if (!ok) {
    console.log("\n.env dosyanızı doldurun (.env.example referans alın).\n");
    process.exit(1);
  }

  try {
    const account = await graphGet(`/${process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID}`, {
      fields: "username,name,followers_count,media_count",
    });
    console.log(`\n  Hesap: @${account.username} (${account.name || "—"})`);
    console.log(`  Takipçi: ${account.followers_count ?? "—"} · Gönderi: ${account.media_count ?? "—"}`);

    const testHashtag = process.argv[2] || "fitness";
    console.log(`\n  Hashtag testi: #${testHashtag}`);

    const videos = await fetchInstagramVideosByHashtag(testHashtag);
    console.log(`  Bulunan video/reels: ${videos.length}`);

    if (videos.length > 0) {
      const sample = videos[0];
      console.log(`  Örnek: "${sample.title.slice(0, 60)}..." — ${sample.likes} beğeni`);
    } else {
      console.log("  Uyarı: Sonuç yok. Hashtag popüler olmayabilir veya API limitine takılmış olabilirsiniz.");
    }

    console.log("\n  Bağlantı başarılı. .env içinde USE_MOCK_DATA=false yapıp sunucuyu yeniden başlatın.\n");
  } catch (err) {
    console.error(`\n  Hata: ${err.message}\n`);
    console.log("  Sık nedenler:");
    console.log("  - Token süresi dolmuş → yeni long-lived token alın");
    console.log("  - Eksik izinler → instagram_basic, pages_read_engagement");
    console.log("  - Business Account ID yanlış → Page ID değil, IG Business ID olmalı\n");
    process.exit(1);
  }
}

main();
