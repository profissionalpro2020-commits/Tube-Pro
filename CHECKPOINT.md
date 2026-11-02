# CHECKPOINT: onde paramos e como retomar

Este arquivo e o ponto de retomada. Numa conversa nova, leia ele primeiro para
continuar sem quebra.

Ultima atualizacao: 2026-11-02

---

## 1. COMO RETOMAR (o passo imediato)

A chave do YouTube ja foi colocada em dois lugares pelo dono:
- Cofre do GitHub (secret `YOUTUBE_API_KEY`) para o robo automatico
- Variavel de ambiente `YOUTUBE_API_KEY` para teste ao vivo nas sessoes

FEITO em 2026-11-02: a PRIMEIRA COLETA REAL ja rodou com sucesso.
400 videos de 8 canais, dado real (sample=false). Destaques ja mostrados ao dono.

O proximo passo (a decidir com o dono) e um destes dois:
1. Ligar o robo de hora em hora (abrir Pull Request levando o codigo para o
   branch main, e so com autorizacao do dono).
2. Publicar o dashboard no GitHub Pages para o dono ver online.

Para rodar de novo a qualquer momento:

```bash
npm run scan     # puxa dados reais do YouTube (@JefDicasTech e os outros)
npm run serve    # abre o dashboard em http://localhost:4173
```

---

## 2. O OBJETIVO DO PROJETO

Ajudar o dono a virar referencia em dicas tech (estilo @JefDicasTech), medir o
que rende (views e engajamento), achar temas e hashtags em alta, comparar com a
gringa, e no fim puxar trafego para o site Descolo e abrir caminho para
monetizacao.

Criador de referencia (o espelho): **@JefDicasTech** no YouTube, Instagram e TikTok.

---

## 3. DECISOES JA TOMADAS

- Sera um aplicativo web, com atualizacao automatica.
- Foco em metricas que importam: views e engajamento, do video mais antigo ao mais novo.
- Dois trabalhos diferentes: espiar concorrentes (dado publico) e medir as contas
  do proprio dono (login).
- Construir aos poucos, por fases. Gratis e legal primeiro, pago so depois de
  provar valor.
- Regra de trabalho: o dono traz ideias, o Claude conduz, pesquisa em fonte real
  e entrega passo a passo. (Detalhe em CLAUDE.md)

---

## 4. MAPA DAS PLATAFORMAS (o que da para fazer)

| Plataforma | Espiar os outros (publico) | Conta propria | Custo |
|---|---|---|---|
| YouTube | SIM, gratis, API oficial | SIM (login) | Gratis (cota 10k/dia) |
| Instagram | So basico, conta Business/Creator, precisa app Meta + revisao | SIM (login) | Gratis mas burocratico |
| TikTok | Nao da de graca (oficial e so academico) | SIM (login) | So via servico pago |

Regra de ouro: espiar os outros usa so dado PUBLICO (nunca "acesso a conta deles").
Medir as contas do dono usa login.

---

## 5. O QUE JA ESTA PRONTO (codigo)

- Coletor do YouTube real (API v3), com busca de canal por NOME (nao precisa de handle).
- Analise: campeoes de views e engajamento, temas quentes, hashtags, novos (48h),
  secao "da gringa".
- Dashboard web em portugues, com abas por plataforma.
- Automacao de hora em hora via GitHub Actions (`.github/workflows/scan.yml`).
- Encaixes modulares prontos para TikTok, Instagram e Facebook (vazios, esperando fonte).
- Dados de exemplo para rodar sem a chave.

---

## 6. O QUE FALTA (pendencias por fase)

**Fase 1 (YouTube, gratis, em andamento)**
- [x] Rodar a primeira coleta real (chave ja esta no ambiente). FEITO 2026-11-02.
- [x] Mostrar o resultado ao dono. FEITO 2026-11-02.
- [ ] Ligar o robo de hora em hora (abrir PR para o main, com autorizacao).
- [ ] Opcional: publicar o dashboard no GitHub Pages.

**Fase 2 (contas proprias do dono, gratis)**
- [ ] Conectar YouTube, TikTok e Instagram do proprio dono para medir o dele.
- [ ] Aviso quando o dono postar video novo.

**Fase 3 (espiar concorrentes em TikTok e Instagram, pago)**
- [ ] Integrar servico com API (EnsembleData ou Apify) nos encaixes ja prontos.

---

## 7. CANAIS CONFIGURADOS (`config/channels.json`)

- YouTube BR: Jef Dicas Tech (@JefDicasTech, referencia), Manual do Mundo,
  TecMundo, Tecnoblog, Me ajuda Nick.
- YouTube gringa: Mrwhosetheboss, MKBHD, Dave2D.
- TikTok e Instagram: @jefdicastech registrado, esperando fonte de dados.

---

## 8. FERRAMENTAS PAGAS PESQUISADAS (para a Fase 3)

- **Metricool** (binoculo manual): analisa concorrentes em varias redes. Plano
  gratis cobre Instagram, TikTok e Facebook; YouTube so no pago. Precisa ligar a
  conta propria. Bom para o dono espiar na mao ja agora.
- **Social Blade** (gratis): numeros publicos de criadores.
- **EnsembleData / Apify / Phyllo** (com API): usados para automatizar dentro do
  nosso radar na Fase 3.

Todas so veem dado PUBLICO. Precos e cobertura mudam, confirmar no site de cada uma.

---

## 9. ESTRUTURA DOS ARQUIVOS

```
CHECKPOINT.md             <- este arquivo (ponto de retomada)
CLAUDE.md                 <- regra de trabalho e roadmap do projeto
README.md                 <- manual de uso e instalacao
config/channels.json      <- canais monitorados
src/collectors/youtube.js <- coletor do YouTube (funciona)
src/collectors/index.js   <- orquestra, com encaixes de TikTok/Instagram/Facebook
src/analyze.js            <- gera os insights
src/run.js                <- roda tudo e grava public/data/snapshot.json
src/serve.js              <- servidor local do dashboard
public/                   <- o dashboard web (index.html, styles.css, app.js)
.github/workflows/scan.yml<- automacao de hora em hora
```

Branch de trabalho (sessao atual): `claude/great-turing-dlxtf3`
