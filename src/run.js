// Entrypoint: coleta -> analisa -> grava os dados que o dashboard le.
// Roda com: npm run scan
// Sem YOUTUBE_API_KEY, usa dados de exemplo para voce ver o app funcionando.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectAll } from "./collectors/index.js";
import { collectSample } from "./collectors/sample.js";
import { analyze } from "./analyze.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dataDir = join(root, "public", "data");

async function loadEnvFile() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  const txt = await readFile(envPath, "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// Guarda o ultimo dado de TikTok/Instagram num cache e reusa entre as coletas do dia,
// pra o dashboard nao ficar sem as redes sociais nas horas em que nao coletamos.
async function aplicarCacheSocial(coletado, { collectSocial, cachePath, temCache }) {
  const ehSocial = (v) => v.platform === "tiktok" || v.platform === "instagram";
  const socialFresh = coletado.videos.filter(ehSocial);

  if (collectSocial && socialFresh.length) {
    const statsFresh = coletado.channelStats.filter(ehSocial);
    await writeFile(
      cachePath,
      JSON.stringify({ geradoEm: new Date().toISOString(), videos: socialFresh, channelStats: statsFresh }, null, 2)
    );
  } else {
    // Nao coletou agora (ou veio vazio): tira o social e puxa do cache, se houver.
    coletado.videos = coletado.videos.filter((v) => !ehSocial(v));
    coletado.channelStats = coletado.channelStats.filter((v) => !ehSocial(v));
    if (temCache) {
      try {
        const cache = JSON.parse(await readFile(cachePath, "utf8"));
        coletado.videos.push(...(cache.videos || []));
        coletado.channelStats.push(...(cache.channelStats || []));
      } catch {}
    }
  }
  // Nao marca como pendente a rede que ja tem dado (fresco ou do cache).
  coletado.pendentes = (coletado.pendentes || []).filter((p) => !coletado.videos.some((v) => v.platform === p));
  return coletado;
}

async function main() {
  await loadEnvFile();
  await mkdir(dataDir, { recursive: true });

  const config = JSON.parse(await readFile(join(root, "config", "channels.json"), "utf8"));
  const temKey = !!process.env.YOUTUBE_API_KEY;

  let coletado;
  if (temKey) {
    // YouTube roda sempre. TikTok/Instagram so uma vez por dia (hora UTC configuravel),
    // pra caber na cota gratis do EnsembleData. Entre as coletas, usa o cache salvo.
    const hora = new Date().getUTCHours();
    const horaSocial = Number(process.env.SOCIAL_HOUR_UTC || 23); // 23 UTC = 20:00 no horario de Brasilia
    const cachePath = join(dataDir, "social-cache.json");
    const temCache = existsSync(cachePath);
    const collectSocial = !!process.env.ENSEMBLE_TOKEN && (hora === horaSocial || !temCache);

    console.log(
      collectSocial
        ? "Coletando dados reais (YouTube + redes sociais)..."
        : "Coletando dados reais (YouTube; redes sociais vem do cache)..."
    );
    coletado = await collectAll(config, process.env, { collectSocial });

    if (!coletado.videos.length) {
      console.warn("Nenhum video coletado (cheque os handles em config/channels.json). Usando exemplo.");
      coletado = collectSample();
    } else {
      coletado = await aplicarCacheSocial(coletado, { collectSocial, cachePath, temCache });
    }
  } else {
    console.log("Sem YOUTUBE_API_KEY: gerando dados de exemplo.");
    coletado = collectSample();
  }

  const insights = analyze(coletado);
  insights.pendentes = coletado.pendentes || [];

  await writeFile(join(dataDir, "snapshot.json"), JSON.stringify(insights, null, 2));

  // Histgrico leve para ver a evolucao ao longo do tempo.
  const histPath = join(dataDir, "history.json");
  let history = [];
  if (existsSync(histPath)) {
    try {
      history = JSON.parse(await readFile(histPath, "utf8"));
    } catch {}
  }
  history.push({
    data: insights.geradoEm,
    totalVideos: insights.resumo.totalVideos,
    videosNovos48h: insights.resumo.videosNovos48h,
    sample: insights.sample,
  });
  history = history.slice(-500);
  await writeFile(histPath, JSON.stringify(history, null, 2));

  console.log(
    `Pronto. ${insights.resumo.totalVideos} videos de ${insights.resumo.totalCanais} canais.` +
      (insights.sample ? " (dados de exemplo)" : "")
  );
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
