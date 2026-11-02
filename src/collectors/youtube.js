// Coletor do YouTube usando a YouTube Data API v3 (dados publicos).
// Precisa de YOUTUBE_API_KEY no ambiente.

const API = "https://www.googleapis.com/youtube/v3";

async function api(path, params, apiKey) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status} em ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// Resolve um canal a partir de @handle ou channelId e devolve o id e a playlist de uploads.
async function resolveChannel(channel, apiKey) {
  const params = { part: "contentDetails,snippet,statistics" };
  if (channel.handle && channel.handle.startsWith("@")) {
    params.forHandle = channel.handle;
  } else if (channel.handle && channel.handle.startsWith("UC")) {
    params.id = channel.handle;
  } else if (channel.handle) {
    params.forHandle = "@" + channel.handle.replace(/^@/, "");
  } else {
    return null;
  }
  const data = await api("channels", params, apiKey);
  const item = data.items && data.items[0];
  if (!item) return null;
  return {
    channelId: item.id,
    channelTitle: item.snippet?.title || channel.label || channel.handle,
    subscribers: Number(item.statistics?.subscriberCount || 0),
    uploadsPlaylist: item.contentDetails?.relatedPlaylists?.uploads,
  };
}

function extractHashtags(text = "") {
  const tags = text.match(/#[\p{L}\p{N}_]+/gu) || [];
  return [...new Set(tags.map((t) => t.toLowerCase()))];
}

function engagement(views, likes, comments) {
  const v = Number(views) || 0;
  if (v === 0) return 0;
  return ((Number(likes) || 0) + (Number(comments) || 0)) / v;
}

export async function collectYouTube(channels, { apiKey, maxVideosPerChannel = 40 } = {}) {
  if (!apiKey) throw new Error("Sem YOUTUBE_API_KEY");
  const videos = [];
  const channelStats = [];

  for (const ch of channels) {
    let info;
    try {
      info = await resolveChannel(ch, apiKey);
    } catch (err) {
      console.warn(`[youtube] falha ao resolver ${ch.handle}: ${err.message}`);
      continue;
    }
    if (!info || !info.uploadsPlaylist) {
      console.warn(`[youtube] canal nao encontrado: ${ch.handle}`);
      continue;
    }

    // 1) pega os ids dos uploads (paginado) ate o limite
    const videoIds = [];
    let pageToken = "";
    while (videoIds.length < maxVideosPerChannel) {
      const pl = await api(
        "playlistItems",
        {
          part: "contentDetails",
          playlistId: info.uploadsPlaylist,
          maxResults: 50,
          ...(pageToken ? { pageToken } : {}),
        },
        apiKey
      );
      for (const it of pl.items || []) {
        if (it.contentDetails?.videoId) videoIds.push(it.contentDetails.videoId);
      }
      if (!pl.nextPageToken) break;
      pageToken = pl.nextPageToken;
    }

    // 2) pega estatisticas em lotes de 50
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const details = await api(
        "videos",
        { part: "snippet,statistics", id: batch.join(",") },
        apiKey
      );
      for (const v of details.items || []) {
        const views = Number(v.statistics?.viewCount || 0);
        const likes = Number(v.statistics?.likeCount || 0);
        const comments = Number(v.statistics?.commentCount || 0);
        const title = v.snippet?.title || "";
        const desc = v.snippet?.description || "";
        videos.push({
          platform: "youtube",
          region: ch.region || "br",
          channelId: info.channelId,
          channelTitle: info.channelTitle,
          videoId: v.id,
          title,
          publishedAt: v.snippet?.publishedAt,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          thumbnail: v.snippet?.thumbnails?.medium?.url || "",
          views,
          likes,
          comments,
          engagementRate: engagement(views, likes, comments),
          hashtags: extractHashtags(`${title} ${desc}`),
          tags: v.snippet?.tags || [],
        });
      }
    }

    channelStats.push({
      platform: "youtube",
      region: ch.region || "br",
      channelId: info.channelId,
      channelTitle: info.channelTitle,
      subscribers: info.subscribers,
      videosColetados: videoIds.length,
    });
  }

  return { videos, channelStats };
}
