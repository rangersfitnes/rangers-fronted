/**
 * Inicializa plugins nativos de Capacitor (solo en APK / iOS).
 * En el navegador no hace nada.
 */
export async function iniciarCapacitorApp() {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform()) return

    const [{ App }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
      import('@capacitor/app'),
      import('@capacitor/splash-screen'),
      import('@capacitor/status-bar'),
    ])

    try {
      await StatusBar.setStyle({ style: Style.Dark })
      await StatusBar.setBackgroundColor({ color: '#0a0a0a' })
    } catch {
      // Algunos dispositivos no soportan status bar
    }

    // Botón atrás de Android: navega historial; si no hay, minimiza.
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) {
        window.history.back()
      } else {
        App.minimizeApp()
      }
    })

    await SplashScreen.hide().catch(() => {})
  } catch (err) {
    console.warn('[capacitor] No se pudo iniciar capa nativa:', err?.message || err)
  }
}
