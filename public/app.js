// Dashboard: le public/data/snapshot.json e monta a tela.

const PLATAFORMAS = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
};

let dados = null;
let abaAtual = "youtube";
let abaFixada = false; // vira true quando o dono clica numa aba (nao sobrescreve a escolha dele)

// Mapa de inteligencia por plataforma (compat: snapshot novo tem .plataformas; antigo era plano).
function intelPlataformas() {
  const i = dados.inteligencia;
  if (!i) return null;
  return i.plataformas || i;
}

// Abre preferindo Instagram, depois TikTok, depois YouTube (o que tiver dado).
function escolherAbaInicial() {
  const ordem = ["instagram", "tiktok", "youtube", "facebook"];
  for (const p of ordem) {
    const bloco = (dados.plataformas || {})[p];
    if (bloco && bloco.totalVideos > 0) return p;
  }
  return "youtube";
}

function nfmt(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".0", "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(".0", "") + "k";
  return String(n);
}
function pct(n) {
  return ((Number(n) || 0) * 100).toFixed(1) + "%";
}
function dataCurta(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

async function carregar() {
  try {
    const res = await fetch("./data/snapshot.json?t=" + Date.now());
    dados = await res.json();
  } catch {
    document.getElementById("updatedAt").textContent = "sem dados ainda - rode: npm run scan";
    return;
  }
  render();
}

function render() {
  document.getElementById("updatedAt").textContent =
    "atualizado em " + new Date(dados.geradoEm).toLocaleString("pt-BR");
  document.getElementById("sampleBadge").classList.toggle("hidden", !dados.sample);

  if (!abaFixada) abaAtual = escolherAbaInicial();

  renderKpis();
  renderInteligencia(abaAtual);
  renderReplicar(abaAtual);
  renderCruzamento();
  renderGringa();
  renderTabs();
  renderAba();
  renderCanais();
}

function renderKpis() {
  const r = dados.resumo || {};
  const box = document.getElementById("kpis");
  box.innerHTML = "";
  const kpis = [
    ["Videos analisados", nfmt(r.totalVideos)],
    ["Canais monitorados", nfmt(r.totalCanais)],
    ["Novos em 48h", nfmt(r.videosNovos48h)],
    ["Plataformas ativas", String(Object.values(dados.plataformas || {}).filter(Boolean).length)],
  ];
  for (const [lbl, num] of kpis) {
    box.appendChild(el(`<div class="kpi"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`));
  }
}

function renderInteligencia(plataforma) {
  const todas = intelPlataformas();
  const i = todas ? todas[plataforma] : null;
  const painel = document.getElementById("intelPanel");
  if (!i) {
    if (painel) painel.classList.add("hidden");
    return;
  }
  painel.classList.remove("hidden");
  document.getElementById("intelTitulo").textContent = `🧠 Inteligencia: ${PLATAFORMAS[plataforma] || plataforma}`;

  document.getElementById("intelRecado").textContent = i.recado || "";

  // Pautas
  const pt = document.getElementById("intelPautas");
  pt.innerHTML = "";
  (i.pautas || []).forEach((p, n) => {
    const ex = p.exemploParaEstudar;
    const exHtml = ex
      ? `<div class="pauta-ex">Estudar: <a href="${ex.url}" target="_blank" rel="noopener">${escapar(ex.title)}</a> <span class="tag-eng">${pct(ex.engajamento)}</span></div>`
      : "";
    pt.appendChild(
      el(`
      <div class="pauta">
        <div class="pauta-top"><span class="pauta-num">${n + 1}</span><span class="pauta-tema">${escapar(p.tema)}</span></div>
        <p class="pauta-motivo">${escapar(p.motivo)}</p>
        ${exHtml}
      </div>`)
    );
  });
  if (!(i.pautas || []).length) pt.appendChild(el(`<p class="empty">Juntando dados pra sugerir pautas.</p>`));

  // Espelho
  const esp = document.getElementById("intelEspelho");
  esp.innerHTML = "";
  if (i.espelho) {
    const e = i.espelho;
    const cor = e.acimaDaMedia ? "up" : "down";
    esp.appendChild(
      el(`
      <div class="espelho ${cor}">
        <div class="espelho-nome">${escapar(e.nome)}</div>
        <div class="espelho-nums">
          <div><b>${pct(e.engMedio)}</b><span>engajamento do espelho</span></div>
          <div><b>${pct(e.engMercado)}</b><span>media dos concorrentes</span></div>
        </div>
        <p class="espelho-veredito">${escapar(e.veredito)}</p>
      </div>`)
    );
    if ((e.melhoresVideos || []).length) {
      const box = el(`<div class="espelho-sub"><span>Melhores do espelho:</span></div>`);
      e.melhoresVideos.forEach((v) =>
        box.appendChild(
          el(`<div class="mini-row"><a href="${v.url}" target="_blank" rel="noopener">${escapar(v.title)}</a><span class="tag-eng">${pct(v.engajamento)}</span></div>`)
        )
      );
      esp.appendChild(box);
    }
    if ((e.gaps || []).length) {
      const g = el(`<div class="espelho-sub"><span>Brechas do espelho (concorrentes exploram, ele nao):</span></div>`);
      const chips = el(`<div class="chips"></div>`);
      e.gaps.forEach((x) => chips.appendChild(el(`<span class="chip">${escapar(x.termo)}<b>${pct(x.engMedio)}</b></span>`)));
      g.appendChild(chips);
      esp.appendChild(g);
    }
  } else {
    esp.appendChild(el(`<p class="empty">Canal de referencia ainda nao detectado nos dados.</p>`));
  }

  // Formula
  const fm = document.getElementById("intelFormula");
  fm.innerHTML = "";
  ((i.formula && i.formula.dicas) || []).forEach((d) => fm.appendChild(el(`<li>${escapar(d)}</li>`)));
  if (!((i.formula && i.formula.dicas) || []).length) fm.appendChild(el(`<li class="empty">Precisa de mais videos pra achar o padrao.</li>`));

  // Brechas (subaproveitados)
  const br = document.getElementById("intelBrechas");
  br.innerHTML = "";
  (i.temasSubaproveitados || []).forEach((t) =>
    br.appendChild(el(`<span class="chip">${escapar(t.termo)}<b>${pct(t.engMedio)}</b></span>`))
  );
  if (!(i.temasSubaproveitados || []).length) br.appendChild(el(`<p class="empty">Sem brechas claras agora.</p>`));
}

function renderReplicar(plataforma) {
  const todas = intelPlataformas();
  const bloco = todas && todas[plataforma];
  const lista = bloco && bloco.replicar;
  const painel = document.getElementById("replicarPanel");
  if (!lista || !lista.length) {
    if (painel) painel.classList.add("hidden");
    return;
  }
  painel.classList.remove("hidden");
  document.getElementById("replicarTitulo").textContent = `📹 9 videos pra fazer igual em ${PLATAFORMAS[plataforma] || plataforma} (e como melhorar)`;

  const box = document.getElementById("replicarLista");
  box.innerHTML = "";
  lista.forEach((v, n) => {
    const thumb = v.thumbnail
      ? `<img src="${v.thumbnail}" alt="" loading="lazy" />`
      : `<div class="rep-noimg"></div>`;
    const dicas = (v.dicas || []).map((d) => `<li>${escapar(d)}</li>`).join("");
    const card = el(`
      <div class="rep-card">
        <div class="rep-thumb">${thumb}<span class="rep-num">${n + 1}</span></div>
        <div class="rep-body">
          <a class="rep-ttl" href="${v.url}" target="_blank" rel="noopener">${escapar(v.title)}</a>
          <div class="rep-meta">${escapar(v.channelTitle)} · ${nfmt(v.views)} views · ${pct(v.engajamento)} eng${v.duracao ? " · " + escapar(v.duracao) : ""}${v.comentarios != null ? " · " + nfmt(v.comentarios) + " coment." : ""}</div>
          <ul class="rep-dicas">${dicas}</ul>
        </div>
      </div>`);
    box.appendChild(card);
  });
}

function renderCruzamento() {
  const c = dados.inteligencia && dados.inteligencia.cruzamento;
  const painel = document.getElementById("cruzamentoPanel");
  if (!c || ((!c.temasEmComum || !c.temasEmComum.length) && (!c.mesmoConteudo || !c.mesmoConteudo.length))) {
    if (painel) painel.classList.add("hidden");
    return;
  }
  painel.classList.remove("hidden");

  const temas = document.getElementById("cruzTemas");
  temas.innerHTML = "";
  (c.temasEmComum || []).forEach((t) => {
    const redes = t.plataformas.map((p) => PLATAFORMAS[p.plataforma] || p.plataforma).join(" + ");
    temas.appendChild(el(`<span class="chip">${escapar(t.termo)}<b>${escapar(redes)}</b></span>`));
  });
  if (!(c.temasEmComum || []).length) temas.appendChild(el(`<p class="empty">Sem tema repetido nas duas redes ainda.</p>`));

  const box = document.getElementById("cruzMesmo");
  box.innerHTML = "";
  (c.mesmoConteudo || []).forEach((m) => {
    const itens = m.itens
      .sort((a, b) => (b.engajamento || 0) - (a.engajamento || 0))
      .map((it, i) => `<div class="cruz-item ${i === 0 ? "melhor" : ""}"><span>${PLATAFORMAS[it.plataforma] || it.plataforma}</span> <b>${pct(it.engajamento)}</b> · ${nfmt(it.views)} views${i === 0 ? " 🏆" : ""}</div>`)
      .join("");
    box.appendChild(el(`<div class="cruz-card"><p class="cruz-ttl">${escapar(m.titulo)}</p>${itens}</div>`));
  });
  if (!(c.mesmoConteudo || []).length) box.appendChild(el(`<p class="empty">Nao achei o mesmo video nas duas redes ainda.</p>`));
}

function renderGringa() {
  const g = dados.gringa || {};
  const temTemas = (g.temasParaTrazer || []).length;
  const temVideos = (g.topVideos || []).length;
  const painel = document.getElementById("gringaPanel");
  if (!temTemas && !temVideos) { if (painel) painel.classList.add("hidden"); return; }
  painel.classList.remove("hidden");
  renderGringaConteudo(g);
}

function renderGringaConteudo(g) {
  const temas = document.getElementById("gringaTemas");
  temas.innerHTML = "";
  (g.temasParaTrazer || []).forEach((t) =>
    temas.appendChild(el(`<span class="chip">${t.termo}<b>${t.n}</b></span>`))
  );
  if (!temas.children.length) temas.appendChild(el(`<p class="empty">Adicione canais com region "intl" para alimentar esta secao.</p>`));

  const vids = document.getElementById("gringaVideos");
  vids.innerHTML = "";
  (g.topVideos || []).slice(0, 4).forEach((v) => vids.appendChild(cardVideo(v)));
}

function renderTabs() {
  const nav = document.getElementById("tabs");
  nav.innerHTML = "";
  for (const [key, nome] of Object.entries(PLATAFORMAS)) {
    const bloco = (dados.plataformas || {})[key];
    const ativa = !!bloco && bloco.totalVideos > 0;
    const tab = el(
      `<button class="tab ${key === abaAtual ? "active" : ""} ${ativa ? "" : "disabled"}">${nome}${ativa ? "" : " (em breve)"}</button>`
    );
    if (ativa) tab.onclick = () => { abaAtual = key; abaFixada = true; renderTabs(); renderAba(); renderInteligencia(abaAtual); renderReplicar(abaAtual); };
    nav.appendChild(tab);
  }
}

function renderAba() {
  const bloco = (dados.plataformas || {})[abaAtual];
  const novos = document.getElementById("novosList");
  const tv = document.getElementById("topViews");
  const te = document.getElementById("topEng");
  const temas = document.getElementById("temas");
  const hts = document.getElementById("hashtags");
  [novos, tv, te, temas, hts].forEach((n) => (n.innerHTML = ""));

  if (!bloco) {
    novos.appendChild(el(`<p class="empty">Plataforma ainda nao conectada.</p>`));
    return;
  }

  (bloco.novos || []).forEach((v) => novos.appendChild(cardVideo(v)));
  if (!bloco.novos?.length) novos.appendChild(el(`<p class="empty">Nenhum video novo nas ultimas 48h.</p>`));

  (bloco.topViews || []).forEach((v, i) => tv.appendChild(linhaVideo(v, i, "views")));
  (bloco.topEngajamento || []).forEach((v, i) => te.appendChild(linhaVideo(v, i, "eng")));

  (bloco.temasQuentes || []).forEach((t) =>
    temas.appendChild(el(`<span class="chip">${t.termo}<b>${t.n}</b></span>`))
  );
  (bloco.hashtags || []).forEach((h) =>
    hts.appendChild(el(`<span class="chip">${h.tag}<b>${h.n}</b></span>`))
  );
  if (!bloco.hashtags?.length) hts.appendChild(el(`<p class="empty">Sem hashtags detectadas.</p>`));
}

function linhaVideo(v, i, tipo) {
  const stat = tipo === "views" ? `${nfmt(v.views)} views` : pct(v.engagementRate);
  const row = el(`
    <div class="row">
      <div class="rank">${i + 1}</div>
      <div class="info">
        <p class="ttl">${escapar(v.title)}</p>
        <div class="sub">${escapar(v.channelTitle)} - ${dataCurta(v.publishedAt)}</div>
      </div>
      <div class="stat">${stat}</div>
    </div>`);
  if (v.url && v.url !== "#") {
    const ttl = row.querySelector(".ttl");
    ttl.innerHTML = `<a href="${v.url}" target="_blank" rel="noopener">${escapar(v.title)}</a>`;
  }
  return row;
}

function cardVideo(v) {
  const img = v.thumbnail
    ? `<img src="${v.thumbnail}" alt="" loading="lazy" />`
    : `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='124'%3E%3Crect width='100%25' height='100%25' fill='%231c2230'/%3E%3C/svg%3E" alt="" />`;
  const card = el(`
    <div class="card">
      ${img}
      <div class="body">
        <p class="ttl">${escapar(v.title)}</p>
        <div class="sub">${escapar(v.channelTitle)}<br>${nfmt(v.views)} views - ${pct(v.engagementRate)} eng</div>
      </div>
    </div>`);
  if (v.url && v.url !== "#") {
    card.style.cursor = "pointer";
    card.onclick = () => window.open(v.url, "_blank", "noopener");
  }
  return card;
}

function renderCanais() {
  const box = document.getElementById("canais");
  box.innerHTML = "";
  (dados.canais || []).forEach((c) =>
    box.appendChild(
      el(`
      <div class="row">
        <div class="rank">${c.region === "intl" ? "🌎" : "🇧🇷"}</div>
        <div class="info">
          <p class="ttl">${escapar(c.channelTitle)}</p>
          <div class="sub">${PLATAFORMAS[c.platform] || c.platform} - ${nfmt(c.subscribers)} inscritos</div>
        </div>
        <div class="stat">${nfmt(c.videosColetados)} videos</div>
      </div>`)
    )
  );
  if (!dados.canais?.length) box.appendChild(el(`<p class="empty">Nenhum canal ainda.</p>`));
}

function escapar(s = "") {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

carregar();
