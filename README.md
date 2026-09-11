<div align="center">

# 🎚️ Hub de Ensaios

**Player de faixas multicanal pra banda/equipe de louvor ouvir e ensaiar com stems isolados — sem depender de app de terceiro.**

Sobe um `.zip` com os canais de uma música (bateria, baixo, voz, click...), o app te dá um mixer de verdade — mute, solo, volume e transpose de tonalidade por canal, ao vivo — direto do navegador, publicado na Vercel pra qualquer um da banda acessar.

[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![NestJS](https://img.shields.io/badge/nestjs-12-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/typescript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Postgres](https://img.shields.io/badge/postgres-vercel--storage-4169E1?logo=postgresql&logoColor=white)](https://vercel.com/docs/storage)
[![Vercel](https://img.shields.io/badge/deploy-vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

*Frontend e backend publicados na Vercel; banco (Postgres) e áudios (Blob) gerenciados na nuvem — qualquer pessoa com o link acessa.*

</div>

---

## 📑 Índice

<table>
<tr>
<td width="33%">

**[🧭 Sobre](#-sobre-o-projeto)**
**[✨ Funcionalidades](#-funcionalidades)**

</td>
<td width="33%">

**[🏗️ Arquitetura](#️-arquitetura)**
**[🚀 Instalação](#-instalação-e-uso)**

</td>
<td width="33%">

**[📊 Status](#-status)**
**[⚠️ Limitações](#️-limitações-conhecidas)**

</td>
</tr>
</table>

---

## 🧭 Sobre o projeto

O **Hub de Ensaios** nasceu de um problema bem prático: banda/equipe de louvor ensaiando precisa ouvir uma música com stems separados (cada instrumento no seu canal) pra isolar uma parte, ajustar volume, ou tocar num tom diferente do original — sem virar refém de um app de terceiro pago por música.

O fluxo é simples:

1. Você sobe um `.zip` com os áudios da música (um arquivo = um canal/instrumento).
2. Revisa e confirma nomes, BPM e tonalidade antes de salvar.
3. Abre a track na biblioteca e toca tudo sincronizado, com um "channel strip" por canal — mute, solo, fader de volume (até 120%) e medidor de nível ao vivo.
4. Se precisar tocar em outro tom, clica na tonalidade, escolhe a nota e a oitava — o pitch muda na hora, **sem alterar a velocidade**, e só nos canais que fazem sentido (bateria/click ficam de fora automaticamente).

Tudo fica salvo na nuvem: os áudios no Vercel Blob, os metadados num Postgres gerenciado (via Vercel Storage — Marketplace: Neon, Prisma Postgres etc.) através do TypeORM. O app é público — qualquer pessoa com o link do deploy acessa e ouve as tracks importadas por qualquer outra pessoa, sem precisar rodar nada localmente.

## ✨ Funcionalidades

### 📥 Importação
- Upload de `.zip` com múltiplos arquivos de áudio (cada um vira um canal).
- Tela de revisão antes de salvar qualquer coisa: renomeia a track e cada canal, define BPM e tonalidade (seletor fechado nas 12 notas cromáticas — nada de texto livre).
- Marca por canal se ele **pode ter o pitch transposto** depois (desmarca em bateria, click, ou qualquer percussão sem afinação definida).
- Arquivos não-áudio dentro do zip são ignorados automaticamente.

### 🎛️ Player multicanal
- Transporte único (play/pause/seek) sincroniza todos os canais via Web Audio API (`AudioContext` + um `AudioBufferSourceNode` por canal) — nada de múltiplas tags `<audio>` soltas dessincronizando.
- Channel strip por canal: fader de volume nativo (0–120%, ganho real acima da unidade), mute, solo, medidor de nível em tempo real, cor própria por canal.
- Volume master.
- Ao terminar a música, o transporte volta pro início sozinho — dá pra apertar play de novo sem arrastar a barra.

### 🎵 Transpose de tonalidade ao vivo
- Clica na tonalidade no cabeçalho do player → abre um seletor de nota (12 opções) + oitava (-1 / 0 / +1).
- Pitch-shift real via [Tone.js `PitchShift`](https://tonejs.github.io/docs/PitchShift) — muda só o tom, a velocidade/duração da faixa nunca é tocada.
- Só os canais marcados como editáveis na importação são afetados; bateria/click (ou qualquer canal marcado como não-editável) tocam sempre no pitch original, mesmo com o resto da banda transposto.
- Edição é **local ao seu navegador** por padrão — não pergunta nada, salva na hora. Qualquer outra pessoa abrindo a mesma track (ou você em outra máquina) continua ouvindo o tom original salvo no servidor.
- Quando sua edição local diverge do servidor, aparece um botão de sync — só aí ela vira o novo tom "oficial" da track pra todo mundo.

### 📚 Biblioteca
- Lista todas as tracks importadas (nome, canais, data, BPM/tonalidade se preenchidos).
- Exclusão remove tanto o registro no banco quanto os arquivos de áudio no Blob.

## 🏗️ Arquitetura

Monorepo com Yarn Workspaces (sem Turborepo/Nx), publicado como dois projetos Vercel a partir do mesmo repositório:

```
hub-de-ensaios/
├── apps/
│   ├── web/                 # Frontend — React 19 + TypeScript + Vite (projeto Vercel: build estático)
│   │   ├── vercel.json      # Rewrite /api/* -> projeto da API + fallback SPA
│   │   └── src/
│   │       ├── components/  # Design system (Badge, Button, ChannelStrip, TonalitySelector...)
│   │       ├── screens/     # TrackLibrary, ImportReview, Player
│   │       ├── hooks/       # usePlayerEngine, useTonalityOverride
│   │       ├── lib/         # playerEngine.ts (motor Web Audio), api.ts, transpose.ts
│   │       └── styles/      # tokens.css (design tokens centralizados)
│   │
│   └── api/                 # Backend — NestJS + TypeORM + Postgres (projeto Vercel: Functions)
│       ├── api/index.ts     # Entry point serverless (handler cacheado entre invocações)
│       ├── vercel.json      # Rewrite geral pro handler + Cron da limpeza de staging
│       ├── src/tracks/      # Entidades, DTOs, controller, service, BlobStorageService
│       └── database/        # Migrations, seeds, data-source da CLI do TypeORM
│
├── openspec/                 # Specs e changes (workflow spec-driven, ver openspec.dev)
└── docker-compose.yml         # Postgres local pro dev (mesma engine da produção)
```

**Por que essas escolhas:**
- **Web Audio API** em vez de `<audio>` múltiplas tags: é o único jeito confiável de manter os canais em sample-accurate sync ao dar play/pause/seek/transpose.
- **Postgres gerenciado (via Vercel Storage) + Vercel Blob** em vez de SQLite/disco local: funções serverless não têm filesystem persistente, então banco e áudio precisam viver fora da instância deployada — sobrevivem a redeploy e ficam acessíveis por qualquer pessoa com o link, não só a máquina de quem importou.
- **Upload direto pro Blob a partir do browser**: o `.zip` nunca passa pelo corpo da requisição da função serverless (que tem limite de tamanho) — o frontend sobe direto pro Blob e só manda a URL resultante pro backend processar.
- **Postgres local via Docker (não SQLite) no dev**: mesma engine em dev e produção — migrations e queries nunca divergem entre os dois ambientes.
- **Tone.js `PitchShift`** em vez de `detune`/`playbackRate` nativo: transpor só o pitch sem tocar na velocidade é o requisito não-negociável do projeto — `detune` muda os dois juntos (é tipo acelerar um vinil).

## 🚀 Instalação e uso

**Pré-requisitos:** Node.js ≥ 20, Yarn 1.x (Classic), Docker (ou Docker CLI + [Colima](https://github.com/abiosoft/colima) em Mac Intel, já que o Docker Desktop não é obrigatório).

```bash
# 1. Clonar e instalar dependências (instala pros dois workspaces de uma vez)
git clone https://github.com/montanari2019/hub-ensaios.git
cd hub-ensaios
yarn install

# 2. Configurar variáveis de ambiente do backend
cp apps/api/.env.example apps/api/.env
# Preenche BLOB_READ_WRITE_TOKEN com o token do store de dev/preview
# (Vercel Dashboard -> Storage -> Blob), os defaults de POSTGRES_URL já
# apontam pro Postgres do Docker Compose abaixo.

# 3. Subir o Postgres local (mesma engine da produção)
docker compose up -d

# 4. Rodar as migrations
yarn workspace api migration:run

# 5. Subir os dois workspaces juntos (web na :5173, api na :3001)
yarn dev
```

Abre `http://localhost:5173` e importa seu primeiro `.zip`.

### Scripts principais

| Comando | O que faz |
|---|---|
| `docker compose up -d` | Sobe o Postgres local (precisa estar de pé antes do `yarn dev:api`) |
| `yarn dev` | Sobe frontend + backend juntos (`concurrently`) |
| `yarn dev:web` / `yarn dev:api` | Sobe só um dos dois |
| `yarn workspace api migration:run` | Aplica migrations pendentes no Postgres |
| `yarn workspace api migration:create <nome>` | Cria uma migration nova já com timestamp |
| `yarn workspace api test` | Roda a suíte de testes do backend (Vitest) |
| `yarn build` | Build de produção dos dois apps |

### Deploy (Vercel)

Dois projetos Vercel a partir do mesmo repositório (`hub-ensaios-api`, `hub-ensaios-web`), cada um com `rootDirectory` apontando pro respectivo app. O projeto `hub-ensaios-api` precisa de um banco Postgres conectado via **Storage -> Marketplace Database Providers** (Neon é o recomendado — mesmo provedor que a antiga "Vercel Postgres" nativa usava por baixo; Prisma Postgres e Supabase também funcionam, `getDatabaseOptions()` detecta o nome da env var independente do provedor), um Blob store (`BLOB_READ_WRITE_TOKEN`) e `CRON_SECRET` (autoriza o Cron Job de limpeza de staging); o projeto `hub-ensaios-web` só precisa que `apps/web/vercel.json` aponte o rewrite `/api/*` pra URL real de `hub-ensaios-api`.

## 📊 Status

| Área | Situação |
|---|---|
| Importação (zip → revisão → track) | ✅ Funcionando (upload direto pro Blob) |
| Player sincronizado (mute/solo/volume/meter) | ✅ Funcionando |
| Seletor de tonalidade (nota + oitava) | ✅ Funcionando |
| Pitch-shift ao vivo sem alterar velocidade | ✅ Funcionando (Tone.js `PitchShift`) |
| Persistência em nuvem (Postgres + Blob) + sync de tonalidade | ✅ Funcionando |
| Deploy público na Vercel | ✅ Funcionando |
| Suíte de testes automatizados do frontend | 🚧 Não existe ainda (backend tem Vitest configurado) |

## ⚠️ Limitações conhecidas

- Sem autenticação nem multiusuário real — qualquer pessoa com o link do deploy vê e edita tudo; "sync" de tonalidade é last-write-wins, sem controle de conflito.
- Tonalidade guarda só a nota (classe de altura); modo maior/menor não é modelado.
- Sem app mobile nem PWA — é uma SPA, mas já acessível de qualquer navegador com internet (não precisa mais estar na mesma máquina/rede do backend).

---

<div align="center">

Feito pra resolver um problema de ensaio de verdade. Sugestões e issues são bem-vindas.

</div>
