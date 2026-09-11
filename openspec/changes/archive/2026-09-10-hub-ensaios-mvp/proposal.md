## Why

A equipe de louvor/banda precisa ensaiar ouvindo os canais separados de uma
música (bateria, baixo, voz, etc.) para estudar sua parte isoladamente, hoje
sem nenhuma ferramenta própria para isso — a alternativa seria um app de
terceiros pago (Moises) que não foi feito para o fluxo deles de subir os
próprios multitracks. Um hub local, sem backend, resolve isso para o MVP:
subir um zip com os canais de uma faixa e ouvir a música isolando/ajustando
cada canal durante a reprodução, como um mixer real.

## What Changes

- Novo projeto React + TypeScript + Vite, criado do zero neste repositório
  (`tracks-gambira`), com um design system próprio derivado 1:1 da linguagem
  visual do projeto de referência (`ibn-manancial-sound`): fundo quase preto,
  glassmorphism, Roboto/Roboto Mono, badges e botões em pill, cards "glass",
  channel strips no estilo consola (fader, mute, solo, medidor).
- Estilização 100% via CSS Modules por componente + tokens de tema
  centralizados em CSS custom properties (cores, fontes, espaçamentos,
  raios) — sem estilo inline, exceto valores dinâmicos passados como CSS
  variable (ex.: altura de um meter).
- Upload de um arquivo `.zip` contendo os canais (arquivos de áudio) de uma
  track; o app extrai os arquivos no navegador, cria uma track na biblioteca
  local e associa um canal a cada arquivo de áudio encontrado.
- Biblioteca de tracks: lista as tracks já importadas (persistidas
  localmente no navegador via IndexedDB) para o usuário escolher qual abrir.
- Player multicanal sincronizado: transporte único (play/pause, seek, tempo
  decorrido/total) que toca todos os canais da track em sincronia via Web
  Audio API, com um channel strip por canal permitindo mute, solo e volume
  (0–100%) individuais, ajustáveis em tempo real durante a reprodução.
- Ordem de entrega proposital: primeiro a interface (com dados de exemplo/
  mock, sem áudio real funcionando), depois a funcionalidade real de
  upload/parse/reprodução — refletido na sequência de `tasks.md`.

## Capabilities

### New Capabilities
- `design-system`: fundação visual do app — tokens de tema (cores, fontes,
  espaçamento, raios) em CSS custom properties, layout shell (navbar,
  página), e os componentes de UI reutilizáveis (botão pill, badge, card
  glass) derivados da referência visual, todos estilizados via CSS Modules.
- `track-library`: upload de um `.zip` de canais, extração/validação no
  navegador, persistência local (IndexedDB) e listagem/seleção de tracks
  importadas.
- `channel-player`: motor de reprodução multicanal sincronizada (Web Audio
  API) e a UI de channel strip por canal (mute, solo, volume) acoplada a um
  transporte único de play/pause/seek.

### Modified Capabilities
(nenhuma — projeto novo, sem specs existentes)

## Impact

- Cria o projeto Vite (`package.json`, `vite.config.ts`, `tsconfig.json`)
  dentro de `tracks-gambira`, hoje vazio.
- Novas dependências esperadas: React, TypeScript, uma lib de leitura de zip
  no navegador (ex. JSZip) e o suporte nativo do browser a IndexedDB e Web
  Audio API (sem dependências de backend/nuvem).
- Sem impacto em sistemas externos: MVP roda inteiramente client-side.
