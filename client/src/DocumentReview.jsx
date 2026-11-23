import { useEffect, useRef, useState } from 'react'
import { FileText, X } from 'lucide-react'

export default function DocumentReview({ document, pageNumber, hasMessages, onSave, onClose }) {
  const dialog = useRef(null)
  const targetPage = useRef(null)
  const isPhoto = document.kind === 'photo'
  const [text, setText] = useState(isPhoto ? document.pages[0].text : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const element = dialog.current
    element.showModal()
    targetPage.current?.scrollIntoView({ block: 'start' })
    return () => element.close()
  }, [])

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(text)
      onClose()
    } catch (error) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      className="review-dialog"
      ref={dialog}
      aria-labelledby="review-title"
      onCancel={event => {
        event.preventDefault()
        if (!saving) onClose()
      }}
    >
      <header className="review-header">
        <div>
          <h2 id="review-title"><FileText size={20} aria-hidden="true" /> Extracted text</h2>
          <p>{document.name}</p>
        </div>
        <button type="button" className="icon-button" aria-label="Close preview" onClick={onClose} disabled={saving}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      {isPhoto ? (
        <form className="review-body photo-edit" onSubmit={save}>
          <label htmlFor="review-photo">Review photo text (page 1)</label>
          <textarea id="review-photo" value={text} onChange={event => setText(event.target.value)} rows={10} dir="auto" disabled={saving} />
          {hasMessages && <p>Saving changes clears questions and answers about your files.</p>}
          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="primary" type="submit" disabled={saving || !text.trim() || text.trim() === document.pages[0].text}>
            {saving ? 'Saving…' : 'Save text'}
          </button>
        </form>
      ) : (
        <div className="review-body">
          {document.pages.map(page => (
            <section className="review-page" key={page.pageNumber} ref={page.pageNumber === pageNumber ? targetPage : null}>
              <h3>Page {page.pageNumber}</h3>
              <p dir="auto">{page.text || 'No selectable text on this page.'}</p>
            </section>
          ))}
        </div>
      )}
    </dialog>
  )
}
