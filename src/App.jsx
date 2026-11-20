import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Logo from './components/Logo.jsx'
import Markdown from './components/Markdown.jsx'
import './App.css'

const STORAGE_KEY = 'syrai.conversations.v1'
const PREFS_KEY = 'syrai.prefs.v1'

const SUGGESTIONS = [
  'ما أبرز المعالم الأثرية في مدينة حلب؟',
  'لخّص لي آخر الأخبار الاقتصادية في سوريا',
  'اشرح لي معنى بيت المتنبي: «على قدر أهل العزم تأتي العزائم»',
  'ما الفرق بين الذكاء الاصطناعي وتعلّم الآلة؟',
]

const FONT_SIZES = [15, 17, 19, 21]

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* التخزين غير متاح — نتجاهل */
  }
}

const newId = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/* أيقونات بسيطة مضمّنة */
const Icon = {
  plus: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12 4 4l3 8-3 8 16-8Z" /><path d="M7 12h6" /></svg>
  ),
  stop: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
}

export default function App() {
  const [conversations, setConversations] = useState(() => load(STORAGE_KEY, []))
  const [activeId, setActiveId] = useState(() => load(STORAGE_KEY, [])[0]?.id ?? null)
  const [prefs, setPrefs] = useState(() =>
    load(PREFS_KEY, {
      theme: window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      fontIndex: 1,
    }),
  )
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [sourceList, setSourceList] = useState([])
  const [copiedId, setCopiedId] = useState(null)

  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  )
  const messages = active?.messages ?? []

  useEffect(() => save(STORAGE_KEY, conversations), [conversations])
  useEffect(() => {
    save(PREFS_KEY, prefs)
    document.documentElement.dataset.theme = prefs.theme
    document.documentElement.style.setProperty('--font-size', `${FONT_SIZES[prefs.fontIndex]}px`)
  }, [prefs])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, status])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

  const updateConversation = useCallback((id, fn) => {
    setConversations((list) => list.map((c) => (c.id === id ? fn(c) : c)))
  }, [])

  const updateLastAssistant = useCallback(
    (id, fn) =>
      updateConversation(id, (c) => {
        const msgs = [...c.messages]
        msgs[msgs.length - 1] = fn(msgs[msgs.length - 1])
        return { ...c, messages: msgs }
      }),
    [updateConversation],
  )

  const startNewChat = () => {
    abortRef.current?.abort()
    setActiveId(null)
    setInput('')
    setSidebarOpen(false)
    inputRef.current?.focus()
  }

  const deleteConversation = (id) => {
    setConversations((list) => list.filter((c) => c.id !== id))
    if (id === activeId) setActiveId(null)
  }

  const openSources = async () => {
    setSourcesOpen(true)
    if (sourceList.length) return
    try {
      const r = await fetch('/api/sources')
      const data = await r.json()
      setSourceList(data.sources ?? [])
    } catch {
      /* يبقى فارغًا */
    }
  }

  const send = async (text) => {
    const question = text.trim()
    if (!question || busy) return

    let convId = activeId
    const userMsg = { id: newId(), role: 'user', content: question }
    const botMsg = { id: newId(), role: 'assistant', content: '', sources: [], pending: true }

    if (!convId) {
      convId = newId()
      const title = question.length > 40 ? `${question.slice(0, 40)}…` : question
      setConversations((list) => [{ id: convId, title, messages: [userMsg, botMsg] }, ...list])
      setActiveId(convId)
    } else {
      updateConversation(convId, (c) => ({ ...c, messages: [...c.messages, userMsg, botMsg] }))
    }

    const history = [...messages, userMsg]
      .filter((m) => m.content && !m.error)
      .map((m) => ({ role: m.role, content: m.content }))

    setInput('')
    setBusy(true)
    setStatus({ status: 'thinking' })
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'تعذّر الوصول إلى الخادم.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          const evt = JSON.parse(line.slice(5))
          if (evt.type === 'text') {
            setStatus(null)
            updateLastAssistant(convId, (m) => ({ ...m, content: m.content + evt.text }))
          } else if (evt.type === 'status') {
            setStatus(evt)
          } else if (evt.type === 'sources') {
            updateLastAssistant(convId, (m) => ({ ...m, sources: evt.sources }))
          } else if (evt.type === 'error') {
            updateLastAssistant(convId, (m) => ({ ...m, error: evt.message }))
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        updateLastAssistant(convId, (m) => ({
          ...m,
          error: err.message === 'Failed to fetch' ? 'تعذّر الاتصال بالخادم.' : err.message,
        }))
      }
    } finally {
      updateLastAssistant(convId, (m) => ({ ...m, pending: false }))
      setBusy(false)
      setStatus(null)
      abortRef.current = null
    }
  }

  const stop = () => abortRef.current?.abort()

  const copy = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg.content)
      setCopiedId(msg.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      /* الحافظة غير متاحة */
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send(input)
    }
  }

  const groupedSources = useMemo(() => {
    const groups = {}
    for (const s of sourceList) (groups[s.group] ??= []).push(s)
    return Object.entries(groups)
  }, [sourceList])

  return (
    <div className="app">
      {/* الشريط الجانبي: سجل المحادثات */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="المحادثات">
        <div className="sidebar-head">
          <Logo size={34} />
          <span className="brand-name">SyrAI</span>
          <button className="icon-btn only-mobile" onClick={() => setSidebarOpen(false)} aria-label="إغلاق">
            {Icon.close}
          </button>
        </div>
        <button className="new-chat" onClick={startNewChat}>
          {Icon.plus}
          <span>محادثة جديدة</span>
        </button>
        <nav className="history">
          {conversations.length === 0 && <p className="history-empty">لا توجد محادثات بعد</p>}
          {conversations.map((c) => (
            <div key={c.id} className={`history-item ${c.id === activeId ? 'active' : ''}`}>
              <button
                className="history-title"
                onClick={() => {
                  setActiveId(c.id)
                  setSidebarOpen(false)
                }}
              >
                {c.title}
              </button>
              <button className="icon-btn small" onClick={() => deleteConversation(c.id)} aria-label="حذف المحادثة">
                {Icon.trash}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="foot-btn" onClick={openSources}>
            {Icon.book}
            <span>المصادر العربية المعتمدة</span>
          </button>
        </div>
      </aside>
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn only-mobile" onClick={() => setSidebarOpen(true)} aria-label="القائمة">
            {Icon.menu}
          </button>
          <div className="topbar-title">
            <Logo size={30} />
            <div>
              <h1>SyrAI</h1>
              <p>مساعدك الذكي — من المصادر العربية فقط</p>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="font-ctrl" role="group" aria-label="حجم الخط">
              <button
                className="icon-btn"
                onClick={() => setPrefs((p) => ({ ...p, fontIndex: Math.max(0, p.fontIndex - 1) }))}
                aria-label="تصغير الخط"
                disabled={prefs.fontIndex === 0}
              >
                <span className="aa small">أ</span>
              </button>
              <button
                className="icon-btn"
                onClick={() =>
                  setPrefs((p) => ({ ...p, fontIndex: Math.min(FONT_SIZES.length - 1, p.fontIndex + 1) }))
                }
                aria-label="تكبير الخط"
                disabled={prefs.fontIndex === FONT_SIZES.length - 1}
              >
                <span className="aa">أ</span>
              </button>
            </div>
            <button
              className="icon-btn"
              onClick={() => setPrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
              aria-label={prefs.theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
              title={prefs.theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {prefs.theme === 'dark' ? Icon.sun : Icon.moon}
            </button>
          </div>
        </header>

        <section className="chat" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="welcome">
              <Logo size={132} className="welcome-logo" />
              <h2>أهلًا بك في سيراي</h2>
              <p>
                اسألني عن أي موضوع، وسأجيبك باللغة العربية معتمدًا على المصادر العربية الموثوقة فقط،
                مع ذكر المراجع.
              </p>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="suggestion" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((m, idx) => (
                <article key={m.id} className={`msg ${m.role}`}>
                  {m.role === 'assistant' && (
                    <div className="avatar">
                      <Logo size={26} />
                    </div>
                  )}
                  <div className="bubble">
                    {m.role === 'user' ? (
                      <p className="user-text">{m.content}</p>
                    ) : (
                      <>
                        {m.content && <Markdown text={m.content} />}
                        {m.pending && idx === messages.length - 1 && status && (
                          <div className="status">
                            <span className="dots" aria-hidden="true">
                              <i />
                              <i />
                              <i />
                            </span>
                            {status.status === 'searching'
                              ? status.query
                                ? `أبحث في المصادر العربية عن: «${status.query}»`
                                : 'أبحث في المصادر العربية…'
                              : 'أفكّر…'}
                          </div>
                        )}
                        {m.error && <p className="error">{m.error}</p>}
                        {m.sources?.length > 0 && (
                          <div className="sources">
                            <span className="sources-label">المصادر:</span>
                            {m.sources.map((s, i) => (
                              <a
                                key={s.url}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`source ${s.cited ? 'cited' : ''}`}
                                title={s.title}
                              >
                                <span className="source-num">{i + 1}</span>
                                <span className="source-host">{hostOf(s.url)}</span>
                              </a>
                            ))}
                          </div>
                        )}
                        {!m.pending && m.content && (
                          <div className="msg-actions">
                            <button className="text-btn" onClick={() => copy(m)}>
                              {Icon.copy}
                              {copiedId === m.id ? 'تم النسخ' : 'نسخ'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="composer-wrap">
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="اكتب سؤالك هنا…"
              rows={1}
              dir="auto"
              aria-label="اكتب سؤالك"
            />
            {busy ? (
              <button type="button" className="send-btn stop" onClick={stop} aria-label="إيقاف">
                {Icon.stop}
              </button>
            ) : (
              <button type="submit" className="send-btn" disabled={!input.trim()} aria-label="إرسال">
                {Icon.send}
              </button>
            )}
          </form>
          <p className="disclaimer">
            يعتمد سيراي على مصادر عربية فقط، وقد يخطئ أحيانًا. تحقّق من المعلومات المهمة من مصادرها.
          </p>
        </footer>
      </main>

      {sourcesOpen && (
        <div className="modal-scrim" onClick={() => setSourcesOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="src-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 id="src-title">المصادر العربية المعتمدة</h2>
              <button className="icon-btn" onClick={() => setSourcesOpen(false)} aria-label="إغلاق">
                {Icon.close}
              </button>
            </div>
            <p className="modal-note">
              يبحث سيراي في هذه المواقع العربية فقط، ولا يمكنه الوصول إلى أي موقع آخر.
            </p>
            {groupedSources.length === 0 && <p className="modal-note">جارٍ التحميل…</p>}
            {groupedSources.map(([group, items]) => (
              <div key={group} className="src-group">
                <h3>{group}</h3>
                <ul>
                  {items.map((s) => (
                    <li key={s.domain}>
                      <span>{s.name}</span>
                      <bdi className="src-domain">{s.domain}</bdi>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
