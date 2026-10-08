import tickUrl from '../assets/sounds/tick.wav'
import goUrl from '../assets/sounds/go.wav'
import restUrl from '../assets/sounds/rest.wav'
import roundUrl from '../assets/sounds/round.wav'
import completeUrl from '../assets/sounds/complete.wav'
import warningUrl from '../assets/sounds/warning.wav'

const SOURCES = {
  tick: tickUrl,
  go: goUrl,
  rest: restUrl,
  round: roundUrl,
  complete: completeUrl,
  warning: warningUrl,
}

/** Ganancia por encima de 1 = más fuerte que el volumen nativo del <audio>. */
const GAIN_BOOST = 3.2

const bufferCache = new Map()
let audioCtx = null
let unlocked = false

function obtenerContexto() {
  if (audioCtx) return audioCtx
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  audioCtx = new Ctx()
  return audioCtx
}

async function cargarBuffer(nombre) {
  if (bufferCache.has(nombre)) return bufferCache.get(nombre)
  const src = SOURCES[nombre]
  if (!src) return null
  const ctx = obtenerContexto()
  if (!ctx) return null

  const response = await fetch(src, { cache: 'force-cache' })
  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
  bufferCache.set(nombre, audioBuffer)
  return audioBuffer
}

/** Precarga sonidos (llamar al abrir el modal). */
export function precargarSonidosCronometro() {
  const ctx = obtenerContexto()
  if (!ctx) return
  Object.keys(SOURCES).forEach((nombre) => {
    cargarBuffer(nombre).catch(() => {})
  })
}

/**
 * Algunos navegadores móviles bloquean audio hasta un gesto.
 * Llamar desde el botón Iniciar.
 */
export async function desbloquearAudioCronometro() {
  const ctx = obtenerContexto()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    // Click silencioso para desbloquear la ruta de audio
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
    await Promise.all(
      Object.keys(SOURCES).map((nombre) =>
        cargarBuffer(nombre).catch(() => null),
      ),
    )
    unlocked = true
  } catch {
    /* ignore */
  }
}

export function reproducirSonidoCronometro(nombre) {
  const ctx = obtenerContexto()
  if (!ctx) {
    // Fallback HTMLAudio a volumen máximo
    const audio = new Audio(SOURCES[nombre])
    audio.volume = 1
    audio.play().catch(() => {})
    return
  }

  const play = async () => {
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      const buffer = await cargarBuffer(nombre)
      if (!buffer) return

      const source = ctx.createBufferSource()
      source.buffer = buffer

      const gain = ctx.createGain()
      // Boost fuerte; el soft-clip del navegador evita distorsión extrema
      gain.gain.value = GAIN_BOOST

      source.connect(gain)
      gain.connect(ctx.destination)
      source.start(0)
      unlocked = true
    } catch {
      const audio = new Audio(SOURCES[nombre])
      audio.volume = 1
      audio.play().catch(() => {})
    }
  }

  play()
}

export function sonidosCronometroDesbloqueados() {
  return unlocked
}
