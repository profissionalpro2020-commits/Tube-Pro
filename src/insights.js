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
]);

export function tokens(text = "") {
  return text
    .toLowerCase()
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
    espelho,
    daGringaParaTrazer,
  };
}

// Roda a inteligencia para cada plataforma que tiver dados BR.
// Retorna { youtube: {...}, tiktok: {...}, instagram: {...} } (so as que existem).
export function gerarInteligencia(videos, referenciaMatcher) {
  const plataformas = [...new Set(videos.map((v) => v.platform))];
  const out = {};
  for (const p of plataformas) {
    const bloco = paraPlataforma(videos, p, referenciaMatcher);
    if (bloco) out[p] = bloco;
  }
  return Object.keys(out).length ? out : null;
}
