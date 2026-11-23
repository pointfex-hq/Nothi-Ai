import { useState } from 'react'
import { ArrowRight, UserRound } from 'lucide-react'
import { jsonRequest, request } from './chat-api.js'

export default function AuthForm({ onAuthenticated }) {
  const [registering, setRegistering] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (submitting) return
    const credentials = Object.fromEntries(new FormData(event.currentTarget))
    const endpoint = registering ? '/api/auth/register' : '/api/auth/sign-in'
    setError('')
    setSubmitting(true)
    try {
      const { user } = await request(endpoint, jsonRequest('POST', credentials))
      onAuthenticated(user)
    } catch (error) {
      setError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-card" aria-labelledby="auth-heading">
      <div className="auth-mark"><UserRound size={24} aria-hidden="true" /></div>
      <h2 id="auth-heading">{registering ? 'Create an account' : 'Sign in'}</h2>
      <p>{registering ? 'Choose a username and password for this local app.' : 'Open your own chats and attachments.'}</p>
      <form onSubmit={submit} className="auth-form">
        <label htmlFor="auth-username">Username</label>
        <input id="auth-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={32} required disabled={submitting} />
        <label htmlFor="auth-password">Password</label>
        <input
          key={String(registering)}
          id="auth-password"
          name="password"
          type="password"
          autoComplete={registering ? 'new-password' : 'current-password'}
          minLength={8}
          maxLength={128}
          aria-describedby={registering ? 'password-help' : undefined}
          required
          disabled={submitting}
        />
        {registering && <p id="password-help" className="auth-help">Use at least 8 characters.</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="primary auth-submit" disabled={submitting}>
          {submitting ? (registering ? 'Creating account…' : 'Signing in…') : (registering ? 'Create account' : 'Sign in')}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </form>
      <div className="auth-alternate">
        <span>{registering ? 'Already have an account?' : 'New to Nothi AI?'}</span>
        <button type="button" className="subtle-button" disabled={submitting} onClick={() => {
          setRegistering(value => !value)
          setError('')
        }}>
          {registering ? 'Sign in' : 'Create an account'}
        </button>
      </div>
    </section>
  )
}
