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

const cache = new Map()
let unlocked = false

function obtenerAudio(nombre) {
  const src = SOURCES[nombre]
  if (!src) return null
  let audio = cache.get(nombre)
  if (!audio) {
    audio = new Audio(src)
    audio.preload = 'auto'
    cache.set(nombre, audio)
  }
  return audio
}

/** Precarga sonidos (llamar al abrir el modal). */
export function precargarSonidosCronometro() {
  Object.keys(SOURCES).forEach((nombre) => {
    const audio = obtenerAudio(nombre)
    if (audio) {
      audio.load()
    }
  })
}

/**
 * Algunos navegadores móviles bloquean audio hasta un gesto.
 * Llamar desde el botón Iniciar.
 */
export async function desbloquearAudioCronometro() {
  if (unlocked) return
  try {
    const audio = obtenerAudio('tick')
    if (!audio) return
    audio.volume = 0.01
    await audio.play()
    audio.pause()
    audio.currentTime = 0
    audio.volume = 1
    unlocked = true
  } catch {
    /* ignore */
  }
}

export function reproducirSonidoCronometro(nombre) {
  const base = obtenerAudio(nombre)
  if (!base) return
  try {
    const nodo = base.cloneNode(true)
    nodo.volume = 1
    const playPromise = nodo.play()
    if (playPromise?.catch) {
      playPromise.catch(() => {})
    }
  } catch {
    /* ignore */
  }
}
