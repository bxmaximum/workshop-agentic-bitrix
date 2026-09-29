#!/usr/bin/env node
// Веб-интерфейс фермы: реестр проектов и запуски на одной странице, обновление по SSE.
// Без зависимостей. Запуск: `bin/farm web` или `FARM_ROOT=… node web/server.mjs`. Порт FARM_WEB_PORT (4420).
import http from 'node:http'
import { readFileSync, readdirSync, existsSync, statSync, watch } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const FARM_ROOT = process.env.FARM_ROOT ? resolve(process.env.FARM_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.FARM_WEB_PORT || 4420)
const RUNS = join(FARM_ROOT, 'runs')
const REGISTRY = join(FARM_ROOT, 'Projects', 'registry.md')
const log = m => process.stderr.write(`web: ${m}\n`)

// ---- данные ----
function projects() {
  if (!existsSync(REGISTRY)) return []
  const out = []
  for (const line of readFileSync(REGISTRY, 'utf8').split('\n')) {
    if (!/^\|/.test(line)) continue
    const c = line.split('|').slice(1, -1).map(s => s.trim())
    if (c.length < 4 || c[0] === 'Slug' || /^-+$/.test(c[0])) continue
    out.push({ slug: c[0], repo: c[1].replace(/`/g, ''), mode: c[2], status: c[3], notes: c[4] ?? '' })
  }
  return out
}

function readJson(p) { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null } }
function tail(p, n) {
  try { const l = readFileSync(p, 'utf8').split('\n'); return l.slice(-n).join('\n') } catch { return '' }
}

function runs() {
  if (!existsSync(RUNS)) return []
  const out = []
  for (const f of readdirSync(RUNS)) {
    if (!f.endsWith('.meta.json')) continue
    const run = f.slice(0, -'.meta.json'.length)
    const meta = readJson(join(RUNS, f)) ?? { run }
    const exitFile = join(RUNS, run + '.exit')
    const finished = existsSync(exitFile)
    const exit = finished ? Number(readFileSync(exitFile, 'utf8').trim()) : null
    const res = readJson(join(RUNS, run + '.json'))
    const startedMs = meta.started ? new Date(meta.started).getTime() : statSync(join(RUNS, f)).mtimeMs
    const endMs = finished ? statSync(exitFile).mtimeMs : Date.now()
    const item = {
      run, slug: meta.slug ?? run.replace(/-\d{10}$/, ''), task: meta.task ?? '', mode: meta.mode ?? '', repo: meta.repo ?? '',
      model: meta.model ?? '', effort: meta.effort ?? '', started: meta.started ?? null,
      running: !finished, exit,
      status: !finished ? 'running' : (exit === 0 && res && !res.is_error ? 'done' : 'error'),
      duration_s: Math.round((endMs - startedMs) / 1000),
      cost_usd: res?.total_cost_usd ?? null, turns: res?.num_turns ?? null,
      result: typeof res?.result === 'string' ? res.result : (res ? JSON.stringify(res).slice(0, 2000) : ''),
      err_tail: tail(join(RUNS, run + '.err'), 12),
    }
    out.push(item)
  }
  return out.sort((a, b) => (b.started ?? '').localeCompare(a.started ?? '')).slice(0, 50)
}

// ---- сервер ----
const sse = new Set()
let timer = null
const changed = () => { clearTimeout(timer); timer = setTimeout(() => { for (const r of sse) r.write('event: change\ndata: {}\n\n') }, 300) }
const safeWatch = (p, opts) => { try { if (existsSync(p)) watch(p, opts, changed) } catch (e) { log(`watch ${p}: ${e.message}`) } }
safeWatch(RUNS, {})
safeWatch(join(FARM_ROOT, 'Projects'), {})

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  const json = (o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)) }
  if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(PAGE) }
  if (url.pathname === '/api/state') return json({ root: FARM_ROOT, now: new Date().toISOString(), projects: projects(), runs: runs() })
  if (url.pathname === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' })
    res.write('event: hello\ndata: {}\n\n'); sse.add(res); req.on('close', () => sse.delete(res)); return
  }
  const m = /^\/runs\/([A-Za-z0-9_.-]+)\.(err|json)$/.exec(url.pathname)
  if (m) {
    const p = join(RUNS, `${m[1]}.${m[2]}`)
    if (!existsSync(p)) return json({ error: 'нет файла' }, 404)
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }); return res.end(readFileSync(p, 'utf8'))
  }
  json({ error: 'not found' }, 404)
})
server.listen(PORT, () => log(`http://localhost:${PORT} · ${FARM_ROOT}`))

// ---- страница ----
const PAGE = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Farm</title>
<style>
:root{--bg:#0B0E14;--card:#121722;--line:#293446;--text:#E9EDF5;--muted:#A5AFBE;--accent:#6483FF;--purple:#A78BFA;--green:#3DBB84;--orange:#F39A22;--red:#F06A6A}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.45 Onest,-apple-system,Segoe UI,sans-serif}
.mono{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace}
header{display:flex;align-items:center;gap:12px;padding:20px 24px;border-bottom:1px solid var(--line)}
header .dot{width:10px;height:10px;border-radius:50%;background:var(--accent)}
header h1{font-size:16px;margin:0;letter-spacing:2px;color:var(--accent)}
header .sub{color:var(--muted);font-size:13px;margin-left:auto}
main{max-width:1200px;margin:0 auto;padding:24px;display:grid;gap:24px}
h2{font-size:13px;letter-spacing:2px;color:var(--muted);margin:0 0 12px;text-transform:uppercase}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);font-size:14px;vertical-align:top}
th{color:var(--muted);font-weight:500}tr:last-child td{border-bottom:none}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;border:1px solid var(--line);color:var(--muted)}
.pill.ready,.pill.done{color:var(--green);border-color:var(--green)}.pill.running{color:var(--orange);border-color:var(--orange)}
.pill.error{color:var(--red);border-color:var(--red)}.pill.flow{color:var(--purple);border-color:var(--purple)}
.run{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin-bottom:12px}
.run.running{border-color:var(--orange)}.run .top{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.run .id{color:var(--accent)}.run .task{margin:8px 0 0;font-size:15px}.run .meta{color:var(--muted);font-size:13px;margin-top:6px}
details{margin-top:10px}summary{cursor:pointer;color:var(--muted);font-size:13px}
pre{white-space:pre-wrap;word-break:break-word;background:#0B0E14;border:1px solid var(--line);border-radius:8px;padding:12px;font-size:13px;max-height:420px;overflow:auto;margin:8px 0 0}
.empty{color:var(--muted);padding:18px;border:1px dashed var(--line);border-radius:10px}
a{color:var(--accent)}
</style></head><body>
<header><div class="dot"></div><h1 class="mono">FARM</h1><span class="sub mono" id="root"></span></header>
<main>
<section><h2>Проекты</h2><div id="projects"></div></section>
<section><h2>Запуски</h2><div id="runs"></div></section>
</main>
<script>
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
const dur = s => s >= 3600 ? Math.floor(s/3600)+' ч '+Math.floor(s%3600/60)+' мин' : s >= 60 ? Math.floor(s/60)+' мин '+(s%60)+' с' : s+' с'
const STATUS = { running: 'идёт', done: 'готово', error: 'ошибка' }
async function render() {
  const st = await (await fetch('/api/state')).json()
  document.getElementById('root').textContent = st.root
  const p = st.projects
  document.getElementById('projects').innerHTML = p.length ? '<table><tr><th>Slug</th><th>Репо</th><th>Режим</th><th>Статус</th><th>Заметки</th></tr>' +
    p.map(x => '<tr><td class="mono">'+esc(x.slug)+'</td><td class="mono">'+esc(x.repo)+'</td><td><span class="pill '+esc(x.mode)+'">'+esc(x.mode)+'</span></td><td><span class="pill '+esc(x.status)+'">'+esc(x.status)+'</span></td><td>'+esc(x.notes)+'</td></tr>').join('') + '</table>'
    : '<div class="empty">Projects/registry.md пуст</div>'
  const r = st.runs
  document.getElementById('runs').innerHTML = r.length ? r.map(x => '<div class="run '+x.status+'">' +
    '<div class="top"><span class="mono id">'+esc(x.run)+'</span><span class="pill '+x.status+'">'+STATUS[x.status]+'</span>' +
    (x.mode ? '<span class="pill '+esc(x.mode)+'">'+esc(x.mode)+'</span>' : '') +
    '<span class="mono" style="color:var(--muted);font-size:13px">'+dur(x.duration_s)+(x.cost_usd != null ? ' · $'+x.cost_usd.toFixed(2) : '')+(x.turns ? ' · '+x.turns+' ходов' : '')+'</span></div>' +
    '<p class="task">'+esc(x.task)+'</p>' +
    '<div class="meta mono">'+esc(x.slug)+' · '+esc(x.model)+'/'+esc(x.effort)+' · '+esc((x.started||'').replace('T',' '))+'</div>' +
    (x.result ? '<details open><summary>итог агента</summary><pre>'+esc(x.result)+'</pre></details>' : '') +
    (x.err_tail ? '<details'+(x.running ? ' open' : '')+'><summary>лог · <a href="/runs/'+esc(x.run)+'.err" target="_blank">целиком</a></summary><pre>'+esc(x.err_tail)+'</pre></details>' : '') +
    '</div>').join('') : '<div class="empty">Запусков ещё не было. Напиши боту: «Запусти flow на баге №3 в lesson3-copy, гейты агент»</div>'
}
render()
const es = new EventSource('/events'); es.addEventListener('change', render)
setInterval(() => { if (document.querySelector('.run.running')) render() }, 5000)
</script></body></html>`
