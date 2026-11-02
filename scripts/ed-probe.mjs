// Teste rapido do conector EnsembleData. Roda no GitHub Actions (que alcanca a API).
// Mostra os numeros normalizados do Jef no TikTok e Instagram + uma amostra crua,
// pra conferir se o mapeamento de campos esta certo antes de ligar de vez.
import { collectEnsemble } from "../src/collectors/ensemble.js";

const token = process.env.ENSEMBLE_TOKEN;
if (!token) { console.error("Sem ENSEMBLE_TOKEN"); process.exit(1); }

const tt = [{ platform: "tiktok", handle: "@jefdicastech", name: "Jef Dicas Tech", region: "br" }];
const ig = [{ platform: "instagram", handle: "jefdicastech", name: "Jef Dicas Tech", region: "br" }];

function resumo(nome, r) {
  console.log(`\n===== ${nome} =====`);
  console.log("channelStats:", JSON.stringify(r.channelStats));
  console.log("total videos:", r.videos.length);
  r.videos.slice(0, 3).forEach((v, i) =>
    console.log(`  [${i}] "${(v.title || "").slice(0, 50)}" | views=${v.views} likes=${v.likes} com=${v.comments} eng=${(v.engagementRate * 100).toFixed(1)}% | ${v.publishedAt} | ${v.url}`)
  );
}

// Amostra crua pra conferir nomes de campo caso algo venha zerado.
async function raw(path, params) {
  const u = new URL("https://ensembledata.com/apis" + path);
  for (const [k, val] of Object.entries(params)) u.searchParams.set(k, String(val));
  u.searchParams.set("token", token);
  const res = await fetch(u, { headers: { accept: "application/json" } });
  const j = await res.json().catch(() => null);
  return { status: res.status, j };
}

(async () => {
  const rtt = await collectEnsemble("tiktok", tt, { token, maxVideosPerChannel: 20 });
  resumo("TIKTOK", rtt);
  const rig = await collectEnsemble("instagram", ig, { token, maxVideosPerChannel: 20 });
  resumo("INSTAGRAM", rig);

  console.log("\n----- AMOSTRA CRUA (chaves) -----");
  const a = await raw("/tt/user/posts", { username: "jefdicastech", depth: 1 });
  const post0 = Array.isArray(a.j?.data) ? a.j.data[0] : null;
  console.log("tt/user/posts status", a.status, "| 1o post keys:", post0 ? Object.keys(post0).join(",").slice(0, 300) : "nenhum");
  if (post0?.statistics) console.log("tt statistics:", JSON.stringify(post0.statistics));
  const b = await raw("/tt/user/info", { username: "jefdicastech" });
  console.log("tt/user/info status", b.status, "| data.user keys:", b.j?.data?.user ? Object.keys(b.j.data.user).filter(k => /follow|count|nick|uniq|uid/i.test(k)).join(",") : "?");
})().catch((e) => { console.error("ERRO", e.message); process.exit(1); });
