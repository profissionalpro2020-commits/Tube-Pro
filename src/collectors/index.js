// Orquestra os coletores de cada plataforma.
// YouTube ja funciona de verdade. TikTok, Instagram e Facebook ficam como encaixes:
// quando voce tiver acesso (API oficial da sua conta ou servico externo), e so preencher.

import { collectYouTube } from "./youtube.js";

async function collectTikTok() {
  // TODO: integrar quando houver fonte (ex: TikTok Display API para sua conta,
  // ou servico tipo Apify/RapidAPI para canais publicos).
  return { videos: [], channelStats: [], pendente: "tiktok" };
}

async function collectInstagram() {
  // TODO: Instagram Graph API (conta business/creator sua) ou servico externo.
  return { videos: [], channelStats: [], pendente: "instagram" };
}

async function collectFacebook() {
  // TODO: Facebook Graph API (paginas que voce administra) ou servico externo.
  return { videos: [], channelStats: [], pendente: "facebook" };
}

export async function collectAll(config, env) {
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

  push(await collectTikTok());
  push(await collectInstagram());
  push(await collectFacebook());

  return todos;
}
