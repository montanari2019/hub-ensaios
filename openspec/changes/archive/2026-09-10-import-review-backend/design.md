## Context

Ver `proposal.md` para o porquê. Ponto de partida técnico: um app Vite +
React já funcional na raiz de `tracks-gambira`, com o design system, o
`ChannelStrip`, o transporte e o `PlayerEngine` (Web Audio API) já
validados pelo usuário — nada disso muda de comportamento aqui, só a
camada de dados por baixo. O que muda: sai IndexedDB, entra um backend
local (NestJS + TypeORM + SQLite) que guarda os metadados no banco e os
áudios como arquivos reais em disco numa pasta `tracks/` na raiz do
monorepo — decisão confirmada com o usuário depois de pesquisar SQLite-WASM
no browser (descartado: exige Web Worker + OPFS, API de conveniência
descontinuada em abr/2026, ~1MB+ de binário) e depois de ele mesmo propor
a alternativa de backend.

## Goals / Non-Goals

**Goals:**
- Persistir metadados (track, canais, BPM, tonalidade) num SQLite de
  verdade via TypeORM, e os áudios como arquivos reais em disco em
  `tracks/` na raiz do projeto — inspecionáveis, copiáveis, com backup
  trivial (é só uma pasta).
- Adicionar uma etapa de revisão entre "selecionar o zip" e "track salva":
  nome da track editável, nome de cada canal editável, BPM e tonalidade
  opcionais — nada é gravado até o usuário confirmar.
- Continuar 100% privado/local: o backend só escuta em loopback, sem
  deploy público, sem nuvem.
- Preservar 1:1 a experiência já validada (design system, channel strip,
  sincronismo, mute/solo/volume) — só a origem dos dados muda.

**Non-Goals (nesta mudança):**
- Sem migração automática dos dados que já estavam no IndexedDB do MVP
  anterior — mudança **BREAKING**, assumida no proposal.
- Sem autenticação, multiusuário ou acesso remoto — segue sendo uma
  ferramenta local de uma pessoa só.
- Sem deploy/hospedagem — continua "rode na sua própria máquina".
- Sem mudar a lógica interna do `PlayerEngine` (grafo Web Audio,
  agendamento sample-accurate, ganho efetivo de mute/solo) — só a fonte
  dos bytes de áudio muda, de `Blob` do IndexedDB para `fetch` no backend.

## Decisions

### Monorepo: Yarn workspaces puro, sem Turborepo/Nx
`apps/web` recebe o frontend atual (movido como está, sem reescrever nada
de UI) e `apps/api` é o NestJS novo. `package.json` da raiz declara
`"workspaces": ["apps/*"]` e um script `dev` que sobe os dois processos
juntos via `concurrently`. Decisão do próprio usuário — Turborepo/Nx
adicionariam orquestração de build/cache sem necessidade real pra só dois
pacotes.

### Backend: NestJS + TypeORM + `better-sqlite3`
Driver `better-sqlite3` (API síncrona, binários pré-compilados, bem
suportado pelo TypeORM) em vez do driver `sqlite3` clássico (callback-based,
mais lento). Síncrono é adequado aqui: app de uso local, single-user,
volume de dados pequeno.

Entidades:
- `Track`: `id` (uuid), `name`, `bpm` (int, opcional), `tonality`
  (string, opcional), `importedAt`. Relação `OneToMany` com `Channel`.
- `Channel`: `id` (uuid), `trackId` (FK), `name`, `fileName` (nome
  original do arquivo no zip), `filePath` (caminho relativo dentro de
  `tracks/`, é a fonte da verdade de onde o áudio está em disco —
  não recalculado por convenção), `mimeType`, `order` (inteiro, preserva a
  ordem original do zip — substitui o truque de `channelIds` que o
  IndexedDB precisava porque não garantia ordem de leitura), `durationSeconds`.

### Arquivos em disco: `tracks/<trackId>/<channelId>.<ext>`
Pasta `tracks/` na raiz do monorepo (sibling de `apps/`), caminho
resolvido a partir de um `TRACKS_DIR` configurável (env var), com default
apontando pra lá. Cada track confirmada ganha sua subpasta; o nome do
arquivo usa o `channelId` (não o nome editável do canal) pra nunca colidir
e nunca precisar sanitizar nome de arquivo.

Alternativa considerada: guardar o áudio como coluna BLOB no SQLite.
Rejeitada — é exatamente o oposto do que o usuário pediu (arquivos reais,
inspecionáveis), e SQLite não é otimizado pra blobs grandes do jeito que
um arquivo no disco é.

