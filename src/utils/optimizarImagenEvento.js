const MAX_BYTES = 7 * 1024 * 1024
const MAX_LADO = 2000

/**
 * Reduce imágenes pesadas o muy grandes antes de subirlas al backend.
 */
export async function optimizarImagenEvento(file) {
  if (!file) return null

  const tipo = (file.type || '').toLowerCase()
  const esRasterComun =
    tipo === 'image/jpeg' ||
    tipo === 'image/jpg' ||
    tipo === 'image/png' ||
    tipo === 'image/webp'

  if (
    esRasterComun &&
    file.size <= 2 * 1024 * 1024 &&
    file.size <= MAX_BYTES
  ) {
    return file
  }

  if (!esRasterComun && tipo !== 'image/heic' && tipo !== 'image/heif') {
    throw new Error('Formato no soportado. Usa JPG, PNG o WebP.')
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)

      let ancho = img.naturalWidth || img.width
      let alto = img.naturalHeight || img.height

      if (!ancho || !alto) {
        reject(new Error('No se pudo leer el tamaño de la imagen'))
        return
      }

      const escala = Math.min(1, MAX_LADO / Math.max(ancho, alto))
      ancho = Math.max(1, Math.round(ancho * escala))
      alto = Math.max(1, Math.round(alto * escala))

      const canvas = document.createElement('canvas')
      canvas.width = ancho
      canvas.height = alto

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo preparar la imagen'))
        return
      }

      ctx.drawImage(img, 0, 0, ancho, alto)

      const intentarCalidad = (calidad) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('No se pudo comprimir la imagen'))
              return
            }

            if (blob.size > MAX_BYTES && calidad > 0.5) {
              intentarCalidad(calidad - 0.12)
              return
            }

            if (blob.size > MAX_BYTES) {
              reject(
                new Error(
                  'La imagen sigue siendo muy pesada. Prueba con otra más pequeña (máx. 8 MB).',
                ),
              )
              return
            }

            const base =
              file.name?.replace(/\.[^.]+$/i, '')?.trim() || 'banner-evento'
            resolve(
              new File([blob], `${base}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }),
            )
          },
          'image/jpeg',
          calidad,
        )
      }

      intentarCalidad(0.85)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(
        new Error(
          'No se pudo abrir la imagen en el navegador. Exporta el archivo como JPG o PNG.',
        ),
      )
    }

    img.src = url
  })
}
