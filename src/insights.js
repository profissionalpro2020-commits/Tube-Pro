// insights.js
// Aqui mora a INTELIGENCIA. Nao basta contar palavra ("iphone apareceu 53 vezes").
// A gente quer responder: o que rende? o que vale a pena postar? onde tem brecha?
// o que o espelho (Jef) faz melhor ou pior? o que ja bomba la fora e ainda nao
// chegou aqui? Tudo com numero real por tras, nada de achismo.

const STOPWORDS = new Set([
  // PT - artigos, preposicoes, pronomes e conectivos
  "a","o","as","os","de","da","do","das","dos","e","em","um","uma","que","com","para","pra","por",
  "no","na","nos","nas","se","ao","aos","mais","menos","meu","minha","seu","sua","isso","esse","essa",
  "voce","vc","eu","ele","ela","tem","vai","ja","so","mas","ou","como","foi","ser","vale","pena",
  "sobre","nessa","nesse","dessa","desse","nisso","disso","aqui","ali","la","agora","antes","depois",
  "sem","ate","toda","todo","tudo","todos","todas","cada","entre","quando","onde","porque","muito",
  "pouco","nova","novo","novos","novas","ano","anos","usar","faz","fazer","feito","pode","poder",
  "ter","vir","dar","estar","esta","este","estes","sao","era","foram","nao","sim","coisa","coisas",
  "jeito","forma","niño","nino","para",
  // EN - stopwords e ruido comum de titulo
  "the","an","of","to","in","on","for","and","or","is","are","my","your","this","that","with",
  "best","how","why","what","i","you","it","vs","top","new","can","cant","dont","don","wont","wont",
  "ever","every","all","any","some","just","like","more","less","get","got","make","made","use","using",
  "one","two","three","really","actually","thing","things","way","ways","here","there","now","was","were",
  "been","being","has","have","had","will","would","should","could","into","out","off","over","under",
  "about","than","then","world","air","biggest","most","least","does","did","his","her","its","our","their",
  // ruido de plataforma
  "video","videos","canal","2024","2025","2026","parte","ep","live","oficial","shorts","short",
  // ruido de legenda/CTA de rede social (aparecem em quase todo post, nao sao tema)
  "dica","dicas","comenta","comentario","comentarios","comentou","salva","salve","salvar","manda",
  "mandar","deixa","compartilha","compartilhe","marca","marque","segue","siga","segueai","perfil",
  "bio","conta","quem","saber","sabia","sabe","usa","usar","usou","usam","precisa","precisam","fica",
  "ficar","gente","galera","pessoal","melhor","pior","absurdo","gostou","olha","veja","vem","nao",
  "sim","hoje","agora","esses","essas","estes","estas","voce","muito","ter","faz",
  "qual","quais","nem","faca","faria","muita","muitas","outro","outra","outros","nivel","tanto",
  "tantos","tanta","nunca","sempre","mundo","vez","vezes","apenas","ainda","toda","todo","tudo","coisa",
  "suas","seus","sua","seu","vao","dai","pois","entao","assim","aqui","ali","isso","aquilo",
]);

