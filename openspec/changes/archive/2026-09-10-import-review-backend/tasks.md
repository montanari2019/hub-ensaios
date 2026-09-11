## 1. Monorepo scaffold

- [x] 1.1 Criar `package.json` na raiz com `"private": true` e `"workspaces": ["apps/*"]`, e mover todo o conteúdo atual do frontend (src/, index.html, vite.config.ts, tsconfig*.json, package.json etc.) para `apps/web/`, ajustando o `name` do `apps/web/package.json` para `"web"`
- [x] 1.2 Rodar `yarn install` na raiz e verificar que `yarn workspace web dev` sobe o frontend exatamente como antes (mesma UI, biblioteca/player funcionando com os dados que já existiam no IndexedDB do navegador) — confirmado no browser, as 2 tracks de teste continuam lá
- [x] 1.3 Adicionar `concurrently` como devDependency da raiz e um script `dev` que sobe `apps/web` e `apps/api` juntos (o de `apps/api` pode falhar por enquanto, até a tarefa 2.1 existir)

## 2. Backend: bootstrap NestJS + TypeORM + SQLite

- [x] 2.1 Criar o projeto `apps/api` (NestJS, `"name": "api"` no package.json), com `yarn workspace api start:dev` subindo um servidor Nest mínimo escutando em `127.0.0.1` (não `0.0.0.0`) na porta 3001 — confirmado via `lsof` (`TCP localhost:3001 (LISTEN)`)
- [x] 2.2 Adicionar TypeORM + `better-sqlite3`, configurar o datasource apontando pra um arquivo `.sqlite` na raiz do projeto, e verificar que o backend sobe sem erro de conexão — `hub-de-ensaios.sqlite` criado em `tracks-gambira/` (raiz), não em `apps/api/`
- [x] 2.3 Criar as entidades `Track` (`id`, `name`, `bpm?`, `tonality?`) e `Channel` (`id`, `trackId`, `name`, `fileName`, `filePath`, `mimeType`, `order`, `durationSeconds`) com a relação `OneToMany`/`ManyToOne`, e verificar que a migration cria as tabelas ao rodar (`yarn migration:run`) — seguindo o padrão do template do usuário: sem `synchronize`, schema só por migration, `SnakeNamingStrategy` pra colunas snake_case. `importedAt` do frontend é servido a partir do `createdAt` da entidade, sem coluna duplicada
- [x] 2.4 Implementar a resolução do diretório `TRACKS_DIR` (env var com default pra `<raiz-do-monorepo>/tracks`) em `config/tracks-storage.config.ts`, e verificar que o caminho resolvido aponta pra `tracks/` na raiz, não dentro de `apps/api`

## 3. Backend: fluxo de importação com revisão

- [x] 3.1 Portar a lógica de parsing de zip (extração + whitelist de formatos de áudio + derivação de nome por arquivo) de `apps/web/src/lib/zip.ts` para um módulo equivalente em `apps/api` (`zip-import.helper.ts`), reaproveitando `jszip` no lado do Node
- [x] 3.2 Implementar `POST /tracks/import` (multipart): extrai o zip pra um diretório de staging temporário (`os.tmpdir()/hub-import-<importId>/`), mede a duração de cada canal (via `music-metadata`), e devolve `{ importId, suggestedName, channels: [...] }` sem gravar nada no banco/`tracks/` — verificado com `curl` + zip real: resposta correta, `GET /tracks` continua vazio depois
- [x] 3.3 Implementar `POST /tracks/import/:importId/confirm`: move os arquivos do staging pra `tracks/<trackId>/`, cria as linhas de `Track`/`Channel` numa transação, devolve a track criada — verificado com `curl`: nomes/BPM/tonalidade editados persistidos corretamente, arquivos batendo byte-a-byte com o original
- [x] 3.4 Implementar `POST /tracks/import/:importId/cancel`: apaga o diretório de staging — verificado: nenhum arquivo/track fica pra trás
- [x] 3.5 Implementar a varredura de staging órfão na subida do backend — verificado criando um diretório de staging com mtime de 2 dias atrás e confirmando no log (`Staging órfão removido`) que sumiu ao reiniciar
- [x] 3.6 Validar o campo BPM no `confirm` (rejeita valor não numérico com erro claro) e permitir bpm/tonality ausentes sem erro — verificado com `curl`: BPM não numérico rejeitado com 422 e mensagem clara

## 4. Backend: listagem, detalhe, áudio e exclusão

- [x] 4.1 Implementar `GET /tracks` (nome, contagem de canais, data de importação, duração, bpm, tonalidade, mais recente primeiro) — feito junto com o Grupo 3, verificado com `curl`
- [x] 4.2 Implementar `GET /tracks/:id` (detalhe + lista de canais ordenada por `order`) — feito junto com o Grupo 3
- [x] 4.3 Implementar `GET /tracks/:id/channels/:channelId/audio` servindo o arquivo de `filePath` com o `Content-Type` do `mimeType` salvo — verificado com `curl`: bytes idênticos (`cmp`) ao arquivo original, `Content-Type: audio/wav` correto
- [x] 4.4 Implementar `DELETE /tracks/:id`: remove as linhas de `Channel` e `Track` (cascade) e apaga a subpasta `tracks/<trackId>/` — verificado: pasta some do disco, `channels`/`tracks` zerados no SQLite

## 5. Frontend: cliente de API substituindo o IndexedDB

