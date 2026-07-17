import { lazy } from 'react'

const CHUNK_RELOAD_KEY = 'apex:chunk-reload-at'
const RELOAD_COOLDOWN_MS = 30000

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Loading chunk .* failed/i,
  /Expected a JavaScript module script/i,
]

export const isChunkLoadError = (error) => {
  const message = String(error?.message || error || '')
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export const recoverFromChunkLoadError = (error) => {
  if (!isChunkLoadError(error) || typeof window === 'undefined') {
    return false
  }

  const lastReloadAt = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
  const now = Date.now()

  if (now - lastReloadAt < RELOAD_COOLDOWN_MS) {
    return false
  }

  window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
  window.location.reload()
  return true
}

export const lazyWithChunkRecovery = (importer) =>
  lazy(async () => {
    try {
      return await importer()
    } catch (error) {
      if (recoverFromChunkLoadError(error)) {
        return new Promise(() => {})
      }

      throw error
    }
  })

export const installChunkLoadRecovery = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.addEventListener('vite:preloadError', (event) => {
    if (recoverFromChunkLoadError(event?.payload)) {
      event.preventDefault()
    }
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (recoverFromChunkLoadError(event.reason)) {
      event.preventDefault()
    }
  })

  window.addEventListener(
    'error',
    (event) => {
      if (recoverFromChunkLoadError(event.error || event.message)) {
        event.preventDefault()
      }
    },
    true,
  )
}