export function tokens(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // tira acento: "voce/nao/comentarios" batem com a lista
    .replace(/#[\p{L}\p{N}_]+/gu, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

function mediana(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function media(nums) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}
function pct1(x) {
  return (x * 100).toFixed(1);
}

// Desempenho de cada tema: nao so quantas vezes aparece, mas quanto engaja e quantas views traz.
function temasComDesempenho(lista) {
  const m = new Map();
  for (const v of lista) {
    for (const t of new Set(tokens(v.title))) {
      if (!m.has(t)) m.set(t, { n: 0, engs: [], views: [] });
      const o = m.get(t);
      o.n++;
      o.engs.push(v.engagementRate || 0);
      o.views.push(v.views || 0);
    }
  }
  return [...m.entries()].map(([termo, o]) => ({
    termo,
    n: o.n,
    engMedio: media(o.engs),
    viewsMediano: Math.round(mediana(o.views)),
  }));
}

function ehPergunta(t = "") {
  return /\?|\bcomo\b|\bpor que\b|\bporque\b|\bqual\b|\bvale a pena\b|\bsera\b/i.test(t);
}
function temNumero(t = "") {
  return /\d/.test(t);
}
function proporcaoCaixaAlta(t = "") {
  const letras = (t.match(/\p{L}/gu) || []).length;
  if (!letras) return 0;
  const maiusc = (t.match(/\p{Lu}/gu) || []).length;
  return maiusc / letras;
}

// A "formula" dos campeoes: o que os videos de maior engajamento tem em comum.
function formulaDoEngajamento(brVideos) {
  const comViews = brVideos.filter((v) => (v.views || 0) >= 500);
  if (comViews.length < 6) return { dicas: [], base: comViews.length };
  const ordenado = [...comViews].sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0));
  const corte = Math.max(3, Math.round(ordenado.length * 0.25));
  const campeoes = ordenado.slice(0, corte);
  const resto = ordenado.slice(corte);

  const perfil = (g) => ({
    palavras: media(g.map((v) => (v.title || "").trim().split(/\s+/).length)),
    pergunta: media(g.map((v) => (ehPergunta(v.title) ? 1 : 0))),
    numero: media(g.map((v) => (temNumero(v.title) ? 1 : 0))),
    caixaAlta: media(g.map((v) => (proporcaoCaixaAlta(v.title) > 0.5 ? 1 : 0))),
    eng: media(g.map((v) => v.engagementRate || 0)),
  });
  const c = perfil(campeoes);
  const r = perfil(resto);

  const dicas = [];
  dicas.push(
    `Os campeoes de engajamento rendem ${pct1(c.eng)}% em media, contra ${pct1(r.eng)}% do resto. Essa e a barra a mirar.`
  );
  if (c.pergunta - r.pergunta >= 0.12) {
    dicas.push(
      `Titulo em forma de PERGUNTA funciona: ${Math.round(c.pergunta * 100)}% dos campeoes usam, contra ${Math.round(r.pergunta * 100)}% do resto.`
    );
  }
  if (c.numero - r.numero >= 0.12) {
    dicas.push(
      `Titulo com NUMERO ("5 coisas", "em 2 minutos") aparece em ${Math.round(c.numero * 100)}% dos campeoes, contra ${Math.round(r.numero * 100)}% do resto.`
    );
  }
  if (Math.abs(c.palavras - r.palavras) >= 1) {
    const curto = c.palavras < r.palavras;
    dicas.push(
      `Titulo ${curto ? "mais CURTO" : "mais LONGO"} tende a render: campeoes tem ~${c.palavras.toFixed(0)} palavras, resto ~${r.palavras.toFixed(0)}.`
    );
  }
  if (c.caixaAlta - r.caixaAlta >= 0.15) {
    dicas.push(
      `CAIXA ALTA para dar enfase aparece mais nos campeoes (${Math.round(c.caixaAlta * 100)}% contra ${Math.round(r.caixaAlta * 100)}%). Use com parcimonia.`
    );
  }
  // Palavras que distinguem os campeoes.
  const freq = (g) => {
    const m = new Map();
    for (const v of g) for (const t of new Set(tokens(v.title))) m.set(t, (m.get(t) || 0) + 1 / g.length);
    return m;
  };
  const fc = freq(campeoes);
  const fr = freq(resto);
  const distintas = [...fc.entries()]
    .map(([t, p]) => ({ t, ganho: p - (fr.get(t) || 0), n: Math.round(p * campeoes.length) }))
    .filter((x) => x.n >= 2 && x.ganho > 0)
    .sort((a, b) => b.ganho - a.ganho)
    .slice(0, 8)
    .map((x) => x.t);
  if (distintas.length) {
    dicas.push(`Palavras que mais aparecem nos campeoes: ${distintas.join(", ")}.`);
  }
  return { dicas, base: comViews.length };
}

