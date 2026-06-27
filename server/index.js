require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api", apiRoutes);

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error("[Server Error]", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Sunucu hatası",
  });
});

app.listen(PORT, () => {
  console.log(`İçerik Analiz sunucusu http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`Mock veri modu: ${process.env.USE_MOCK_DATA !== "false" ? "AÇIK" : "KAPALI"}`);
  console.log(`YouTube API: ${process.env.YOUTUBE_API_KEY ? "yapılandırıldı" : "anahtar yok (demo modu önerilir)"}`);
  console.log(`Anthropic API: ${process.env.ANTHROPIC_API_KEY ? "yapılandırıldı (AI Başlık Analizi aktif)" : "anahtar yok (AI Başlık Analizi pasif)"}`);
});