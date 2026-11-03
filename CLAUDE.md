# Tube Pro: como este projeto funciona

> PONTO DE RETOMADA: comece lendo `CHECKPOINT.md`. Ele diz onde paramos e qual e
> o proximo passo.


## O objetivo
Construir um radar de conteudo que ajuda o dono a virar referencia em dicas tech
(estilo os grandes canais de dicas do YouTube, Instagram e TikTok), medir o que
realmente rende (views e engajamento), descobrir temas e hashtags em alta,
comparar com o que bomba na gringa e, no fim, puxar trafego para o site Descolo
e abrir caminho para monetizacao.

## A regra de trabalho (vale para toda sessao)
O dono traz as ideias. Eu (Claude) conduzo a execucao. Na pratica isso quer dizer:

1. **Eu pesquiso em fonte real antes de afirmar.** Nada de chutar de cabeca.
   Quando algo depende de regra de plataforma, preco ou passo de interface
   (que muda com o tempo), eu verifico na fonte e so entao trago.
2. **Eu entrego passo a passo mastigado.** Sempre dizer o que conectar, como
   fazer, em que ordem e por que. O dono nao deve precisar adivinhar o proximo
   movimento: eu aponto.
3. **Eu guio o ritmo.** A cada etapa, eu digo qual e o proximo passo mais util e
   so avanco para o proximo depois que o atual provou valor. Construir aos poucos,
   nao tudo de uma vez.
4. **Eu sou honesto sobre limites.** Se uma plataforma nao deixa, ou se algo
   custa dinheiro, eu falo antes, com a fonte. Nada de prometer o que as regras
   das plataformas nao permitem.
6. **Nao mudar de plano a cada obstaculo.** Se bater num impedimento, explicar o
   impedimento e seguir a MESMA linha; nao trocar a ferramenta/conceito toda hora.
   Manter a recomendacao estavel entre sessoes.
7. **Curto e direto, mao na massa.** Nada de textao. Responder enxuto e partir
   pra acao. O dono odeia perder tempo com explicacao longa.
5. **Grátis e legal primeiro.** Priorizar o que e gratuito, autonomo e dentro das
   regras. So partir para servico pago depois que a fase gratuita provar valor.

## O mapa das plataformas (resumo verificado)
- **YouTube:** porta aberta. API oficial (Data API v3) da dados publicos de
  qualquer canal (inscritos, views, curtidas, comentarios por video). Gratis ate
  10.000 unidades de cota por dia. Para o canal proprio, o login da tudo. Fase 1.
- **Instagram:** porta entreaberta. "Business Discovery" (Graph API) le so o
  basico de contas Business/Creator publicas, e exige app na Meta + pagina do
  Facebook + revisao. Para a conta propria, o login da tudo.
- **TikTok:** porta fechada para espiar terceiros via oficial (Research API e so
  academico). Para espiar criadores, so com servico externo pago (ex:
  EnsembleData, Apify). Para a conta propria, o Display API da os numeros.

Detalhe importante: espiar criadores dos outros usa so dado **publico** (nunca
"acesso a conta deles"). Medir as contas **do proprio dono** usa login/autorizacao.

## Roadmap em fases
- **Fase 1 (gratis, autonoma):** YouTube. Monitorar canais de inspiracao +
  conectar o canal proprio. Entrega temas quentes, campeoes de views/engajamento
  e comparacao com a gringa. [estado: base montada, falta conectar a chave]
- **Fase 2 (gratis):** conectar TikTok e Instagram do proprio dono, para medir
  crescimento e avisar quando ele postar.
- **Fase 3 (opcional, paga):** servico externo para espiar criadores especificos
  de TikTok e Instagram. So depois da Fase 1 provar valor.

## Estado atual
App web em Node (sem framework pesado). Coletor do YouTube pronto, analise
pronta, dashboard pronto, automacao de hora em hora via GitHub Actions pronta.
Rodando com dados de exemplo ate a chave do YouTube ser conectada.

## Detalhes tecnicos
- `npm run scan` coleta e analisa; `npm run serve` abre o dashboard.
- Sem `YOUTUBE_API_KEY`, usa dados de exemplo.
- Canais monitorados ficam em `config/channels.json`.
- Branch de trabalho: `claude/dreamy-franklin-ak299h`.