// Monta pautas concretas: tema quente + formato que funciona + um video real para estudar.
function montarPautas({ oportunidades, brVideos, formato, engMercado }) {
  const pautas = [];
  for (const o of oportunidades.slice(0, 5)) {
    const exemplo = brVideos
      .filter((v) => tokens(v.title).includes(o.termo) && (v.views || 0) >= 200)
      .sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0))[0];
    const acimaDaMedia = o.engMedio > engMercado;
    pautas.push({
      tema: o.termo,
      motivo:
        `O tema "${o.termo}" aparece em ${o.n} videos do mercado e engaja ${pct1(o.engMedio)}% em media` +
        (acimaDaMedia ? ` (acima da media do mercado, que e ${pct1(engMercado)}%).` : `.`) +
        (o.viewsMediano ? ` Views tipicas: ${o.viewsMediano.toLocaleString("pt-BR")}.` : ""),
      formatoSugerido: formato,
      exemploParaEstudar: exemplo
        ? {
            title: exemplo.title,
            channelTitle: exemplo.channelTitle,
            url: exemplo.url,
            engajamento: exemplo.engagementRate,
            views: exemplo.views,
          }
        : null,
    });
  }
  return pautas;
}

function paraPlataforma(videos, plataforma, referenciaMatcher) {
  const pv = videos.filter((v) => v.platform === plataforma);
  const br = pv.filter((v) => v.region === "br");
  const intl = pv.filter((v) => v.region === "intl");
  if (!br.length) return null;

  const engMercado = media(br.map((v) => v.engagementRate || 0));
  const temasBR = temasComDesempenho(br);

  // Quentes e rentaveis: tema com volume (ja e tendencia) E engajamento alto.
  const temasQuentesRentaveis = temasBR
    .filter((t) => t.n >= 4)
    .sort((a, b) => b.engMedio - a.engMedio)
    .slice(0, 8);

  // Subaproveitados: poucos videos falam, mas quem fala engaja bem. A brecha de ouro.
  const temasSubaproveitados = temasBR
    .filter((t) => t.n >= 2 && t.n <= 4 && t.engMedio > engMercado)
    .sort((a, b) => b.engMedio - a.engMedio)
    .slice(0, 6);

  const formula = formulaDoEngajamento(br);
  const formatoSugerido =
    formula.dicas.length > 1
      ? "Siga a formula dos campeoes (veja a secao 'O que faz engajar')."
      : "Titulo curto, direto e com gancho de curiosidade.";

  // Oportunidades = mistura dos quentes rentaveis + subaproveitados, sem repetir.
  const vistos = new Set();
  const oportunidades = [...temasSubaproveitados, ...temasQuentesRentaveis].filter((t) => {
    if (vistos.has(t.termo)) return false;
    vistos.add(t.termo);
    return true;
  });

  const pautas = montarPautas({ oportunidades, brVideos: br, formato: formatoSugerido, engMercado });

  // Hashtags em alta (desta rede) e os 9 videos pra "fazer igual" com dicas de melhoria.
  const hcount = new Map();
  for (const v of br) for (const h of new Set(v.hashtags || [])) hcount.set(h, (hcount.get(h) || 0) + 1);
  const hashtagsQuentes = [...hcount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, n]) => ({ tag, n }));
  const replicar = montarReplicar(br, { engMercado, hashtagsQuentes, referenciaMatcher });

  // Espelho (Jef): como ele vai em relacao ao mercado.
  let espelho = null;
  const jef = br.filter((v) => referenciaMatcher(v.channelTitle));
  if (jef.length) {
    const outros = br.filter((v) => !referenciaMatcher(v.channelTitle));
    const engJef = media(jef.map((v) => v.engagementRate || 0));
    const melhores = [...jef]
      .sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0))
      .slice(0, 3)
      .map((v) => ({ title: v.title, url: v.url, engajamento: v.engagementRate, views: v.views }));

    if (outros.length) {
      // Tem concorrentes cadastrados: compara e acha brechas.
      const engOutros = media(outros.map((v) => v.engagementRate || 0));
      const temasJef = new Set(temasComDesempenho(jef).filter((t) => t.n >= 2).map((t) => t.termo));
      const gaps = temasComDesempenho(outros)
        .filter((t) => t.n >= 4 && t.engMedio >= engOutros && !temasJef.has(t.termo))
        .sort((a, b) => b.engMedio - a.engMedio)
        .slice(0, 8)
        .map((t) => ({ termo: t.termo, engMedio: t.engMedio, n: t.n }));
      espelho = {
        nome: jef[0].channelTitle,
        videosColetados: jef.length,
        engMedio: engJef,
        engMercado: engOutros,
        acimaDaMedia: engJef >= engOutros,
        melhoresVideos: melhores,
        gaps,
        veredito:
          engJef >= engOutros
            ? `Seu espelho engaja ${pct1(engJef)}%, acima da media dos concorrentes (${pct1(engOutros)}%). Esta no caminho certo.`
            : `Seu espelho engaja ${pct1(engJef)}%, abaixo da media dos concorrentes (${pct1(engOutros)}%). Da para subir imitando o que funciona.`,
      };
    } else {
      // So o proprio espelho cadastrado nesta rede: analisa ele mesmo, sem comparar.
      espelho = {
        nome: jef[0].channelTitle,
        videosColetados: jef.length,
        engMedio: engJef,
        engMercado: null,
        acimaDaMedia: null,
        melhoresVideos: melhores,
        gaps: [],
        veredito: `Seu espelho engaja ${pct1(engJef)}% em media nesta rede. Cadastre concorrentes desta rede para eu comparar e achar brechas.`,
      };
    }
  }

  // Da gringa para trazer: tema forte la fora que ainda aparece pouco aqui.
  const termosBR = new Set(temasBR.map((t) => t.termo));
  const temasINTL = temasComDesempenho(intl);
  const engINTLMediano = mediana(intl.map((v) => v.engagementRate || 0));
  const daGringaParaTrazer = temasINTL
    .filter((t) => t.n >= 3 && t.engMedio >= engINTLMediano && !termosBR.has(t.termo))
    .sort((a, b) => b.engMedio - a.engMedio)
    .slice(0, 10)
    .map((t) => ({ termo: t.termo, engMedio: t.engMedio, n: t.n }));

  const recado =
    temasQuentesRentaveis[0]
      ? `O tema mais quente e rentavel agora e "${temasQuentesRentaveis[0].termo}" (${temasQuentesRentaveis[0].n} videos, ${pct1(temasQuentesRentaveis[0].engMedio)}% de engajamento).`
      : "Ainda juntando dados para o primeiro veredito.";

  return {
    recado,
    engMercado,
    temasQuentesRentaveis,
    temasSubaproveitados,
    formula,
    pautas,
    replicar,
    espelho,
    daGringaParaTrazer,
  };
}

