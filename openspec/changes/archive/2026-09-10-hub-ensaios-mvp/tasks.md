## 1. Bootstrap do projeto

- [x] 1.1 Criar o projeto com o template `react-ts` do Vite dentro de `tracks-gambira`, instalar dependências, e verificar que `yarn dev` sobe sem erros no console
- [x] 1.2 Criar a estrutura de pastas `src/components`, `src/screens`, `src/styles`, `src/lib`, `src/types` e verificar que o build (`yarn build`) continua passando
- [x] 1.3 Adicionar no `index.html` o link do Google Fonts usado na referência (Roboto, Roboto Mono, Material Symbols Rounded) e confirmar visualmente que os ícones/fontes carregam
- [x] 1.4 Criar `src/styles/tokens.css` com todos os tokens de tema descritos no design (cores, fontes, tamanhos de fonte, espaçamento, raios, sombra/easing) e importar globalmente; verificar no devtools que as CSS custom properties aparecem no `:root`

## 2. Tipos e dados mock compartilhados

- [x] 2.1 Definir em `src/types` os tipos `Track`, `Channel` e o estado de playback (`ChannelPlaybackState`, `TransportState`) que serão usados tanto pela Fase 1 (mock) quanto pela Fase 2 (dados reais)
- [x] 2.2 Criar um dataset mock em `src/lib/mock` com 2-3 tracks fake (4-6 canais cada, nomes tipo "Bateria", "Baixo", "Voz"), usado apenas na Fase 1

## 3. Design system — componentes de UI reutilizáveis

- [x] 3.1 Criar componente `Button` (variantes primary/ghost, formato pill) com `Button.module.css`, sem nenhum estilo inline, consumindo só tokens via `var(--token)`
- [x] 3.2 Criar componente `Badge` (pill pequena, mono, cor por categoria) com `Badge.module.css`
- [x] 3.3 Criar componente `Card` (painel glass: fundo translúcido, borda, raio grande, blur) com `Card.module.css`
- [x] 3.4 Criar o `AppShell` (layout raiz com a navbar pill flutuante fixa no topo, blur/translúcida) com `AppShell.module.css` — verificação visual final na revisão da Fase 6

## 4. Tela de biblioteca (Fase 1 — UI com dados mock, sem funcionalidade real)

- [x] 4.1 Criar a tela `TrackLibrary` listando as tracks do dataset mock em cards (nome, contagem de canais, data), mais recente primeiro
- [x] 4.2 Implementar o estado vazio da biblioteca (mensagem convidando a importar) e verificar renderizando com um dataset mock vazio
- [x] 4.3 Criar a área/botão de "Importar track" que abre o seletor de arquivo do navegador; na Fase 1 a seleção não faz parsing real, apenas confirma visualmente a interação (placeholder a ser religado na Fase 2, tarefa 8.3)
- [x] 4.4 Implementar a navegação (roteamento real com `react-router-dom`: `/` e `/tracks/:trackId`) para abrir o player ao selecionar uma track da lista — verificado deep-link/reload direto na URL do player e botão voltar

## 5. Tela do player (Fase 1 — UI com dados mock, sem áudio real)

- [x] 5.1 Criar o componente `ChannelStrip` (fader vertical, mute, solo, nome do canal, medidor de nível) inspirado nas classes `.st`/`.fad`/`.cap`/`.meter` da referência, com `ChannelStrip.module.css`; valores dinâmicos (posição do fader, altura do medidor) via CSS custom property, nunca `style` solto
- [x] 5.2 Criar o layout da tela `Player` renderizando um `ChannelStrip` por canal mock da track aberta
- [x] 5.3 Criar o componente de transporte (play/pause, seek bar, tempo decorrido/total, volume master) ligado a um timer simples só para a UI reagir (sem áudio real ainda)
- [x] 5.4 Implementar o estado local de mute/solo/volume por canal na tela do player e refletir visualmente nos `ChannelStrip`s correspondentes (toggle/drag funcionam na UI, ainda sem afetar áudio) — verificado no browser: mute apaga o medidor do canal imediatamente

## 6. Revisão visual da Fase 1

- [x] 6.1 Rodar o app no navegador e comparar biblioteca e player lado a lado com `https://ibn-manancial-sound.vercel.app/` (cores, tipografia, glass, navbar pill, badges); ajustada a velocidade da animação do medidor de nível (feedback do usuário: sensação de lag)
- [x] 6.2 Testar as duas telas em viewport estreito (mobile 375px) e confirmar que não há overflow horizontal e que a navbar/grades reflowam como especificado em `design-system`

## 7. Parsing de zip (Fase 2 — funcionalidade real)

