// Transforma a lista crua de videos em insights: rankings, temas, hashtags e sugestoes.

import { gerarInteligencia } from "./insights.js";

// Reconhece o canal de referencia (o Jef) pelo nome. Ele aparece com nomes diferentes
// em cada rede: "Jef Dicas Tech" (TikTok/YouTube) e "Jeferson de Oliveira" (Instagram).
function ehReferencia(nome = "") {
  return /jef|dicas tech|jeferson|oliveira tecnologia/i.test(nome);
}

const STOPWORDS = new Set([
  // PT
  "a","o","as","os","de","da","do","das","dos","e","em","um","uma","que","com","para","pra","por",
  "no","na","nos","nas","se","ao","dos","das","mais","meu","minha","seu","sua","isso","esse","essa",
  "voce","vc","eu","ele","ela","tem","vai","ja","so","mas","ou","como","foi","ser","vale","pena",
  // EN
  "the","a","an","of","to","in","on","for","and","or","is","are","my","your","this","that","with",
  "best","how","why","what","i","you","it","vs","top","new",
  // ruido
  "video","videos","canal","2024","2025","2026","parte","ep","live",
]);

function tokens(text = "") {
  return text
    .toLowerCase()
    .replace(/#[\p{L}\p{N}_]+/gu, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

function count(list) {
  const m = new Map();
  for (const x of list) m.set(x, (m.get(x) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function topBy(videos, key, n = 10) {
  return [...videos].sort((a, b) => (b[key] || 0) - (a[key] || 0)).slice(0, n);
}

function daysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

export function analyze({ videos, channelStats, sample }) {
  const byPlatform = {};
  for (const v of videos) {
    (byPlatform[v.platform] = byPlatform[v.platform] || []).push(v);
  }

  function blocoDeInsights(lista) {
    if (!lista.length) return null;
    const palavras = count(lista.flatMap((v) => tokens(v.title))).slice(0, 15);
    const hashtags = count(lista.flatMap((v) => v.hashtags || [])).slice(0, 15);
    const mediaEng = lista.reduce((s, v) => s + (v.engagementRate || 0), 0) / lista.length;
    return {
      totalVideos: lista.length,
      mediaEngajamento: mediaEng,
      topViews: topBy(lista, "views", 10),
      topEngajamento: topBy(
        lista.filter((v) => v.views > 1000),
        "engagementRate",
        10
      ),
      temasQuentes: palavras.map(([termo, n]) => ({ termo, n })),
      hashtags: hashtags.map(([tag, n]) => ({ tag, n })),
      novos: lista
        .filter((v) => daysSince(v.publishedAt) <= 2)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    };
  }

  // Sugestoes "da gringa": temas fortes la fora que ainda aparecem pouco no BR.
  const intl = videos.filter((v) => v.region === "intl");
  const br = videos.filter((v) => v.region === "br");
  const termosBR = new Set(count(br.flatMap((v) => tokens(v.title))).map(([t]) => t));
  const temasGringaParaTrazer = count(
    intl.filter((v) => v.engagementRate > 0).flatMap((v) => tokens(v.title))
  )
    .filter(([termo]) => !termosBR.has(termo))
    .slice(0, 12)
    .map(([termo, n]) => ({ termo, n }));

  return {
    geradoEm: new Date().toISOString(),
    sample: !!sample,
    inteligencia: gerarInteligencia(videos, ehReferencia),
    canais: channelStats,
    plataformas: Object.fromEntries(
      Object.entries(byPlatform).map(([p, lista]) => [p, blocoDeInsights(lista)])
    ),
    gringa: {
      topVideos: topBy(intl, "views", 10),
      temasParaTrazer: temasGringaParaTrazer,
    },
    resumo: {
      totalVideos: videos.length,
      totalCanais: channelStats.length,
      videosNovos48h: videos.filter((v) => daysSince(v.publishedAt) <= 2).length,
    },
  };
}
