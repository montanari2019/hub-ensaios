import { Gain, PitchShift, setContext as setToneContext } from 'tone'

export interface EngineChannelInput {
  id: string
  blob: Blob
  /** Se false, o canal nunca recebe pitch-shift (ex.: bateria, click). */
  pitchEditable: boolean
}

interface ChannelNode {
  buffer: AudioBuffer
  gainNode: GainNode
  analyserNode: AnalyserNode
  levelBuffer: Uint8Array<ArrayBuffer>
  source: AudioBufferSourceNode | null
  /** null nos canais não-editáveis — nunca passam pelo nó de pitch-shift. */
  pitchShift: PitchShift | null
  /**
   * Adaptador nativo->Tone: `Gain.input` é sempre o `GainNode` nativo por
   * trás dele (não outro wrapper do Tone), então plugamos o
   * AudioBufferSourceNode nativo ali sem depender de nenhuma função de
   * interop entre bundles — evita o esbuild/Vite pré-empacotar `tone` e um
   * import "profundo" dele em dois chunks diferentes, o que quebraria os
   * `instanceof` internos do Tone usados pra resolver a conexão.
   */
  pitchShiftInput: Gain | null
}

/** Folga entre "agendar" e "tocar" pra dar tempo de agendar todos os canais no mesmo instante. */
const START_EPSILON = 0.05
/** Constante de tempo do ramp de ganho, curta o bastante pra não soar como lag, mas sem clique. */
const GAIN_RAMP_SECONDS = 0.01

/**
 * Orquestra a reprodução multicanal sincronizada via Web Audio API.
 * Um AudioBufferSourceNode é de uso único — cada play()/seek() cria nós novos
 * a partir do AudioBuffer já decodificado, todos agendados para o mesmo
 * audioContext.currentTime, mantendo os canais em sample-accurate sync.
 */
export class PlayerEngine {
  private readonly audioContext: AudioContext
  private readonly masterGain: GainNode
  private readonly channels = new Map<string, ChannelNode>()

  private isPlaying = false
  /** Posição (em segundos) da track no instante em que o play atual começou. */
  private scheduledOffset = 0
  /** audioContext.currentTime que corresponde à posição `scheduledOffset`. */
  private scheduledContextTime = 0
  private endTimeoutId: number | null = null
  private onEndedCallback: (() => void) | null = null

