## Context

Projeto novo (greenfield) dentro de `tracks-gambira`, hoje vazio. Ver
`proposal.md` para o porquê. Este documento cobre como o MVP será
construído: bootstrap do projeto, engine de áudio multicanal sincronizada,
persistência local, e a arquitetura de estilo (CSS Modules + tokens)
exigida pelo usuário.

Importante para escopo: o `.zip` que o usuário sobe **já contém os canais
separados** (ex.: exportação multitrack de uma DAW/gravador de igreja) — o
app não faz separação de fontes por IA como o Moises faz para um único
arquivo mixado. "Como o Moises faz" se refere à *experiência de isolar
canais durante a reprodução*, não ao algoritmo de separação.

## Goals / Non-Goals

**Goals:**
- Entregar um MVP local funcional: importar `.zip` → biblioteca → abrir
  track → reprodução multicanal sincronizada com mute/solo/volume por
  canal, tudo rodando no navegador, sem backend.
- Fidelidade visual à linguagem de design da referência
  (`ibn-manancial-sound`), com uma arquitetura de tema/CSS que facilite
  manter e estender esse visual.
- Sequenciar a entrega em duas fases dentro da mesma implementação:
  interface com dados mock primeiro, funcionalidade real depois — sem
  retrabalho entre as fases (mesmos tipos/contratos desde o início).

**Non-Goals (nesta versão):**
- Sem backend, autenticação, multiusuário ou colaboração em tempo real.
- Sem armazenamento em nuvem (AWS ou qualquer serviço externo) — 100% local
  no navegador.
- Sem separação de fontes por IA (input já vem separado em canais).
- Sem waveform visual, efeitos/EQ, exportação/mixdown, ou mudança de
  tempo/pitch — isolamento de canais é o escopo do MVP.
- Sem PWA/instalação offline.

## Decisions

### Bootstrap: Vite `react-ts` + Yarn
Usar o template oficial `react-ts` do Vite, com `yarn` (conforme pedido pelo
usuário) como gerenciador de pacotes, não npm. Mantém o setup de ESLint/TS padrão
do template como ponto de partida.

### Roteamento real com `react-router-dom`
Duas rotas: `/` (biblioteca) e `/tracks/:trackId` (player). Decisão revista
durante a implementação a pedido explícito do usuário — a versão inicial
deste documento previa trocar de tela só por estado local (sem router),
mas o requisito é ter navegação com URLs de verdade (voltar do navegador,
recarregar a página no player, compartilhar/colar o link de uma track
funcionam). `AppShell` recebe a página atual como `children` de cada
`<Route>`; o botão "Biblioteca" no player usa `useNavigate()`.

### Parsing de zip: JSZip
`jszip` para extrair os arquivos do `.zip` no navegador (API baseada em
Promise, madura, lê `Blob`/`ArrayBuffer` por entrada). Alternativa
considerada: `fflate` (menor/mais rápida) — descartada por ora em favor da
API mais simples do JSZip; trocar depois é isolado, pois o parsing fica
encapsulado num módulo próprio (`zip parsing`, não espalhado pela UI).

### Engine de áudio: Web Audio API, não `<audio>` por canal
Um `AudioContext` único por sessão de reprodução. Por canal: o `Blob` de
áudio é decodificado uma vez para `AudioBuffer` (`decodeAudioData`) ao
abrir a track; a cada play/seek, um novo `AudioBufferSourceNode` é criado a
partir desse buffer (nós de source são de uso único) e conectado a um
`GainNode` persistente do canal (volume/mute/solo) → `GainNode` mestre
(volume master) → `destination`. Todos os `AudioBufferSourceNode` de todos
os canais são agendados para iniciar no **mesmo** `audioContext.currentTime
+ epsilon` num único agendamento, garantindo sincronismo sample-accurate
entre canais.

Alternativa considerada: uma tag `<audio>` HTML por canal, sincronizadas
via `.currentTime`. Rejeitada — múltiplos elementos `<audio>` não garantem
início alinhado por amostra entre si, tendem a driftar ao longo de uma
música inteira, e mudanças de volume não são tão suaves quanto um
`GainNode`. Isso viola diretamente o requisito de "canais permanecem
sincronizados durante toda a reprodução" da spec `channel-player`.

### Lógica de mute/solo
Ganho efetivo de um canal é uma função pura do seu estado: `muted ? 0 :
(algumCanalEmSolo ? (esteCanalEmSolo ? volume : 0) : volume)`. Recalculada
e reaplicada ao `GainNode` do canal sempre que qualquer canal muda
mute/solo/volume — o estado individual de volume/mute de cada canal nunca é
sobrescrito pelo solo de outro, só sua saída fica temporariamente zerada.

### Medidor de nível: `AnalyserNode` por canal
Um `AnalyserNode` por canal (inserido entre o `GainNode` do canal e o
somatório mestre) lido via `requestAnimationFrame` fornece o nível
aproximado para o medidor visual do channel strip. É a API padrão do Web
Audio para esse propósito, sem custo de decodificar PCM manualmente.