// Roda a inteligencia para cada plataforma que tiver dados BR.
// Retorna { youtube: {...}, tiktok: {...}, instagram: {...} } (so as que existem).
function fmtDuracao(seg) {
  if (!seg) return null;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m ? `${m}min${s ? ` ${s}s` : ""}` : `${s}s`;
}

// Escolhe videos recentes e bons para o dono "fazer igual" e, cruzando os sinais
// (engajamento, comentarios, duracao, titulo, hashtags, descricao), diz o que melhorar.
function montarReplicar(br, { engMercado, hashtagsQuentes, referenciaMatcher }) {
  const agora = Date.now();
  const dias = (iso) => (iso ? (agora - new Date(iso).getTime()) / 86400000 : Infinity);
  // Foca no canal de referencia (o Jef): sao os videos dele pra estudar e fazer melhor.
  // Se o Jef nao estiver nesta rede, cai pro mercado todo.
  const doJef = br.filter((v) => referenciaMatcher && referenciaMatcher(v.channelTitle));
  const universo = doJef.length ? doJef : br;
  const comViews = universo.filter((v) => (v.views || 0) > 0);
  if (!comViews.length) return [];

  const comDur = comViews.filter((v) => v.duracaoSeg > 0);
  const topEng = [...comDur].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, Math.max(3, Math.round(comDur.length * 0.25)));
  const durIdeal = mediana(topEng.map((v) => v.duracaoSeg));
  const taxaCom = (v) => (v.views > 0 ? v.comments / v.views : 0);
  const medTaxaCom = mediana(comViews.map(taxaCom));
  const hotTags = (hashtagsQuentes || []).map((h) => h.tag);

  // "Nao muito velhos": de outubro (mes 10) do ano atual pra ca.
  const cutoff = Date.UTC(new Date().getUTCFullYear(), 9, 1);
  let recentes = comViews.filter((v) => v.publishedAt && new Date(v.publishedAt).getTime() >= cutoff);
  if (recentes.length < 9) recentes = comViews.filter((v) => dias(v.publishedAt) <= 120);
  if (recentes.length < 9) recentes = comViews;
  // Equilibra engajamento E alcance, pra sugerir hits de verdade (nao video nicho com 1k views).
  const score = (v) => (v.engagementRate || 0) * Math.log10((v.views || 0) + 10);
  const ordenado = [...recentes].sort((a, b) => score(b) - score(a));
  // Se o foco e o proprio Jef (um criador so), pega os 9 melhores dele.
  // Se for mercado (varios canais), limita a 3 por canal pra variar.
  const capPorCanal = doJef.length ? 99 : 3;
  const porCanal = new Map();
  const escolhidos = [];
  for (const v of ordenado) {
    const c = v.channelTitle || "?";
    if ((porCanal.get(c) || 0) >= capPorCanal) continue;
    porCanal.set(c, (porCanal.get(c) || 0) + 1);
    escolhidos.push(v);
    if (escolhidos.length >= 9) break;
  }

  return escolhidos.map((v) => {
    const dicas = [];
    if (v.engagementRate >= engMercado)
      dicas.push(`Engaja ${pct1(v.engagementRate)}%, acima da media (${pct1(engMercado)}%). O gancho funciona, repita o tipo.`);
    else
      dicas.push(`Engaja ${pct1(v.engagementRate)}%, abaixo da media (${pct1(engMercado)}%). Reforce o gancho nos 3 primeiros segundos.`);

    const tc = taxaCom(v);
    if (medTaxaCom > 0 && tc < medTaxaCom * 0.7)
      dicas.push("Poucos comentarios pro tamanho. Termine com uma PERGUNTA direta pra puxar conversa.");
    else if (medTaxaCom > 0 && tc > medTaxaCom * 1.3)
      dicas.push("Gera muita conversa nos comentarios. Mantenha esse tipo de tema.");

    if (v.duracaoSeg > 0 && durIdeal > 0) {
      if (v.duracaoSeg > durIdeal * 1.4)
        dicas.push(`Dura ${fmtDuracao(v.duracaoSeg)}; os que mais engajam tem ~${fmtDuracao(Math.round(durIdeal))}. Corte e va direto ao ponto.`);
      else dicas.push(`Duracao (${fmtDuracao(v.duracaoSeg)}) esta na faixa que engaja. Mantenha.`);
    }

    if (!/\?|\bcomo\b|\bpor que\b|\bqual\b/i.test(v.title) && !/\d/.test(v.title))
      dicas.push("Titulo sem pergunta nem numero. Teste 'Como...' ou 'X coisas que...'.");

    const tagsV = new Set(v.hashtags || []);
    const faltando = hotTags.filter((t) => !tagsV.has(t)).slice(0, 3);
    if (faltando.length) dicas.push(`Hashtags em alta que faltaram: ${faltando.join(", ")}.`);

    if (v.descricaoTamanho != null && v.descricaoTamanho < 80)
      dicas.push("Descricao curta. Resuma o video, ponha um CTA e o link do Descolo.");

    return {
      title: v.title,
      url: v.url,
      channelTitle: v.channelTitle,
      thumbnail: v.thumbnail,
      publishedAt: v.publishedAt,
      views: v.views,
      engajamento: v.engagementRate,
      comentarios: v.comments,
      duracao: fmtDuracao(v.duracaoSeg),
      dicas: dicas.slice(0, 4),
    };
  });
}