### Revisão da importação: staging fora da pasta `tracks/`
`POST /tracks/import` recebe o `.zip`, extrai os áudios (reaproveitando a
mesma lógica de parsing/whitelist de formatos que já existia no
frontend, agora rodando no Node) para um diretório temporário
(`os.tmpdir()/hub-import-<importId>/`) e devolve um preview (nome sugerido
da track, lista de canais com nome sugerido) — nada é gravado no SQLite
nem em `tracks/` ainda. `POST /tracks/import/:id/confirm` (nomes editados,
BPM, tonalidade) move os arquivos do staging pra `tracks/<trackId>/` e cria
as linhas no banco. `POST /tracks/import/:id/cancel` apaga o staging.
Uma varredura na subida do backend remove diretórios de staging órfãos
(mais velhos que um TTL) pro caso do usuário só fechar a aba sem cancelar
explicitamente.

Alternativa considerada: extrair direto pra dentro de `tracks/<id>/` e só
criar a linha no banco ao confirmar. Rejeitada — um import cancelado
deixaria arquivos reais dentro da pasta que deveria conter só tracks
confirmadas, violando a garantia de "cancelar não deixa rastro".

### Contrato da API (REST, JSON)
- `POST /tracks/import` — multipart, devolve `{ importId, suggestedName, channels: [{ tempChannelId, suggestedName, durationSeconds }] }`
- `POST /tracks/import/:importId/confirm` — body `{ name, bpm?, tonality?, channels: [{ tempChannelId, name }] }`, devolve a track criada
- `POST /tracks/import/:importId/cancel`
- `GET /tracks` — lista (nome, contagem de canais, data, duração, bpm, tonalidade)
- `GET /tracks/:id` — detalhe + canais (id, nome, ordem, duração)
- `GET /tracks/:id/channels/:channelId/audio` — stream do áudio (Content-Type = mimeType salvo)
- `DELETE /tracks/:id` — remove linhas do banco (cascade nos canais) + a subpasta em `tracks/`

### Frontend: `src/lib/db.ts` (IndexedDB) sai, entra `src/lib/api.ts`
`importTrack.ts` deixa de fazer parsing client-side + gravação no
IndexedDB e passa a só subir o `.zip` cru pro `/tracks/import` (parsing
migra pro backend, centralizando a whitelist de formato de áudio num
lugar só). `usePlayerEngine` passa a buscar o áudio de cada canal via
`GET /tracks/:id/channels/:channelId/audio` (`fetch` → `ArrayBuffer` →
mesmo `decodeAudioData` de sempre) em vez de ler um `Blob` do IndexedDB —
o `PlayerEngine` em si não muda nada.

Nova tela `ImportReview`, roteada em `/import/:importId` (mesmo padrão de
roteamento real já usado pra `/tracks/:trackId`): recebe o preview do
parsing, mostra campos de texto editáveis (nome da track, nome de cada
canal) e campos de BPM/tonalidade, com botões Confirmar/Cancelar.

### Dev: um comando só, proxy de API
`yarn dev` na raiz sobe `apps/web` (Vite, porta 5173) e `apps/api`
(NestJS, porta 3001) juntos via `concurrently`. `vite.config.ts` ganha um
proxy de `/api` pra `http://localhost:3001`, então o frontend sempre chama
caminhos relativos (`/api/tracks`) — sem CORS, sem porta hardcoded.

## Risks / Trade-offs

- **[Risco]** Import cancelado/abandonado (aba fechada no meio da revisão)
  pode deixar arquivos de staging órfãos → **Mitigação**: staging fica fora
  de `tracks/`, e uma varredura na subida do backend apaga staging mais
  velho que um TTL.
- **[Risco]** `better-sqlite3` exige compilação nativa na instalação →
  **Mitigação**: distribui binários pré-compilados pras plataformas comuns
  (inclui macOS, o ambiente em uso aqui); não é esperado ser um problema.
- **[Risco]** Dois processos (web + api) criam um novo jeito de "esquecer
  de ligar" algo → **Mitigação**: requisito já especificado em
  `local-backend` — a UI mostra erro claro se o backend não responder, em
  vez de tela em branco.
- **[Risco]** Sem migração dos dados do IndexedDB do MVP anterior →
  **Mitigação**: assumido como breaking no proposal; é só reimportar os
  zips de teste, não há dado de produção em jogo ainda.

## Migration Plan

1. Criar a estrutura do monorepo (workspaces na raiz) e mover o frontend
   atual pra `apps/web` sem alterar nada dele; confirmar que continua
   rodando igual a partir do novo caminho.
2. Construir `apps/api` do zero, em paralelo — não toca em `apps/web` até
   o fim.
3. Trocar a camada de dados de `apps/web` (IndexedDB → cliente da API)
   isolada em `src/lib`/`src/hooks`, sem tocar nas telas/componentes.
4. Sem dado real pra migrar (ver Non-Goals) — o conteúdo antigo do
   IndexedDB fica pra trás no navegador; nada a escrever pra isso.
