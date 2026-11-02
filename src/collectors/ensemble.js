// Conector EnsembleData: traz dados PUBLICOS de TikTok e Instagram para dentro do radar.
// Liga sozinho quando existir a variavel ENSEMBLE_TOKEN (igual a YOUTUBE_API_KEY).
// Doc: https://ensembledata.com/apis/docs  | moeda da API: "units" (consome cota).

const BASE = "https://ensembledata.com/apis";

async function edGet(path, params, token) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  url.searchParams.set("token", token);
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`EnsembleData ${path} HTTP ${res.status}: ${txt.slice(0, 160)}`);
  }
  return res.json();
}

// Pega o primeiro valor que existir entre varios caminhos possiveis (a API devolve estrutura nativa).
function pick(obj, paths, fallback = undefined) {
  for (const p of paths) {
    let cur = obj;
    let ok = true;
    for (const key of p.split(".")) {
      if (cur && typeof cur === "object" && key in cur) cur = cur[key];
      else { ok = false; break; }
    }
    if (ok && cur !== undefined && cur !== null) return cur;
  }
  return fallback;
}

function hashtagsDe(texto = "") {
  return (texto.match(/#[\p{L}\p{N}_]+/gu) || []).map((h) => h.toLowerCase());
}

const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
const handleLimpo = (h = "") => h.replace(/^@/, "").trim();

// ---------- TikTok ----------
async function coletarTikTok(canal, token, depth) {
  const username = handleLimpo(canal.handle || canal.name);
  if (!username) return { videos: [], channelStats: [] };

  const info = await edGet("/tt/user/info", { username }, token).catch(() => null);
  const user = pick(info || {}, ["data.user", "data"], {});
  const seguidores = num(pick(user, ["follower_count", "followerCount"]) ?? pick(info || {}, ["data.stats.follower_count"]));
  const nome = pick(user, ["nickname", "unique_id"], canal.name);

  const resp = await edGet("/tt/user/posts", { username, depth }, token);
  const posts = Array.isArray(resp?.data) ? resp.data : pick(resp, ["data.aweme_list", "data.posts"], []);

  const videos = posts.map((p) => {
    const st = p.statistics || p.stats || {};
    const views = num(st.play_count ?? st.playCount);
    const likes = num(st.digg_count ?? st.diggCount);
    const comments = num(st.comment_count ?? st.commentCount);
    const shares = num(st.share_count ?? st.shareCount);
    const desc = pick(p, ["desc", "title"], "");
    const id = pick(p, ["aweme_id", "id", "video_id"], "");
    const createTime = num(pick(p, ["create_time", "createTime"]));
    const eng = views > 0 ? (likes + comments + shares) / views : 0;
    return {
      platform: "tiktok",
      region: canal.region || "br",
      channelId: pick(user, ["uid", "id"], username),
      channelTitle: nome,
      videoId: String(id),
      title: desc,
      publishedAt: createTime ? new Date(createTime * 1000).toISOString() : null,
      url: pick(p, ["share_url"], id ? `https://www.tiktok.com/@${username}/video/${id}` : canal.url || ""),
      thumbnail: pick(p, ["video.cover.url_list.0", "video.origin_cover.url_list.0"], ""),
      views,
      likes,
      comments,
      engagementRate: eng,
      hashtags: hashtagsDe(desc),
      tags: (p.text_extra || []).map((t) => t.hashtag_name).filter(Boolean),
    };
  });

  const channelStats = [{
    platform: "tiktok",
    region: canal.region || "br",
    channelId: pick(user, ["uid", "id"], username),
    channelTitle: nome,
    subscribers: seguidores,
    videosColetados: videos.length,
  }];
  return { videos, channelStats };
}

// ---------- Instagram ----------
async function coletarInstagram(canal, token, depth) {
  const username = handleLimpo(canal.handle || canal.name);
  if (!username) return { videos: [], channelStats: [] };

  const info = await edGet("/instagram/user/info", { username }, token);
  const uinfo = pick(info, ["data"], {});
  const userId = pick(uinfo, ["pk", "pk_id", "id"]);
  const nome = pick(uinfo, ["full_name", "username"], canal.name);
  if (!userId) return { videos: [], channelStats: [{ platform: "instagram", region: canal.region || "br", channelTitle: nome, subscribers: 0, videosColetados: 0 }] };

  // Seguidores vem no detailed-info (custa mais unidades, mas precisamos pro engajamento do IG).
  const det = await edGet("/instagram/user/detailed-info", { username }, token).catch(() => null);
  const seguidores = num(pick(det || {}, ["data.follower_count", "data.edge_followed_by.count"]) ?? pick(uinfo, ["follower_count"]));

  const resp = await edGet("/instagram/user/posts", { user_id: userId, depth }, token);
  const posts = pick(resp, ["data.posts"], []);

  const videos = posts.map((wrap) => {
    const n = wrap.node || wrap;
    const likes = num(pick(n, ["edge_liked_by.count", "edge_media_preview_like.count", "like_count"]));
    const comments = num(pick(n, ["edge_media_to_comment.count", "comment_count"]));
    const vviews = num(pick(n, ["video_view_count", "video_play_count", "play_count"]));
    const caption = pick(n, ["edge_media_to_caption.edges.0.node.text", "caption.text"], "");
    const id = pick(n, ["shortcode", "code", "id"], "");
    const ts = num(pick(n, ["taken_at_timestamp", "taken_at"]));
    // No IG o engajamento padrao e sobre seguidores (fotos nao tem views).
    const eng = seguidores > 0 ? (likes + comments) / seguidores : (vviews > 0 ? (likes + comments) / vviews : 0);
    return {
      platform: "instagram",
      region: canal.region || "br",
      channelId: String(userId),
      channelTitle: nome,
      videoId: String(id),
      title: caption,
      publishedAt: ts ? new Date(ts * 1000).toISOString() : null,
      url: id ? `https://www.instagram.com/p/${id}/` : canal.url || "",
      thumbnail: pick(n, ["display_url", "thumbnail_src"], ""),
      views: vviews || likes + comments, // proxy de alcance quando a foto nao tem views
      likes,
      comments,
      engagementRate: eng,
      hashtags: hashtagsDe(caption),
      tags: [],
    };
  });

  const channelStats = [{
    platform: "instagram",
    region: canal.region || "br",
    channelId: String(userId),
    channelTitle: nome,
    subscribers: seguidores,
    videosColetados: videos.length,
  }];
  return { videos, channelStats };
}

// Orquestra uma plataforma (tiktok|instagram) para a lista de canais dela.
export async function collectEnsemble(plataforma, canais, { token, maxVideosPerChannel = 40 }) {
  const depth = Math.max(1, Math.ceil(maxVideosPerChannel / 10));
  const fn = plataforma === "tiktok" ? coletarTikTok : coletarInstagram;
  const out = { videos: [], channelStats: [] };
  for (const canal of canais) {
    if (!(canal.handle || canal.name)) continue;
    try {
      const r = await fn(canal, token, depth);
      out.videos.push(...r.videos);
      out.channelStats.push(...r.channelStats);
    } catch (err) {
      console.warn(`[${plataforma}] ${canal.name || canal.handle}: ${err.message}`);
    }
  }
  return out;
}
