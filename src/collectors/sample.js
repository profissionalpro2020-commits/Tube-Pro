// Gera dados de exemplo para voce ver o app funcionando antes de conectar as APIs.
// Nao sao dados reais: servem so para visualizar o layout e as analises.

const TEMAS_BR = [
  ["iphone 17 vale a pena", ["#apple", "#iphone", "#tech"]],
  ["5 apps gratis que todo mundo deveria ter", ["#apps", "#dicas", "#android"]],
  ["como deixar o celular mais rapido", ["#dicas", "#celular", "#tutorial"]],
  ["testei o chatgpt por 30 dias", ["#ia", "#chatgpt", "#produtividade"]],
  ["o melhor notebook custo beneficio 2026", ["#notebook", "#review", "#tech"]],
  ["truques escondidos do whatsapp", ["#whatsapp", "#dicas", "#truques"]],
  ["montei um pc gamer barato", ["#pcgamer", "#setup", "#hardware"]],
  ["fone bluetooth bom e barato", ["#fone", "#review", "#audio"]],
  ["editei video so no celular", ["#edicao", "#capcut", "#criadores"]],
  ["configurei minha casa inteligente", ["#casainteligente", "#smarthome", "#alexa"]],
];

// A gringa anda falando de coisas que ainda nao explodiram no BR: boa fonte de pauta.
const TEMAS_INTL = [
  ["underrated gadgets you didnt know existed", ["#gadgets", "#tech", "#cool"]],
  ["i automated my entire desk setup", ["#automation", "#desksetup", "#productivity"]],
  ["nas home server for beginners", ["#nas", "#homelab", "#selfhosted"]],
  ["ai agents are changing everything", ["#aiagents", "#automation", "#future"]],
  ["ewaste restoration project", ["#restoration", "#diy", "#repair"]],
  ["budget smart glasses review", ["#smartglasses", "#wearables", "#review"]],
  ["self hosted apps to replace big tech", ["#selfhosted", "#privacy", "#opensource"]],
  ["raspberry pi projects that are actually useful", ["#raspberrypi", "#diy", "#maker"]],
  ["i tried a digital detox phone", ["#digitaldetox", "#minimalism", "#focus"]],
  ["future of wearable tech 2026", ["#wearables", "#future", "#tech"]],
];

const CANAIS = [
  { channelTitle: "Dicas do Zé Tech", region: "br", subscribers: 820000 },
  { channelTitle: "Tech na Prática", region: "br", subscribers: 1250000 },
  { channelTitle: "GadgetGuy", region: "intl", subscribers: 6400000 },
  { channelTitle: "DailyTechTips", region: "intl", subscribers: 3100000 },
];

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function collectSample() {
  const videos = [];
  const channelStats = CANAIS.map((c, i) => ({
    platform: "youtube",
    region: c.region,
    channelId: `SAMPLE_${i}`,
    channelTitle: c.channelTitle,
    subscribers: c.subscribers,
    videosColetados: 10,
  }));

  CANAIS.forEach((c, ci) => {
    const temas = c.region === "intl" ? TEMAS_INTL : TEMAS_BR;
    temas.forEach((t, ti) => {
      const views = rnd(20000, 2000000);
      const likes = Math.floor(views * (rnd(2, 9) / 100));
      const comments = Math.floor(likes * (rnd(2, 12) / 100));
      // garante alguns lancamentos recentes para a secao "novos (48h)" ter o que mostrar
      const daysAgo = ti === 0 ? rnd(0, 2) : rnd(3, 400);
      videos.push({
        platform: "youtube",
        region: c.region,
        channelId: `SAMPLE_${ci}`,
        channelTitle: c.channelTitle,
        videoId: `SAMPLE_${ci}_${ti}`,
        title: (c.region === "intl" ? "" : "") + t[0],
        publishedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
        url: "#",
        thumbnail: "",
        views,
        likes,
        comments,
        engagementRate: (likes + comments) / views,
        hashtags: t[1],
        tags: [],
      });
    });
  });

  return { videos, channelStats, sample: true };
}