- [x] 5.1 Criar `apps/web/src/lib/api.ts` com funções tipadas para cada endpoint do backend (import, confirm, cancel, list, get, delete, URL do áudio de um canal)
- [x] 5.2 Configurar o proxy `/api` → `http://localhost:3001` em `apps/web/vite.config.ts`
- [x] 5.3 Remover `apps/web/src/lib/db.ts` (IndexedDB, junto com `zip.ts`/`importTrack.ts`/`audioDuration.ts`, todos obsoletos com o parsing migrado pro backend) e reescrever `TrackLibrary` para listar via `GET /tracks`, mostrando BPM/tonalidade quando presentes (badges extras ao lado das já existentes)
- [x] 5.4 Implementar o estado de erro da biblioteca quando o backend não responde (mensagem clara com botão "Tentar de novo" em vez de tela vazia), cobrindo o requisito de `local-backend`
- [x] 5.5 Reescrever a exclusão de track na `TrackLibrary` para chamar `DELETE /tracks/:id`

## 6. Frontend: tela de revisão da importação (`ImportReview`)

- [x] 6.1 Criar os componentes de formulário `TextField` e `NumberField` (`.module.css` próprio, estilo dark/glass consistente com os tokens, nenhum estilo inline) no design system compartilhado
- [x] 6.2 Criar a tela `ImportReview`, roteada em `/import/:importId`: recebe o preview do parsing (via state de navegação, ou refeito a partir de um novo endpoint `GET /tracks/import/:importId` no reload direto da URL), mostra o nome da track editável (`TextField`), um `TextField` por canal, e `NumberField`/`TextField` para BPM/tonalidade
- [x] 6.3 Ligar o botão "Importar track" da `TrackLibrary` para chamar `POST /tracks/import` e navegar para `/import/:importId` com o preview retornado, em vez de salvar direto
- [x] 6.4 Implementar os botões Confirmar (chama `/confirm` com os valores editados e navega pra `/tracks/:id` da track criada) e Cancelar (chama `/cancel` e volta pra biblioteca sem criar nada)
- [x] 6.5 Validar o campo BPM no frontend (`NumberField` tipo number, min 1 max 400) e permitir BPM/tonalidade em branco (enviados como `undefined`, não bloqueiam a confirmação)

## 7. Frontend: player consumindo áudio do backend

- [x] 7.1 Alterar `usePlayerEngine` para buscar a lista de canais de uma track via `GET /tracks/:id` em vez do IndexedDB
- [x] 7.2 Alterar o carregamento de áudio de cada canal para `fetch` na URL de `GET /tracks/:id/channels/:channelId/audio` (→ `Blob` → mesma decodificação de sempre dentro do `PlayerEngine`), mantendo o `PlayerEngine` em si sem nenhuma alteração — build limpo confirma
- [x] 7.3 Verificar no browser que play/pause/seek/mute/solo/volume/medidor de nível continuam funcionando exatamente como antes, agora com o áudio vindo do backend — testado end-to-end de verdade: importação real (upload → revisão com nome/BPM/tonalidade/nome de canal editados → confirmar) → player tocando os 3 canais com medidores animando, requisições `/api/tracks/.../audio` retornando 200. Console limpo numa aba nova. Corrigido de quebra um bug real: a API lia `process.env.PORT` (que o Vite também usa) e bindava na porta errada quando os dois processos sobem juntos via `concurrently` — troquei pra `API_PORT` dedicado

## 8. Verificação end-to-end

- [x] 8.1 Rodar `yarn dev` na raiz e confirmar que `apps/web` e `apps/api` sobem juntos com um comando só — corrigido o bug do `PORT` colidindo entre os dois processos (ver 7.3); confirmado no log `Hub de Ensaios API rodando em http://127.0.0.1:3001` num boot limpo
- [x] 8.2 Teste manual completo: importar um `.zip` real, editar o nome da track e de um canal na revisão, preencher BPM e tonalidade, confirmar, e verificar que a track aparece na biblioteca com esses dados — feito via UI de verdade (cliques/digitação reais), badges de BPM/tonalidade aparecendo corretamente
- [x] 8.3 Testar o cancelamento da revisão e confirmar que nenhum arquivo fica em `tracks/` nem em nenhuma pasta de staging — verificado via API (grupo 3); mecanismo é o mesmo usado pela tela
- [x] 8.4 Abrir a track importada e repetir o teste de reprodução completo (play, seek, mute, solo, volume, master, sincronismo até o fim) — verificado no browser com áudio real vindo do backend
- [x] 8.5 Reiniciar `apps/api` (matar e subir de novo) e confirmar que a track e seus áudios continuam acessíveis sem reimportar — verificado: track com nome/BPM/tonalidade editados reapareceu intacta numa aba nova após o restart
- [x] 8.6 Derrubar o backend com o frontend aberto e confirmar que a biblioteca mostra o estado de erro especificado em `local-backend`, em vez de travar ou ficar em branco — verificado: tela "Não foi possível falar com o backend" com botão "Tentar de novo", que recuperou corretamente ao religar a API
- [x] 8.7 Testar a exclusão de uma track pela UI e confirmar que a subpasta correspondente some de `tracks/` — verificado clicando o botão de exclusão de verdade na UI: pasta e linhas do banco removidas
- [x] 8.8 Revisar o app inteiro contra os cenários das specs `local-backend` e das partes modificadas de `track-library`/`design-system` — sem divergências encontradas; todos os cenários cobertos pelos testes acima
