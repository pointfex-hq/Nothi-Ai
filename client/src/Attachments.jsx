import { FileText, Image, LoaderCircle, X } from 'lucide-react'

const kinds = ['pdf', 'photo']

export default function Attachments({ attachments, uploads, busy, onReview, onReplace, onRemove }) {
  if (!kinds.some(kind => attachments[kind] || uploads[kind])) return null

  return (
    <ul className="attachment-list" aria-label="Attachments">
      {kinds.map(kind => {
        const attachment = attachments[kind]
        const upload = uploads[kind]
        const Icon = kind === 'pdf' ? FileText : Image

        return (attachment || upload) && (
          <li className="attachment-slot" key={kind}>
            {attachment && (
              <div className="attachment">
                <button type="button" className="attachment-preview" onClick={() => onReview(kind, 1)} title={attachment.name}>
                  <Icon size={17} aria-hidden="true" />
                  <span>
                    <strong>{attachment.name}</strong>
                    <small>Ready · Review text</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-button attachment-remove"
                  aria-label={'Remove ' + attachment.name}
                  onClick={() => onRemove(kind)}
                  disabled={busy}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            )}
            {upload && (
              <div className={'attachment upload-attempt' + (upload.status === 'failed' ? ' upload-failed' : '')}>
                {upload.status === 'processing'
                  ? <LoaderCircle className="spinner" size={17} aria-hidden="true" />
                  : <Icon size={17} aria-hidden="true" />}
                <div className="attachment-details">
                  <strong>{upload.name}</strong>
                  {upload.status === 'failed'
                    ? <small role="alert">{upload.error}</small>
                    : <small role="status">{upload.status === 'queued' ? 'Queued' : 'Extracting text…'}</small>}
                </div>
                {upload.status === 'failed' && (
                  <>
                    <button type="button" className="subtle-button" onClick={() => onReplace(kind)} disabled={busy}>
                      {kind === 'pdf' ? 'Replace PDF' : 'Replace photo'}
                    </button>
                    {!attachment && (
                      <button
                        type="button"
                        className="icon-button attachment-remove"
                        aria-label={'Remove ' + upload.name}
                        onClick={() => onRemove(kind)}
                        disabled={busy}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
