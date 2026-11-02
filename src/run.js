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

async function main() {
  await loadEnvFile();
  await mkdir(dataDir, { recursive: true });

  const config = JSON.parse(await readFile(join(root, "config", "channels.json"), "utf8"));
  const temKey = !!process.env.YOUTUBE_API_KEY;

  let coletado;
  if (temKey) {
    console.log("Coletando dados reais...");
    coletado = await collectAll(config, process.env);
    if (!coletado.videos.length) {
      console.warn("Nenhum video coletado (cheque os handles em config/channels.json). Usando exemplo.");
      coletado = collectSample();
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
