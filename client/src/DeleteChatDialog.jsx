import { useEffect, useRef, useState } from 'react'

export default function DeleteChatDialog({ chat, onConfirm, onClose }) {
  const dialog = useRef(null)
  const cancelButton = useRef(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const element = dialog.current
    element.showModal()
    cancelButton.current.focus()
    return () => element.close()
  }, [])

  async function confirm(event) {
    event.preventDefault()
    if (deleting) return
    setDeleting(true)
    setError('')
    try {
      await onConfirm(chat.id)
    } catch (error) {
      setError(error.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <dialog
      className="delete-dialog"
      aria-labelledby="delete-chat-heading"
      aria-describedby="delete-chat-description"
      ref={dialog}
      onCancel={event => {
        event.preventDefault()
        if (!deleting) onClose()
      }}
    >
      <form onSubmit={confirm}>
        <h2 id="delete-chat-heading">Delete chat?</h2>
        <p id="delete-chat-description">
          <strong>“{chat.title}”</strong> and its messages and attachments will be deleted.
        </p>
        {error && <p className="delete-error" role="alert">{error}</p>}
        <div className="delete-dialog-actions">
          <button className="subtle-button" type="button" ref={cancelButton} onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button className="primary danger-button" type="submit" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete chat'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
