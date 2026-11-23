import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ExternalLink, FolderCheck, LoaderCircle, Paperclip } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import Attachments from './Attachments.jsx'
import DocumentReview from './DocumentReview.jsx'
import { jsonRequest, request } from './chat-api.js'

const pdfTypes = '.pdf,application/pdf'
const photoTypes = '.jpg,.jpeg,.png,image/jpeg,image/png'
const allowedFileTypes = new Set(['application/pdf', 'image/jpeg', 'image/png'])

function getFileType(file) {
  if (allowedFileTypes.has(file.type)) return file.type
  if (/\.pdf$/i.test(file.name)) return 'application/pdf'
  if (/\.jpe?g$/i.test(file.name)) return 'image/jpeg'
  if (/\.png$/i.test(file.name)) return 'image/png'
  return null
}

function ChatMessage({ message, openReview }) {
  if (message.role === 'user') {
    return <article className="user-message" aria-label="Your message"><p dir="auto">{message.content}</p></article>
  }

  return (
    <article className="assistant-message" aria-label="Nothi AI answer">
      <div className="message-author">
        <FolderCheck size={18} aria-hidden="true" /> Nothi AI{message.mode === 'legal' && ' · Legal search'}
      </div>
      <div className="answer-content" dir="auto">
        <ReactMarkdown
          skipHtml
          disallowedElements={['img']}
          components={{
            a: ({ href, children }) => {
              const id = Number(/^#source-(\d+)$/.exec(href ?? '')?.[1])
              const source = message.citations?.find(citation => citation.id === id)
              if (source?.kind === 'law') {
                return (
                  <a className="citation law-citation" href={source.officialUrl} target="_blank" rel="noopener noreferrer"
                    aria-label={source.label + ' (official source, opens in a new tab)'}>
                    {source.label} <ExternalLink size={11} aria-hidden="true" />
                  </a>
                )
              }
              return source
                ? <button className="citation" type="button" onClick={() => openReview(source.kind, source.pageNumber)}>{source.label}</button>
                : <span>{children}</span>
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </article>
  )
}

export default function ChatView({ id, onUpdate }) {
  const [chat, setChat] = useState(null)
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState('document')
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  const [uploadIssues, setUploadIssues] = useState({})
  const [review, setReview] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const fileInput = useRef(null)
  const pdfInput = useRef(null)
  const photoInput = useRef(null)
  const scrollArea = useRef(null)
  const endpoint = '/api/chats/' + id
  const busy = pending?.kind ?? chat?.busy
  const remoteBusy = Boolean(chat?.busy && !pending)
  const attachments = chat?.attachments ?? {}
  const hasAttachments = Boolean(attachments.pdf || attachments.photo)
  const isLegal = mode === 'legal'
  const canSend = Boolean(chat && (isLegal || hasAttachments) && draft.trim() && !busy)
  const uploads = {
    ...chat?.uploads,
    ...uploadIssues,
    ...Object.fromEntries(pending?.uploads?.map(upload => [upload.kind, upload]) ?? []),
  }

  useEffect(() => {
    const controller = new AbortController()
    request(endpoint, { signal: controller.signal }).then(next => {
      if (controller.signal.aborted) return
      setChat(next)
      onUpdate(next)
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.message)
    })
    return () => controller.abort()
  }, [attempt, endpoint, onUpdate])

  useEffect(() => {
    if (!remoteBusy) return
    const controller = new AbortController()
    let timer

    async function poll() {
      try {
        const next = await request(endpoint, { signal: controller.signal })
        if (controller.signal.aborted) return
        setChat(next)
        if (next.busy) timer = window.setTimeout(poll, 750)
        else onUpdate(next)
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message)
      }
    }

    timer = window.setTimeout(poll, 750)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [attempt, endpoint, onUpdate, remoteBusy])

  useEffect(() => {
    const area = scrollArea.current
    if (area) area.scrollTop = area.scrollHeight
  }, [chat?.messages.length, pending])

  function update(next) {
    setChat(next)
    onUpdate(next)
  }

  function openReview(kind, pageNumber) {
    setReview({ kind, pageNumber })
  }

  function replaceAttachment(kind) {
    const input = kind === 'pdf' ? pdfInput : photoInput
    input.current.click()
  }

  async function attach(event, onlyKind) {
    const files = Array.from(event.target.files)
    event.target.value = ''
    if (!files.length || busy) return
    setError('')

    const entries = { pdf: [], photo: [] }
    const unsupported = []
    for (const file of files) {
      const type = getFileType(file)
      const kind = type === 'application/pdf' ? 'pdf' : 'photo'
      if (!type || (onlyKind && onlyKind !== kind)) unsupported.push(file.name)
      else entries[kind].push({ file, name: file.name, kind, type })
    }
    if (unsupported.length) {
      setError('Unsupported file: ' + unsupported.join(', ') + '. Choose a PDF, JPG, JPEG, or PNG.')
    }

    const queue = []
    const issues = {}
    for (const [kind, matches] of Object.entries(entries)) {
      if (!matches.length) continue
      const [entry] = matches
      if (matches.length > 1) {
        issues[kind] = {
          name: matches.map(item => item.name).join(', '),
          status: 'failed',
          error: 'Choose one ' + (kind === 'pdf' ? 'PDF' : 'photo') + ' per selection.',
        }
      } else if (entry.file.size > 5 * 1024 * 1024) {
        issues[kind] = { name: entry.name, status: 'failed', error: 'The file must be 5 MB or smaller.' }
      } else {
        issues[kind] = undefined
        queue.push(entry)
      }
    }
    setUploadIssues(current => {
      const next = { ...current }
      for (const [kind, issue] of Object.entries(issues)) {
        if (issue) next[kind] = issue
        else delete next[kind]
      }
      return next
    })

    let failed = unsupported.length > 0 || Object.values(issues).some(Boolean)
    let reviewPhoto = false
    for (const [index, entry] of queue.entries()) {
      setPending({
        kind: 'extracting',
        uploads: queue.slice(index).map(({ kind, name }, offset) => ({ kind, name, status: offset ? 'queued' : 'processing' })),
      })
      try {
        const next = await request(endpoint + '/document', {
          method: 'POST',
          headers: { 'Content-Type': entry.type, 'X-File-Name': encodeURIComponent(entry.name) },
          body: entry.file,
        })
        update(next)
        if (entry.kind === 'photo') reviewPhoto = true
      } catch (error) {
        failed = true
        if (error.chat) update(error.chat)
        else setUploadIssues(current => ({
          ...current,
          [entry.kind]: { name: entry.name, status: 'failed', error: error.message },
        }))
      }
    }
    setPending(null)
    if (reviewPhoto && !failed) openReview('photo', 1)
  }

  async function removeAttachment(kind) {
    if (busy) return
    setError('')
    setPending({ kind: 'removing' })
    try {
      update(await request(endpoint + '/document/' + kind, { method: 'DELETE' }))
      setUploadIssues(current => {
        const next = { ...current }
        delete next[kind]
        return next
      })
    } catch (error) {
      setError(error.message)
    } finally {
      setPending(null)
    }
  }

  async function send(event) {
    event.preventDefault()
    if (!canSend) return
    const question = draft.trim()

    setError('')
    setPending({ kind: 'answering', question })
    try {
      update(await request(endpoint + '/messages', jsonRequest('POST', { question, mode })))
      setDraft('')
    } catch (error) {
      setError(error.message)
    } finally {
      setPending(null)
    }
  }

  async function saveReview(text) {
    update(await request(endpoint + '/document', jsonRequest('PATCH', { text })))
  }

  const messageCount = chat?.messages.length ?? 0
  const hasDocumentMessages = Boolean(chat?.messages.some(message => message.mode !== 'legal'))
  const reviewedAttachment = attachments[review?.kind]

  return (
    <section className="chat-view" aria-label="Conversation">
      <header className="conversation-header content-width">
        <div className="conversation-title">
          <h2>{chat?.title ?? 'New chat'}</h2>
          {messageCount > 0 && <span>{messageCount} {messageCount === 1 ? 'message' : 'messages'}</span>}
        </div>
      </header>

      <div className="transcript" ref={scrollArea}>
        <div className="message-list content-width" aria-live="polite" aria-relevant="additions text">
          {!chat && !error && <p className="chat-loading" role="status">Loading conversation…</p>}
          {chat && !messageCount && !busy && (
            <div className="empty-chat">
              <div className="empty-icon"><FolderCheck size={34} strokeWidth={1.4} aria-hidden="true" /></div>
              <h2>{isLegal ? 'Search legal texts' : (hasAttachments ? 'What would you like to ask?' : 'Start with a document')}</h2>
              <p>{isLegal ? 'Ask about the indexed legal texts. Answers link to their official sources.' : (
                hasAttachments ? 'Ask about the attached files. Answers cite their sources.' : 'Attach a PDF, a photo, or both to ask about their contents.'
              )}</p>
            </div>
          )}
          {chat?.messages.map(message => <ChatMessage key={message.id} message={message} openReview={openReview} />)}
          {pending?.question && <ChatMessage message={{ role: 'user', content: pending.question }} />}
          {busy === 'answering' && (
            <p className="working" role="status"><LoaderCircle className="spinner" size={17} aria-hidden="true" /> Nothi AI is answering…</p>
          )}
        </div>
      </div>

      <div className="composer-region content-width">
        {error && (
          <div className="chat-error" role="alert">
            <span>{error}</span>
            {(!chat || remoteBusy) && <button type="button" className="subtle-button" onClick={() => {
              setError('')
              setAttempt(value => value + 1)
            }}>Retry</button>}
          </div>
        )}
        <form className="composer" onSubmit={send}>
          <Attachments
            attachments={attachments}
            uploads={uploads}
            busy={Boolean(busy)}
            onReview={openReview}
            onReplace={replaceAttachment}
            onRemove={removeAttachment}
          />
          <textarea
            aria-label="Message"
            placeholder={isLegal ? 'Ask about the indexed legal texts…' : (
              hasAttachments ? 'Ask about the attached files…' : 'Attach a PDF or photo to get started…'
            )}
            rows={2}
            maxLength={2000}
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                event.currentTarget.form.requestSubmit()
              }
            }}
            disabled={!chat || busy === 'answering'}
            dir="auto"
          />
          <div className="composer-actions">
            <input
              ref={fileInput}
              type="file"
              aria-label="Attach documents"
              accept={pdfTypes + ',' + photoTypes}
              onChange={attach}
              disabled={!chat || Boolean(busy)}
              multiple
              hidden
            />
            <input ref={pdfInput} type="file" accept={pdfTypes} onChange={event => attach(event, 'pdf')} hidden />
            <input ref={photoInput} type="file" accept={photoTypes} onChange={event => attach(event, 'photo')} hidden />
            <div className="composer-tools">
              <button className="subtle-button attach-button" type="button" onClick={() => fileInput.current.click()} disabled={!chat || Boolean(busy)}>
                <Paperclip size={18} aria-hidden="true" /> Attach
              </button>
              <select className="ask-mode" aria-label="Ask mode" value={mode} onChange={event => setMode(event.target.value)} disabled={Boolean(busy)}>
                <option value="document">Attachments</option>
                <option value="legal">Legal search</option>
              </select>
            </div>
            <button className="primary send-button" type="submit" disabled={!canSend}>
              Send <ArrowUp size={17} aria-hidden="true" />
            </button>
          </div>
        </form>
        <p className="composer-note">
          {isLegal ? 'Legal search sends your question to Qdrant Cloud and the retrieved passages to OpenRouter.' : (
            <>
              {hasDocumentMessages ? 'Changing attachments clears answers about your files.' : 'One PDF and one JPG, JPEG, or PNG · Up to 5 MB each'}
              {hasAttachments && ' · Sending a message shares the extracted text with OpenRouter.'}
            </>
          )}
        </p>
      </div>

      {reviewedAttachment && (
        <DocumentReview
          document={reviewedAttachment}
          pageNumber={review.pageNumber}
          hasMessages={hasDocumentMessages}
          onSave={saveReview}
          onClose={() => setReview(null)}
        />
      )}
    </section>
  )
}
