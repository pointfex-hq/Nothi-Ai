import { useCallback, useEffect, useRef, useState } from 'react'
import { Ellipsis, FolderCheck, LogOut, Menu, MessageSquare, Plus, SlidersHorizontal, Trash2, UserRound } from 'lucide-react'
import AppHeader from './AppHeader.jsx'
import AuthForm from './AuthForm.jsx'
import ChatView from './ChatView.jsx'
import DeleteChatDialog from './DeleteChatDialog.jsx'
import UsageLimits from './UsageLimits.jsx'
import { request, sessionRequired } from './chat-api.js'
import './App.css'

const sessionChangeKey = 'nothi-session-change'
const desktopQuery = '(min-width: 760px)'
const usageLimitsHash = '#usage-limits'

function announceSessionChange() {
  try {
    localStorage.setItem(sessionChangeKey, crypto.randomUUID())
  } catch {
    // The current tab still uses the server's session.
  }
}

function ChatWorkspace({ user, onSignOut }) {
  const activeChatKey = 'nothi-active-chat:' + user.id
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia(desktopQuery).matches)
  const [chats, setChats] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [starting, setStarting] = useState(true)
  const [connected, setConnected] = useState(false)
  const [creating, setCreating] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [startupError, setStartupError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [hash, setHash] = useState(() => window.location.hash)
  const deletedChats = useRef(new Set())
  const isAdmin = user.role === 'admin'
  const showingUsageLimits = isAdmin && hash === usageLimitsHash

  const selectChat = useCallback(id => {
    localStorage.setItem(activeChatKey, id ?? '')
    setActiveId(id)
  }, [activeChatKey])

  const updateSummary = useCallback(({ id, title, updatedAt }) => {
    setChats(previous => {
      if (deletedChats.current.has(id)) return previous
      return [{ id, title, updatedAt }, ...previous.filter(chat => chat.id !== id)]
        .sort((a, b) => b.updatedAt - a.updatedAt)
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function start() {
      try {
        const list = await request('/api/chats', { signal: controller.signal })
        if (controller.signal.aborted) return

        setChats(list)
        const savedId = localStorage.getItem(activeChatKey)
        let chat = list.find(item => item.id === savedId) ?? list[0]
        if (!chat && savedId !== '') {
          chat = await request('/api/chats', { method: 'POST', signal: controller.signal })
        }
        if (controller.signal.aborted) return

        if (!list.length && chat) updateSummary(chat)
        selectChat(chat?.id ?? null)
        setConnected(true)
      } catch (error) {
        if (!controller.signal.aborted) {
          setConnected(false)
          setStartupError(error.message)
        }
      } finally {
        if (!controller.signal.aborted) setStarting(false)
      }
    }

    start()
    return () => controller.abort()
  }, [activeChatKey, attempt, selectChat, updateSummary])

  useEffect(() => {
    if (!openMenuId) return
    function closeOutside(event) {
      if (event.target instanceof Element && !event.target.closest('.chat-actions-toggle, .chat-actions-menu')) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [openMenuId])

  useEffect(() => {
    function updatePage() {
      setHash(window.location.hash)
    }
    window.addEventListener('hashchange', updatePage)
    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  function closeUsageLimits() {
    window.location.hash = ''
  }

  function openChat(id) {
    setOpenMenuId(null)
    selectChat(id)
    if (showingUsageLimits) closeUsageLimits()
    if (!window.matchMedia(desktopQuery).matches) setSidebarOpen(false)
  }

  async function newChat() {
    setOpenMenuId(null)
    setCreating(true)
    setStartupError('')
    try {
      const chat = await request('/api/chats', { method: 'POST' })
      updateSummary(chat)
      openChat(chat.id)
    } catch (error) {
      setStartupError(error.message)
    } finally {
      setCreating(false)
    }
  }

  function cancelDelete() {
    setDeleteTarget(null)
    requestAnimationFrame(() => document.getElementById('chat-actions-' + deleteTarget.id)?.focus())
  }

  async function deleteChat(id) {
    await request('/api/chats/' + id, { method: 'DELETE' })
    deletedChats.current.add(id)
    setChats(previous => previous.filter(chat => chat.id !== id))

    const nextId = activeId === id ? chats.find(chat => chat.id !== id)?.id ?? null : activeId
    if (activeId === id) selectChat(nextId)
    setDeleteTarget(null)
    requestAnimationFrame(() => {
      document.getElementById(nextId ? 'chat-select-' + nextId : 'sidebar-new-chat')?.focus()
    })
  }

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    setSignOutError('')
    try {
      await onSignOut()
    } catch (error) {
      setSignOutError(error.message)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="app">
      <AppHeader
        status={starting ? 'Connecting…' : connected ? 'API connected' : 'API unavailable'}
        sidebar={
          <button
            className="icon-button menu-toggle"
            type="button"
            aria-label={sidebarOpen ? 'Hide chat sidebar' : 'Show chat sidebar'}
            aria-expanded={sidebarOpen}
            aria-controls="chat-sidebar"
            onClick={() => {
              setOpenMenuId(null)
              setSidebarOpen(open => !open)
            }}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        }
        account={
          <div className="account-tools">
            <span className="account-name" title={user.username}>{user.username}</span>
            <button
              className="icon-button sign-out"
              type="button"
              aria-label={signingOut ? 'Signing out' : 'Sign out'}
              title={'Sign out of ' + user.username}
              onClick={signOut}
              disabled={signingOut}
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        }
      />

      <div className="app-layout">
        {sidebarOpen && (
          <button className="sidebar-scrim" type="button" aria-label="Close chat sidebar" onClick={() => {
            setOpenMenuId(null)
            setSidebarOpen(false)
          }} />
        )}
        <aside id="chat-sidebar" className="sidebar" hidden={!sidebarOpen}>
          <button id="sidebar-new-chat" className="primary sidebar-new" type="button" onClick={newChat} disabled={starting || creating}>
            <Plus size={17} aria-hidden="true" />
            {creating ? 'Creating…' : 'New chat'}
          </button>
          {isAdmin && (
            <button
              type="button"
              className="subtle-button sidebar-usage-limits"
              aria-current={showingUsageLimits ? 'page' : undefined}
              onClick={() => {
                setOpenMenuId(null)
                window.location.hash = usageLimitsHash
                if (!window.matchMedia(desktopQuery).matches) setSidebarOpen(false)
              }}
            >
              <SlidersHorizontal size={17} aria-hidden="true" /> Usage limits
            </button>
          )}
          <nav className="chat-navigation" aria-label="Chats">
            <h2>Chats</h2>
            {chats.map(chat => {
              const menuOpen = chat.id === openMenuId
              const actionId = 'chat-actions-' + chat.id
              const menuId = 'chat-menu-' + chat.id
              return (
                <div className="chat-item" key={chat.id} onKeyDown={event => {
                  if (event.key === 'Escape' && menuOpen) {
                    event.preventDefault()
                    setOpenMenuId(null)
                    document.getElementById(actionId)?.focus()
                  }
                }}>
                  <div className="chat-row">
                    <button
                      className="chat-select"
                      id={'chat-select-' + chat.id}
                      type="button"
                      title={chat.title}
                      aria-current={!showingUsageLimits && chat.id === activeId ? 'page' : undefined}
                      onClick={() => openChat(chat.id)}
                    >
                      <MessageSquare size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span>{chat.title}</span>
                    </button>
                    <button
                      className="icon-button chat-actions-toggle"
                      id={actionId}
                      type="button"
                      aria-label={'Chat actions for ' + chat.title}
                      aria-controls={menuId}
                      aria-expanded={menuOpen}
                      disabled={starting || creating}
                      onClick={() => setOpenMenuId(menuOpen ? null : chat.id)}
                    >
                      <Ellipsis size={19} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="chat-actions-menu" id={menuId} hidden={!menuOpen}>
                    <button className="subtle-button delete-menu-action" type="button" onClick={() => {
                      setOpenMenuId(null)
                      setDeleteTarget(chat)
                    }}>
                      <Trash2 size={16} aria-hidden="true" />
                      Delete chat
                    </button>
                  </div>
                </div>
              )
            })}
          </nav>
          <div className="sidebar-note">
            <p className="sidebar-account"><UserRound size={16} aria-hidden="true" /><span>{user.username}</span></p>
            <p>Your chats are saved on this server.</p>
          </div>
        </aside>

        <main className="chat-main">
          {signOutError && <p className="startup-error" role="alert">{signOutError}</p>}
          {startupError && (
            <div className="startup-error" role="alert">
              <span>{startupError}</span>
              <button className="subtle-button" type="button" onClick={() => {
                setStartupError('')
                setStarting(true)
                setAttempt(value => value + 1)
              }}>
                Retry connection
              </button>
            </div>
          )}
          {showingUsageLimits ? <UsageLimits onBack={closeUsageLimits} /> : activeId && <ChatView key={activeId} id={activeId} onUpdate={updateSummary} />}
          {!showingUsageLimits && starting && !activeId && <p className="chat-loading" role="status">Loading chats…</p>}
          {!showingUsageLimits && !starting && connected && !activeId && (
            <div className="empty-chat empty-chat-list">
              <div className="empty-icon"><FolderCheck size={34} strokeWidth={1.4} aria-hidden="true" /></div>
              <h2>No chats yet</h2>
              <p>Start a new chat to ask about a PDF or photo, or search the indexed legal texts.</p>
              <button className="primary" type="button" onClick={newChat} disabled={creating}>
                <Plus size={17} aria-hidden="true" />
                {creating ? 'Creating…' : 'New chat'}
              </button>
            </div>
          )}
        </main>
      </div>
      {deleteTarget && <DeleteChatDialog chat={deleteTarget} onConfirm={deleteChat} onClose={cancelDelete} />}
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [sessionError, setSessionError] = useState('')
  const [attempt, setAttempt] = useState(0)

  const refreshSession = useCallback(() => {
    setUser(null)
    setChecking(true)
    setSessionError('')
    setAttempt(previous => previous + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    request('/api/auth/session', { signal: controller.signal })
      .then(({ user }) => {
        if (!controller.signal.aborted) setUser(user)
      })
      .catch(error => {
        if (!controller.signal.aborted) setSessionError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false)
      })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    function sessionChanged(event) {
      if (event.key === sessionChangeKey) refreshSession()
    }
    window.addEventListener('storage', sessionChanged)
    window.addEventListener(sessionRequired, refreshSession)
    return () => {
      window.removeEventListener('storage', sessionChanged)
      window.removeEventListener(sessionRequired, refreshSession)
    }
  }, [refreshSession])

  function signedIn(account) {
    setUser(account)
    announceSessionChange()
  }

  async function signOut() {
    await request('/api/auth/sign-out', { method: 'POST' })
    setUser(null)
    announceSessionChange()
  }

  if (user) return <ChatWorkspace key={user.id} user={user} onSignOut={signOut} />

  return (
    <div className="app">
      <AppHeader status={checking ? 'Connecting…' : sessionError ? 'API unavailable' : 'API connected'} />
      <main className="auth-main">
        {checking ? <p className="chat-loading" role="status">Checking sign-in…</p>
          : sessionError ? (
            <div className="auth-card">
              <p className="auth-error" role="alert">{sessionError}</p>
              <button className="subtle-button" type="button" onClick={refreshSession}>Retry connection</button>
            </div>
          ) : <AuthForm onAuthenticated={signedIn} />}
      </main>
    </div>
  )
}

export default App