- [x] 7.1 Adicionar a dependência `jszip` ao projeto
- [x] 7.2 Implementar em `src/lib` o módulo de importação: recebe um `File`, valida que é um `.zip`, extrai as entradas e filtra apenas arquivos de áudio suportados; verificado no browser com um zip real contendo um `.txt` — ignorado sem falhar o import (só os 2 arquivos de áudio viraram canais)
- [x] 7.3 Implementar a derivação do nome do canal a partir do nome do arquivo (sem extensão) e verificar com um caso de teste (`Bateria.wav` → `"Bateria"`) — confirmado no teste end-to-end
- [x] 7.4 Implementar e exibir na UI as mensagens de erro para "arquivo não é zip" e "zip sem áudio", sem criar track nesses casos — verificado no browser com fixtures reais (`ZipImportError` com reason `not-a-zip`/`no-audio-files`)

## 8. Persistência local (Fase 2)

- [x] 8.1 Adicionar a dependência `idb`
- [x] 8.2 Criar o wrapper de IndexedDB em `src/lib` com os object stores `tracks` e `channels` e as funções create/list/get/delete; verificado no console do navegador que os dados persistem entre reloads
- [x] 8.3 Religar o botão de importar (tarefa 4.3) ao módulo de parsing (7.x) e ao wrapper de IndexedDB (8.2), gravando a track e seus canais ao final da extração, com o estado de loading visível na UI durante o processo
- [x] 8.4 Substituir o dataset mock da `TrackLibrary` (4.1) pela leitura real do IndexedDB, ordenada por data de importação decrescente
- [x] 8.5 Implementar a exclusão de track (remove as entradas de `tracks` e `channels` correspondentes do IndexedDB) e refletir a remoção na lista imediatamente — verificado: 2 canais + 1 track removidos juntos
- [x] 8.6 Verificar a persistência fim a fim: importar uma track, recarregar a página, confirmar que ela ainda aparece na biblioteca e pode ser aberta sem re-upload — confirmado com zip real (2 canais, duração 0:03)

## 9. Engine de áudio sincronizada (Fase 2)

- [x] 9.1 Implementar o `PlayerEngine`: cria o `AudioContext` e decodifica em paralelo (`Promise.all`) os blobs dos canais da track aberta para `AudioBuffer`
- [x] 9.2 Implementar play/pause: cria um `AudioBufferSourceNode` por canal a partir do buffer decodificado, ligado ao `GainNode` do canal → `GainNode` mestre → `destination`, todos agendados no mesmo `audioContext.currentTime + epsilon`; verificado no browser com zip real de 3 canais (8s) — tempo avança corretamente e para sozinho no fim
- [x] 9.3 Implementar seek: recalcula o offset e reagenda todos os `AudioBufferSourceNode`s no mesmo instante, preservando o estado tocando/pausado — testado tocando e pausado
- [x] 9.4 Ligar o volume por canal (fader do `ChannelStrip`) ao `GainNode` do canal, aplicado em tempo real durante a reprodução
- [x] 9.5 Implementar a função de ganho efetivo (mute/solo/volume) e reaplicá-la a todos os canais sempre que qualquer canal mudar de estado — verificado no browser: solo em "Voz" silenciou Bateria/Baixo (medidores planos), limpar o solo trouxe os 3 de volta
- [x] 9.6 Ligar o volume master do transporte a um `GainNode` mestre entre os canais e o `destination`
- [x] 9.7 Adicionar um `AnalyserNode` por canal e um loop de `requestAnimationFrame` que atualiza a CSS custom property do medidor de nível de cada `ChannelStrip` em tempo real — verificado visualmente com áudio real tocando
- [x] 9.8 Ligar a exibição de tempo decorrido/total do transporte a `audioContext.currentTime`, atualizando pelo menos uma vez por segundo e nunca excedendo a duração total
- [x] 9.9 Implementar a parada de todos os sources ao sair da tela do player (cleanup no unmount do componente) — `PlayerEngine.destroy()` no cleanup do `useEffect`; corrigido também o medidor para zerar ao pausar/terminar (ficava "fantasma" com o último valor)

## 10. Integração final e verificação end-to-end

- [x] 10.1 Substituir o timer mock do transporte (5.3) pelo estado real do `PlayerEngine` (9.x), mantendo a mesma UI da Fase 1
- [x] 10.2 Teste manual completo: importar um `.zip` real com 2+ arquivos de áudio, abrir a track, dar play, mutar um canal, soloar outro, ajustar volume de canal e master, buscar (seek) durante a reprodução, e confirmar sincronismo até o fim da faixa — verificado no browser (play/pause/seek/solo/mute com áudio real) e confirmado pelo usuário testando localmente
- [x] 10.3 Testar a exclusão de uma track e a reimportação de um novo zip, confirmando que a biblioteca reflete corretamente os dois casos — exclusão verificada via IndexedDB (track + canais removidos juntos); reimportação verificada com dois zips diferentes
- [x] 10.4 Revisar o app inteiro contra os cenários das specs `design-system`, `track-library` e `channel-player` — sem divergências pendentes; MVP aprovado pelo usuário em teste próprio
