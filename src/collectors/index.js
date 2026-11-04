// Orquestra os coletores de cada plataforma.
// YouTube ja funciona de verdade. TikTok, Instagram e Facebook ficam como encaixes:
// quando voce tiver acesso (API oficial da sua conta ou servico externo), e so preencher.

import { collectYouTube } from "./youtube.js";
import { collectEnsemble } from "./ensemble.js";

async function collectTikTok(canais, env, maxVideos) {
  if (!env.ENSEMBLE_TOKEN) return { videos: [], channelStats: [], pendente: "tiktok" };
  const r = await collectEnsemble("tiktok", canais, { token: env.ENSEMBLE_TOKEN, maxVideosPerChannel: maxVideos });
  return { ...r, pendente: r.videos.length ? undefined : "tiktok" };
}

async function collectInstagram(canais, env, maxPosts, skipDetailed) {
  if (!env.ENSEMBLE_TOKEN) return { videos: [], channelStats: [], pendente: "instagram" };
  const r = await collectEnsemble("instagram", canais, { token: env.ENSEMBLE_TOKEN, maxVideosPerChannel: maxPosts, skipDetailed });
  return { ...r, pendente: r.videos.length ? undefined : "instagram" };
}

async function collectFacebook() {
  // TODO: Facebook Graph API (paginas que voce administra) ou servico externo.
  return { videos: [], channelStats: [], pendente: "facebook" };
}

export async function collectAll(config, env, options = {}) {
  const porPlataforma = {};
  for (const ch of config.channels) {
    (porPlataforma[ch.platform] = porPlataforma[ch.platform] || []).push(ch);
  }

  const todos = { videos: [], channelStats: [], pendentes: [] };
  const push = (r) => {
    todos.videos.push(...(r.videos || []));
    todos.channelStats.push(...(r.channelStats || []));
    if (r.pendente && (porPlataforma[r.pendente] || []).some((c) => c.handle)) {
      todos.pendentes.push(r.pendente);
    }
  };

  if (porPlataforma.youtube?.length && env.YOUTUBE_API_KEY) {
    try {
      push(
        await collectYouTube(porPlataforma.youtube, {
          apiKey: env.YOUTUBE_API_KEY,
          maxVideosPerChannel: Number(env.MAX_VIDEOS_PER_CHANNEL || config.maxVideosPerChannel || 40),
        })
      );
    } catch (err) {
      console.warn(`[youtube] erro geral: ${err.message}`);
    }
  }

  // Redes sociais (TikTok/Instagram) so quando pedido, pra economizar a cota diaria do EnsembleData.
  const maxVideos = Number(env.MAX_VIDEOS_PER_CHANNEL || config.maxVideosPerChannel || 40);
  if (options.collectSocial) {
    // Instagram e caro (1 unidade por post): coleta poucos posts e sem o detailed-info.
    const igMax = Number(env.MAX_INSTAGRAM_POSTS || config.maxInstagramPosts || 12);
    const igSkipDetailed = config.ensembleSkipDetailed !== false;
    if (porPlataforma.tiktok?.length) push(await collectTikTok(porPlataforma.tiktok, env, maxVideos));
    if (porPlataforma.instagram?.length) push(await collectInstagram(porPlataforma.instagram, env, igMax, igSkipDetailed));
  }
  push(await collectFacebook());

  return todos;
}
