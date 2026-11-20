// عارض Markdown بسيط وآمن (لا يستخدم innerHTML) يكفي لردود المساعد:
// العناوين، القوائم، الخط العريض، الشيفرة، والروابط.

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+)\))/g

function renderInline(text, keyBase) {
  const out = []
  let last = 0
  let i = 0
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${keyBase}-${i++}`
    if (token.startsWith('**')) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      out.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else {
      const label = token.slice(1, token.indexOf(']('))
      out.push(
        <a key={key} href={match[2]} target="_blank" rel="noopener noreferrer">
          {label}
        </a>,
      )
    }
    last = match.index + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export default function Markdown({ text }) {
  const lines = text.replace(/\r/g, '').split('\n')
  const blocks = []
  let para = []
  let list = null

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join(' ') })
      para = []
    }
  }
  const flushList = () => {
    if (list) {
      blocks.push(list)
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushPara()
      flushList()
      continue
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    const bullet = line.match(/^[-*•]\s+(.*)$/)
    const ordered = line.match(/^(\d+|[٠-٩]+)[.)]\s+(.*)$/)
    if (heading) {
      flushPara()
      flushList()
      blocks.push({ type: 'h', level: heading[1].length, text: heading[2] })
    } else if (bullet || ordered) {
      flushPara()
      const kind = bullet ? 'ul' : 'ol'
      if (!list || list.type !== kind) {
        flushList()
        list = { type: kind, items: [] }
      }
      list.items.push(bullet ? bullet[1] : ordered[2])
    } else if (/^-{3,}$/.test(line)) {
      flushPara()
      flushList()
      blocks.push({ type: 'hr' })
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()

  return (
    <div className="md">
      {blocks.map((b, i) => {
        if (b.type === 'h') {
          const Tag = b.level <= 2 ? 'h3' : 'h4'
          return <Tag key={i}>{renderInline(b.text, i)}</Tag>
        }
        if (b.type === 'ul' || b.type === 'ol') {
          const Tag = b.type
          return (
            <Tag key={i}>
              {b.items.map((item, j) => (
                <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
              ))}
            </Tag>
          )
        }
        if (b.type === 'hr') return <hr key={i} />
        return <p key={i}>{renderInline(b.text, i)}</p>
      })}
    </div>
  )
}
