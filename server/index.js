import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { ALLOWED_DOMAINS, ARABIC_SOURCES } from './sources.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3001
const MODEL = process.env.SYRAI_MODEL || 'claude-opus-5-5'
const MAX_CONTINUATIONS = 4
const MAX_HISTORY = 30
const MAX_MESSAGE_CHARS = 8000

const client = new Anthropic()
const app = express()
app.use(express.json({ limit: '1mb' }))

const SYSTEM_PROMPT = `أنت «سيراي» (SyrAI)، مساعد ذكاء اصطناعي عربي أُنشئ لخدمة المستخدمين السوريين والعرب.

قواعد اللغة:
- اكتب جميع ردودك باللغة العربية الفصحى الواضحة والسهلة، مهما كانت لغة السؤال.
- إذا كتب المستخدم بلهجة عامية فافهمها وأجب بفصحى مبسّطة قريبة منه.
- اكتب المصطلحات الأجنبية بالعربية أولًا، ويمكنك ذكر الأصل الأجنبي بين قوسين عند الحاجة فقط.
- استخدم الأرقام العربية المألوفة (1، 2، 3) وعلامات الترقيم العربية (، ؛ ؟).

قواعد المصادر:
- اعتمد على المصادر العربية فقط. أداة البحث المتاحة لك مقيّدة بمواقع عربية موثوقة، فاستخدمها لأي سؤال يتعلق بالوقائع أو الأخبار أو الأرقام أو التواريخ أو أي معلومة قد تكون تغيّرت.
- ابحث بكلمات عربية دائمًا.
- لا تنسب معلومة إلى مصدر لم تجده في نتائج البحث، ولا تخترع روابط أو أسماء مصادر.
- إذا لم تجد في المصادر العربية ما يجيب عن السؤال فقل ذلك بوضوح بدل التخمين.
- عند ذكر معلومة من مصدر، اذكر اسم المصدر داخل النص بصيغة طبيعية (مثل: «بحسب الجزيرة نت...»).

أسلوب الإجابة:
- ابدأ بالإجابة المباشرة، ثم التفاصيل.
- استخدم عناوين قصيرة وقوائم نقطية عند الحاجة، وتجنّب الإطالة غير الضرورية.
- كن دقيقًا ومحايدًا ومحترمًا.`

/** إرسال حدث واحد إلى المتصفح بصيغة Server-Sent Events */
function send(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null
  const clean = messages.slice(-MAX_HISTORY).map((m) => ({
    role: m?.role === 'assistant' ? 'assistant' : 'user',
    content: String(m?.content ?? '').slice(0, MAX_MESSAGE_CHARS).trim(),
  }))
  // يجب أن تبدأ المحادثة برسالة من المستخدم وتنتهي بها
  while (clean.length && clean[0].role !== 'user') clean.shift()
  if (!clean.length || clean.at(-1).role !== 'user') return null
  if (clean.some((m) => !m.content)) return null
  return clean
}

/** استخراج المصادر: المقتبس منها أولًا ثم بقية نتائج البحث */
function collectSources(content) {
  const cited = new Map()
  const found = new Map()
  for (const block of content) {
    if (block.type === 'text' && Array.isArray(block.citations)) {
      for (const c of block.citations) {
        if (c.url && !cited.has(c.url)) cited.set(c.url, { url: c.url, title: c.title || c.url, cited: true })
      }
    }
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const r of block.content) {
        if (r.type === 'web_search_result' && r.url && !found.has(r.url)) {
          found.set(r.url, { url: r.url, title: r.title || r.url, cited: false })
        }
      }
    }
  }
  for (const url of cited.keys()) found.delete(url)
  return [...cited.values(), ...found.values()].slice(0, 12)
}

const REFUSAL_MESSAGE = 'عذرًا، لا أستطيع المساعدة في هذا الطلب.'

app.get('/api/sources', (_req, res) => {
  res.json({ sources: ARABIC_SOURCES })
})

app.post('/api/chat', async (req, res) => {
  const history = validateMessages(req.body?.messages)
  if (!history) {
    res.status(400).json({ error: 'صيغة المحادثة غير صالحة.' })
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })

  let current = null
  let closed = false
  res.on('close', () => {
    closed = true
    current?.abort()
  })

  const messages = [...history]
  const allContent = []

  try {
    for (let turn = 0; turn <= MAX_CONTINUATIONS && !closed; turn++) {
      current = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 32000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        tools: [
          {
            type: 'web_search_20260209',
            name: 'web_search',
            max_uses: 5,
            allowed_domains: ALLOWED_DOMAINS,
            user_location: { type: 'approximate', country: 'SY', timezone: 'Asia/Damascus' },
          },
        ],
        messages,
      })

      const toolInputs = new Map()
      for await (const event of current) {
        if (event.type === 'content_block_start' && event.content_block.type === 'server_tool_use') {
          toolInputs.set(event.index, '')
          send(res, { type: 'status', status: 'searching' })
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            send(res, { type: 'text', text: event.delta.text })
          } else if (event.delta.type === 'input_json_delta' && toolInputs.has(event.index)) {
            toolInputs.set(event.index, toolInputs.get(event.index) + event.delta.partial_json)
          }
        } else if (event.type === 'content_block_stop' && toolInputs.has(event.index)) {
          try {
            const { query } = JSON.parse(toolInputs.get(event.index) || '{}')
            if (query) send(res, { type: 'status', status: 'searching', query })
          } catch {
            /* استعلام غير مكتمل — نتجاهله */
          }
        }
      }

      const message = await current.finalMessage()
      allContent.push(...message.content)

      if (message.stop_reason === 'refusal') {
        send(res, { type: 'text', text: `\n\n${REFUSAL_MESSAGE}` })
        break
      }
      if (message.stop_reason !== 'pause_turn') break

      // دور طويل توقف مؤقتًا أثناء البحث: نعيده كما هو ليكمل الخادم من حيث توقف
      messages.push({ role: 'assistant', content: message.content })
    }

    send(res, { type: 'sources', sources: collectSources(allContent) })
    send(res, { type: 'done' })
  } catch (err) {
    if (closed) return
    console.error(err)
    let message = 'حدث خطأ غير متوقع. حاول مرة أخرى.'
    if (
      err instanceof Anthropic.AuthenticationError ||
      /authentication method/i.test(String(err?.message))
    ) {
      message = 'مفتاح Anthropic API غير موجود أو غير صالح — أضفه في ملف الإعدادات (env)'
    } else if (err instanceof Anthropic.RateLimitError) {
      message = 'الخدمة مشغولة حاليًا. انتظر قليلًا ثم أعد المحاولة.'
    } else if (err instanceof Anthropic.APIConnectionError) {
      message = 'تعذّر الاتصال بالخدمة. تحقق من اتصالك بالإنترنت.'
    } else if (err instanceof Anthropic.APIError && err.status >= 500) {
      message = 'الخدمة غير متاحة مؤقتًا. حاول بعد قليل.'
    }
    send(res, { type: 'error', message })
  } finally {
    if (!closed) res.end()
  }
})

// في وضع الإنتاج يخدم الخادم الواجهة المبنية أيضًا
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(here, '..', 'dist')
  app.use(express.static(dist))
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`SyrAI API → http://localhost:${PORT}`)
})
