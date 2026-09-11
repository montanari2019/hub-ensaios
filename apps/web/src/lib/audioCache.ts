const CACHE_NAME = 'hub-ensaios-audio-v1'

// Chave sintética de cache — nunca é buscada de verdade, só serve como
// identidade estável pro Cache Storage (que indexa por Request/URL).
// Precisa ser estável por canal porque a URL assinada real muda a cada
// GET /tracks/:id (ver design.md do change player-loading-and-cache).
function cacheKey(channelId: string): string {
  return `https://hub-ensaios-cache.local/channel/${channelId}`
}

export async function getCachedChannelAudio(channelId: string): Promise<Blob | null> {
  try {
    const cache = await caches.open(CACHE_NAME)
    const match = await cache.match(cacheKey(channelId))
    if (!match) return null
    return await match.blob()
  } catch {
    // Cache Storage indisponível (ex.: contexto não-seguro) — segue sem cache.
    return null
  }
}

export async function cacheChannelAudio(channelId: string, blob: Blob): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(cacheKey(channelId), new Response(blob))
  } catch {
    // Quota estourada ou Cache Storage indisponível — não é crítico,
    // só significa que o canal será baixado de novo na próxima vez.
  }
}