  private constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    this.masterGain = audioContext.createGain()
    this.masterGain.connect(audioContext.destination)
  }

  static async create(channelInputs: EngineChannelInput[]): Promise<PlayerEngine> {
    const audioContext = new AudioContext()
    // Precisa vir antes de qualquer `new PitchShift(...)` — é o que faz os nós
    // do Tone usarem este AudioContext em vez de criar um próprio.
    setToneContext(audioContext)
    const engine = new PlayerEngine(audioContext)
    await engine.loadChannels(channelInputs)
    return engine
  }

  private async loadChannels(channelInputs: EngineChannelInput[]): Promise<void> {
    await Promise.all(
      channelInputs.map(async (input) => {
        const arrayBuffer = await input.blob.arrayBuffer()
        const buffer = await this.audioContext.decodeAudioData(arrayBuffer)

        const gainNode = this.audioContext.createGain()
        const analyserNode = this.audioContext.createAnalyser()
        analyserNode.fftSize = 256
        analyserNode.smoothingTimeConstant = 0.6

        // Canais não-editáveis nunca ganham o nó de pitch-shift — nem o custo
        // de processamento dele, nem qualquer chance de colorir o áudio.
        const pitchShift = input.pitchEditable ? new PitchShift(0) : null
        const pitchShiftInput = input.pitchEditable ? new Gain() : null
        if (pitchShift && pitchShiftInput) {
          pitchShiftInput.connect(pitchShift)
          pitchShift.connect(gainNode)
        }

        gainNode.connect(analyserNode)
        analyserNode.connect(this.masterGain)

        this.channels.set(input.id, {
          buffer,
          gainNode,
          analyserNode,
          levelBuffer: new Uint8Array(analyserNode.frequencyBinCount),
          source: null,
          pitchShift,
          pitchShiftInput,
        })
      }),
    )
  }

  getDuration(): number {
    let max = 0
    for (const channel of this.channels.values()) {
      max = Math.max(max, channel.buffer.duration)
    }
    return max
  }

  getCurrentTime(): number {
    if (!this.isPlaying) return this.scheduledOffset
    const elapsed = Math.max(0, this.audioContext.currentTime - this.scheduledContextTime)
    return Math.min(this.scheduledOffset + elapsed, this.getDuration())
  }

  /** Nível aproximado (0–1) do canal, lido do sinal já pós-ganho (silencia sozinho se mute/solo zerou o gain). */
  getChannelLevel(channelId: string): number {
    const channel = this.channels.get(channelId)
    if (!channel) return 0

    channel.analyserNode.getByteTimeDomainData(channel.levelBuffer)
    let sumSquares = 0
    for (let i = 0; i < channel.levelBuffer.length; i++) {
      const normalized = (channel.levelBuffer[i] - 128) / 128
      sumSquares += normalized * normalized
    }
    const rms = Math.sqrt(sumSquares / channel.levelBuffer.length)
    return Math.min(1, rms * 4)
  }

  get playing(): boolean {
    return this.isPlaying
  }

  play(): void {
    if (this.isPlaying) return
    this.isPlaying = true
    this.scheduleAllSources(this.scheduledOffset)
  }

  pause(): void {
    if (!this.isPlaying) return
    this.scheduledOffset = this.getCurrentTime()
    this.isPlaying = false
    this.stopAllSources()
  }

  seek(timeSeconds: number): void {
    const clamped = Math.max(0, Math.min(timeSeconds, this.getDuration()))
    this.scheduledOffset = clamped
    if (this.isPlaying) {
      this.stopAllSources()
      this.scheduleAllSources(clamped)
    }
  }

  setChannelGain(channelId: string, effectiveVolume: number): void {
    const channel = this.channels.get(channelId)
    if (!channel) return
    channel.gainNode.gain.setTargetAtTime(
      effectiveVolume,
      this.audioContext.currentTime,
      GAIN_RAMP_SECONDS,
    )
  }

  /**
   * Pitch-shift ao vivo de um canal, em semitons. Usa `Tone.PitchShift`
   * (técnica de delay granular), que reamostra só o pitch — a duração do
   * `AudioBufferSourceNode` nunca muda, então o agendamento sample-accurate
   * existente (`scheduleAllSources`) continua correto e os canais nunca
   * saem de sincronia entre si, transpostos ou não. No-op em canais sem
   * `pitchEditable` (nunca ganharam o nó de pitch-shift).
   */
  setChannelPitch(channelId: string, semitones: number): void {
    const channel = this.channels.get(channelId)
    if (!channel?.pitchShift) return
    channel.pitchShift.pitch = semitones
  }

  setMasterVolume(volume: number): void {
    this.masterGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, GAIN_RAMP_SECONDS)
  }

  onEnded(callback: () => void): void {
    this.onEndedCallback = callback
  }

  destroy(): void {
    this.stopAllSources()
    for (const channel of this.channels.values()) {
      channel.pitchShift?.dispose()
      channel.pitchShiftInput?.dispose()
    }
    this.masterGain.disconnect()
    void this.audioContext.close().catch(() => {
      // já fechado, ignora
    })
  }

  private scheduleAllSources(offsetSeconds: number): void {
    const startAt = this.audioContext.currentTime + START_EPSILON
    this.scheduledContextTime = startAt
    this.scheduledOffset = offsetSeconds

    for (const channel of this.channels.values()) {
      if (offsetSeconds >= channel.buffer.duration) continue

      const source = this.audioContext.createBufferSource()
      source.buffer = channel.buffer
      if (channel.pitchShiftInput) {
        source.connect(channel.pitchShiftInput.input as unknown as AudioNode)
      } else {
        source.connect(channel.gainNode)
      }
      source.start(startAt, offsetSeconds)
      channel.source = source
    }

    const remaining = Math.max(0, this.getDuration() - offsetSeconds)
    this.scheduleEnd(remaining)
  }

  private scheduleEnd(remainingSeconds: number): void {
    if (this.endTimeoutId !== null) {
      window.clearTimeout(this.endTimeoutId)
    }
    this.endTimeoutId = window.setTimeout(() => {
      this.isPlaying = false
      this.scheduledOffset = 0
      this.stopAllSources()
      this.onEndedCallback?.()
    }, remainingSeconds * 1000)
  }

  private stopAllSources(): void {
    if (this.endTimeoutId !== null) {
      window.clearTimeout(this.endTimeoutId)
      this.endTimeoutId = null
    }
    for (const channel of this.channels.values()) {
      if (!channel.source) continue
      channel.source.onended = null
      try {
        channel.source.stop()
      } catch {
        // já parado, ignora
      }
      channel.source.disconnect()
      channel.source = null
    }
  }
}