### Persistência local: IndexedDB via `idb`
Áudio de cada canal é guardado como `Blob` em IndexedDB (não como
`AudioBuffer` decodificado — não é serializável/é grande demais), usando a
lib `idb` (wrapper fino baseado em Promise sobre a IndexedDB API nativa,
poucos KB) em vez de escrever os callbacks crus. Dois object stores:
`tracks` (id, nome, importedAt, lista de ids de canal) e `channels` (id,
trackId, nome, mimeType, blob). Ao abrir uma track, os blobs são lidos e
decodificados para `AudioBuffer` em memória.

Alternativa considerada: `localStorage` com áudio em base64. Rejeitada
explicitamente — quota de poucos MB é insuficiente para arquivos de áudio,
e base64 infla o tamanho em ~33%; IndexedDB guarda `Blob` nativamente e tem
quota ordens de magnitude maior, permanecendo 100% local conforme pedido.

### Estado da aplicação: React state + Context, sem lib externa
Um `PlayerEngine` (a orquestração da Web Audio API acima) é criado uma vez
por sessão de player e exposto via Context para os componentes de channel
strip; a biblioteca de tracks usa state local + o wrapper do IndexedDB
diretamente. Sem Redux/Zustand — escopo pequeno demais para justificar.
Reavaliar se o estado compartilhado crescer além disso.

### Estilo: CSS Modules + tokens centralizados (requisito explícito do usuário)
- `src/styles/tokens.css`: `:root` global com os design tokens (cores,
  fontes, tamanhos de fonte, espaçamento, raios, sombra, easing/duração),
  extraídos 1:1 da paleta da referência (`#050506`, `#0a84ff`, `#30d158`,
  Roboto/Roboto Mono, raios 14/22/32px etc. — ver `context` do change).
- Cada componente React tem um `Componente.module.css` colado ao lado, que
  só referencia tokens via `var(--token)` — nenhum hex/px literal.
- Nenhum `style={{...}}` inline, exceto para passar um valor calculado em
  runtime como CSS custom property (ex.: altura do medidor de nível,
  posição vertical do fader), sempre consumido por uma regra no
  `.module.css` correspondente — nunca setando a propriedade CSS
  diretamente inline.
- Ícones: Material Symbols Rounded via o mesmo link do Google Fonts usado
  na referência, para fidelidade visual sem adicionar lib de ícones.

### Fase 1 (interface) antes da Fase 2 (funcionalidade)
Fase 1 constrói as duas telas completas usando dados mock em memória que já
seguem os tipos reais (`Track`, `Channel`, estado de playback) — sem
parsing de zip, sem IndexedDB, sem grafo de Web Audio real (o transporte
pode rodar com um timer simples só para a UI reagir). Fase 2 substitui as
implementações mock pelas reais (JSZip, IndexedDB, Web Audio) atrás das
mesmas interfaces/tipos, sem alterar a UI. Isso está refletido diretamente
na ordem de `tasks.md`.

## Risks / Trade-offs

- **[Risco]** Agendar o início de todos os `AudioBufferSourceNode` tem uma
  janela mínima de latência entre "usuário clica play" e o som começar →
  **Mitigação**: agendar todos os canais para o mesmo `currentTime +
  epsilon` num único laço síncrono (não sequencialmente um após o outro),
  mantendo a diferença entre canais na casa de microssegundos, inaudível.
- **[Risco]** Zips grandes (muitos canais longos) podem travar a thread
  principal ao decodificar tudo de uma vez → **Mitigação**: decodificar os
  canais em paralelo (`Promise.all`) e manter o estado de progresso já
  especificado em `track-library`; mover a decodificação para um Web
  Worker fica como melhoria futura, não necessária para o volume esperado
  de uso (ensaios de uma banda/igreja, não centenas de tracks simultâneas).
- **[Risco]** Cota de armazenamento do IndexedDB pode ser excedida com
  muitas tracks grandes → **Mitigação**: expor erro claro na escrita e
  contar com a exclusão de tracks (já especificada); gestão automática de
  cota fica fora do MVP.
- **[Risco]** Navegadores suspendem o `AudioContext` até um gesto do
  usuário → **Mitigação**: criar/retomar o `AudioContext` dentro do próprio
  handler de clique do botão de play, que já é um gesto do usuário.
- **[Risco]** Construir a Fase 1 com dados mock pode gerar retrabalho se o
  formato dos dados mock não bater com o real → **Mitigação**: definir os
  tipos TypeScript de `Track`/`Channel`/estado de playback já na Fase 1,
  compatíveis com o formato real da Fase 2; só a fonte dos dados muda.

## Migration Plan

Não se aplica — bootstrap de projeto novo, sem usuários ou dados
existentes para migrar. "Deploy" nesta fase é rodar `yarn dev`
localmente; nenhuma etapa de rollout é necessária para uma primeira versão.
