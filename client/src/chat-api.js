export const sessionRequired = 'nothi-session-required'

export async function request(url, options) {
  let response
  try {
    response = await fetch(url, options)
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Could not reach Nothi AI. Check that Express is running and try again.', { cause: error })
  }

  const body = await response.json().catch(() => null)
  if (!response.ok || body === null) {
    if (!response.ok && response.status === 401 && !url.startsWith('/api/auth/')) {
      window.dispatchEvent(new Event(sessionRequired))
    }
    let message = body?.error || 'The request could not be completed. Try again.'
    const resetAt = response.status === 429 ? Date.parse(body?.resetAt) : NaN
    if (Number.isFinite(resetAt)) {
      const resetTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(resetAt)
      message += ' Your limit resets on ' + resetTime + '.'
    }
    const error = new Error(message)
    error.chat = body?.chat
    throw error
  }
  return body
}

export function jsonRequest(method, data) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }
}
