# Tube Pro 📡

Seu radar de conteudo para virar referencia em dicas tech. Ele fica de olho em canais
que voce escolhe, mede views e engajamento, acha os temas e hashtags que estao bombando
e separa o que faz sucesso na gringa para voce trazer a pauta antes dos outros. Tudo
isso num app web que atualiza sozinho.

A meta: te dar ideia de pauta todo dia, mostrar o que rende de verdade e, no fim,
puxar trafego pro Descolo.

## Como pensar nele (a analogia)

E um olheiro de futebol. Ele assiste os "jogos" (videos) dos craques do seu nicho,
anota quem jogou bem e por que, e te entrega o relatorio pronto. Voce so decide a
proxima jogada (o proximo video).

## O que ja funciona hoje

- **YouTube**: coleta real e gratuita de dados publicos (views, curtidas, comentarios).
- **Dashboard web** em portugues com campeoes de views/engajamento, temas quentes,
  hashtags, novos videos (48h) e a secao "da gringa".
- **Automacao** de hora em hora via GitHub Actions.
- **Encaixes prontos** para TikTok, Instagram e Facebook (ligam quando voce tiver a fonte de dados).

## Passo a passo rapido

### 1. Pegar a chave do YouTube (gratis, ~10 min)

1. Acesse https://console.cloud.google.com/ e crie um projeto.
2. Em "APIs e servicos" > "Biblioteca", ative a **YouTube Data API v3**.
3. Em "Credenciais", crie uma **Chave de API** e copie.

### 2. Configurar

```bash
cp .env.example .env
# cole sua chave em YOUTUBE_API_KEY dentro do .env
```

Edite `config/channels.json` e troque os canais de exemplo pelos que voce admira.
Use o handle (`@nomedocanal`) e marque `region` como `br` ou `intl`.

### 3. Rodar

```bash
npm run scan     # coleta e analisa (sem chave, usa dados de exemplo)
npm run serve    # abre o dashboard em http://localhost:4173
```

## Automacao de hora em hora

O arquivo `.github/workflows/scan.yml` roda sozinho. Para ligar:

1. No GitHub, va em **Settings > Secrets and variables > Actions** e crie o secret
   `YOUTUBE_API_KEY`.
2. O agendamento so dispara a partir do branch padrao do repositorio.
3. Os dados atualizados sao salvos em `public/data/` a cada rodada.

Para publicar o dashboard de graca, da para usar **GitHub Pages** apontando para a pasta `public/`.

## As outras plataformas (TikTok, Instagram, Facebook)

Espiar canais **dos outros** nessas redes e limitado pelas regras delas. As opcoes:

- **Suas proprias contas**: via API oficial (conta business/creator) voce ve tudo do seu conteudo.
- **Canais publicos de terceiros**: normalmente so com servico externo pago (ex: Apify, RapidAPI).

Os encaixes ja estao em `src/collectors/index.js` (`collectTikTok`, `collectInstagram`,
`collectFacebook`). Quando tiver a fonte, e so preencher cada funcao devolvendo a mesma
estrutura de video do YouTube.

## Estrutura

```
config/channels.json      canais que voce monitora
src/collectors/           coletores (youtube.js funciona; os outros sao encaixes)
src/analyze.js            gera os insights (temas, hashtags, rankings, gringa)
src/run.js                roda tudo e grava public/data/snapshot.json
public/                   o dashboard web
.github/workflows/        automacao de hora em hora
```
