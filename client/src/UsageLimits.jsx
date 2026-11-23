import { useEffect, useState } from 'react'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { jsonRequest, request } from './chat-api.js'

const endpoint = '/api/admin/usage-limits'
const fields = [
  ['questionsPerMinute', 'Questions per rolling minute'],
  ['questionsPerDay', 'Questions per UTC day'],
  ['maxOutputTokens', 'Maximum output tokens per answer'],
  ['dailyTokenBudget', 'Daily tokens per user'],
]

export default function UsageLimits({ onBack }) {
  const [values, setValues] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    request(endpoint, { signal: controller.signal }).then(limits => {
      if (!controller.signal.aborted) setValues(limits)
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.message)
    })
    return () => controller.abort()
  }, [attempt])

  async function save(event) {
    event.preventDefault()
    if (saving) return
    const limits = Object.fromEntries(fields.map(([name]) => [name, Number(values[name])]))
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      setValues(await request(endpoint, jsonRequest('PUT', limits)))
      setSaved(true)
    } catch (error) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="usage-limits" aria-labelledby="usage-limits-title">
      <div className="content-width usage-limits-content">
        <button className="subtle-button usage-back" type="button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to chats
        </button>
        <div className="usage-limits-card">
          <h2 id="usage-limits-title"><SlidersHorizontal size={23} aria-hidden="true" /> Usage limits</h2>
          <p>Limits apply to each account. Daily counters reset at midnight UTC.</p>
          {values ? (
            <form className="usage-limits-form" onSubmit={save}>
              <div className="usage-limits-fields">
                {fields.map(([name, label]) => (
                  <div className="usage-limit-field" key={name}>
                    <label htmlFor={name}>{label}</label>
                    <input
                      id={name}
                      type="number"
                      min="1"
                      step="1"
                      max={Number.MAX_SAFE_INTEGER}
                      value={values[name]}
                      required
                      disabled={saving}
                      onChange={event => {
                        setValues({ ...values, [name]: event.target.value })
                        setSaved(false)
                        setError('')
                      }}
                    />
                  </div>
                ))}
              </div>
              {error && <p className="usage-limits-error" role="alert">{error}</p>}
              <div className="usage-limits-actions">
                <button className="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save limits'}
                </button>
                {saved && <p role="status">Limits saved. They apply to the next question.</p>}
              </div>
            </form>
          ) : error ? (
            <div className="usage-limits-load">
              <p className="usage-limits-error" role="alert">{error}</p>
              <button className="subtle-button" type="button" onClick={() => {
                setError('')
                setAttempt(value => value + 1)
              }}>Try again</button>
            </div>
          ) : <p className="usage-limits-load" role="status">Loading usage limits…</p>}
        </div>
      </div>
    </section>
  )
}