function tituloTokens(t = "") {
  return new Set(tokens(t));
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / new Set([...a, ...b]).size;
}

// Cruza as plataformas: temas que bombam nas duas e o MESMO conteudo postado nas duas (cross-post),
// pra comparar onde rendeu mais.
function cruzarPlataformas(videos, blocos, referenciaMatcher) {
  const plats = Object.keys(blocos);
  if (plats.length < 2) return null;

  const termosPorPlat = {};
  for (const p of plats) {
    const m = new Map();
    for (const t of [...(blocos[p].temasQuentesRentaveis || []), ...(blocos[p].temasSubaproveitados || [])]) {
      if (!m.has(t.termo)) m.set(t.termo, t.engMedio);
    }
    termosPorPlat[p] = m;
  }
  const todosTermos = new Set(plats.flatMap((p) => [...termosPorPlat[p].keys()]));
  const temasEmComum = [];
  for (const termo of todosTermos) {
    const em = plats.filter((p) => termosPorPlat[p].has(termo));
    if (em.length >= 2) temasEmComum.push({ termo, plataformas: em.map((p) => ({ plataforma: p, engMedio: termosPorPlat[p].get(termo) })) });
  }
  temasEmComum.sort((a, b) => b.plataformas.length - a.plataformas.length);

  // Mesmo conteudo do Jef postado em mais de uma rede (titulo/legenda parecidos).
  const jefPorPlat = {};
  for (const p of plats) jefPorPlat[p] = videos.filter((v) => v.platform === p && (!referenciaMatcher || referenciaMatcher(v.channelTitle)));
  const mesmoConteudo = [];
  for (let i = 0; i < plats.length; i++) {
    for (let j = i + 1; j < plats.length; j++) {
      for (const a of jefPorPlat[plats[i]]) {
        const ta = tituloTokens(a.title);
        if (ta.size < 2) continue;
        let best = null, bs = 0;
        for (const b of jefPorPlat[plats[j]]) {
          const s = jaccard(ta, tituloTokens(b.title));
          if (s > bs) { bs = s; best = b; }
        }
        if (best && bs >= 0.4) {
          mesmoConteudo.push({
            titulo: (a.title || "").replace(/\s+/g, " ").slice(0, 70),
            similaridade: bs,
            itens: [
              { plataforma: plats[i], views: a.views, engajamento: a.engagementRate, url: a.url },
              { plataforma: plats[j], views: best.views, engajamento: best.engagementRate, url: best.url },
            ],
          });
        }
      }
    }
  }
  mesmoConteudo.sort((a, b) => b.similaridade - a.similaridade);

  return { temasEmComum: temasEmComum.slice(0, 10), mesmoConteudo: mesmoConteudo.slice(0, 8) };
}

export function gerarInteligencia(videos, referenciaMatcher) {
  const plataformas = [...new Set(videos.map((v) => v.platform))];
  const blocos = {};
  for (const p of plataformas) {
    const bloco = paraPlataforma(videos, p, referenciaMatcher);
    if (bloco) blocos[p] = bloco;
  }
  if (!Object.keys(blocos).length) return null;
  return { plataformas: blocos, cruzamento: cruzarPlataformas(videos, blocos, referenciaMatcher) };
}
