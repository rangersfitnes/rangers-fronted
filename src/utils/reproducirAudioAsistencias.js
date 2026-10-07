const GANANCIA_DEFAULT = 2.8

async function reproducirHtmlAudio(src) {
  const audio = new Audio(src)
  audio.volume = 1
  await audio.play()
  await new Promise((resolve) => {
    audio.addEventListener('ended', resolve, { once: true })
    audio.addEventListener('error', resolve, { once: true })
  })
}

/**
 * Reproduce un MP3 a volumen alto (gain > 1 vía Web Audio API).
 * Si CORS/Storage bloquea el boost, hace fallback a volumen máximo del elemento.
 */
export async function reproducirAudioAsistencias(
  url,
  { ganancia = GANANCIA_DEFAULT } = {},
) {
  const src = String(url || '').trim()
  if (!src) {
    throw new Error('No hay audio de recordatorio configurado')
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) {
    await reproducirHtmlAudio(src)
    return
  }

  try {
    const ctx = new AudioCtx()
    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audio.preload = 'auto'
    audio.src = src

    const source = ctx.createMediaElementSource(audio)
    const gainNode = ctx.createGain()
    gainNode.gain.value = Math.min(
      Math.max(Number(ganancia) || GANANCIA_DEFAULT, 1),
      4,
    )
    source.connect(gainNode)
    gainNode.connect(ctx.destination)

    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    await new Promise((resolve, reject) => {
      const limpiar = () => {
        audio.removeEventListener('ended', onEnded)
        audio.removeEventListener('error', onError)
      }
      const onEnded = () => {
        limpiar()
        ctx.close().catch(() => {})
        resolve()
      }
      const onError = () => {
        limpiar()
        ctx.close().catch(() => {})
        reject(new Error('No se pudo reproducir el audio'))
      }
      audio.addEventListener('ended', onEnded)
      audio.addEventListener('error', onError)
      audio.play().catch((err) => {
        limpiar()
        ctx.close().catch(() => {})
        reject(err)
      })
    })
  } catch {
    await reproducirHtmlAudio(src)
  }
}
