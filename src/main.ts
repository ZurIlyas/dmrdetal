import './style.css'
import { initLine, STATIONS, type StationId } from './line'
import { initEngine } from './engine'

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s))
const fine = matchMedia('(pointer: fine)').matches
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------- заголовок по буквам ----------
$$('.split').forEach((h) => {
  let i = 0
  const walk = (n: Node) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment()
      for (const ch of n.textContent || '') {
        if (ch === ' ' || ch === ' ') { frag.append(ch); continue }
        const s = document.createElement('span')
        s.className = 'ch'
        s.textContent = ch
        s.style.animationDelay = 0.35 + i++ * 0.03 + 's'
        frag.append(s)
      }
      n.parentNode!.replaceChild(frag, n)
    } else Array.from(n.childNodes).forEach(walk)
  }
  Array.from(h.childNodes).forEach(walk)
})

// ---------- 3D-линия ----------
const card = $('[data-hero-card]')
const preload = $('[data-preload]')
const done = () => preload.classList.add('done')
setTimeout(done, 4000)   // если WebGL долго стартует, страница не ждёт
function showStation(id: StationId | null) {
  const i = STATIONS.findIndex((s) => s.id === id)
  const s = STATIONS[i]
  $('[data-hc-n]', card).textContent = s ? `Участок ${String(i + 1).padStart(2, '0')} / 05` : 'Линия 01'
  $('[data-hc-title]', card).textContent = s ? s.name : 'Путь каждой детали'
  $('[data-hc-text]', card).textContent = s ? s.desc : 'От подбора материала до финальной проверки параметров. Нажмите на участок линии.'
  card.classList.remove('flip'); void card.offsetWidth; card.classList.add('flip')
  $$('[data-st]').forEach((li) => li.classList.toggle('on', li.dataset.st === id))
}
const line = initLine($('[data-line]'), { onReady: done, onStation: showStation })
if (!line) done()
// этапы ниже управляют той же линией: нажали этап — поднимаемся к линии и подлетаем к участку
$$('[data-st]').forEach((li) => li.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  setTimeout(() => line?.focus(li.dataset.st as StationId), 500)
}))

// ---------- генератор в разборе ----------
const ex = $('[data-explode]')
const exploded = initEngine($('.explode-pin', ex))
const bar = $('[data-explode-bar]')
const forcedP = Number(new URLSearchParams(location.search).get('p')) || 0   // ?p=0.8 — посмотреть мотор в разборе без прокрутки

// ---------- прокрутка ----------
const top = $('.top')
function onScroll() {
  top.classList.toggle('solid', scrollY > 40)
  const r = ex.getBoundingClientRect()
  const p = forcedP || Math.max(0, Math.min(1, -r.top / (r.height - innerHeight)))
  exploded?.setProgress(p, !!forcedP)
  bar.style.width = p * 100 + '%'
  lightWords()
}
addEventListener('scroll', onScroll, { passive: true })

// текст «О компании» загорается по словам
const words = $('[data-words]')
words.innerHTML = (words.textContent || '').trim().split(/\s+/).map((w) => `<span>${w}</span>`).join(' ')
const wordEls = $$('span', words)
function lightWords() {
  const r = words.getBoundingClientRect()
  const p = Math.max(0, Math.min(1, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)))
  const n = Math.round(p * wordEls.length)
  wordEls.forEach((w, i) => w.classList.toggle('lit', reduce || i < n))
}
onScroll()

// ---------- появление блоков ----------
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return
  const el = e.target as HTMLElement
  const sib = Array.from(el.parentElement?.children || []).filter((x) => x.classList.contains('rv'))
  el.style.transitionDelay = Math.max(0, sib.indexOf(el)) * 0.08 + 's'
  el.classList.add('in')
  io.unobserve(el)
}), { rootMargin: '0px 0px -10% 0px' })
$$('.rv').forEach((el) => io.observe(el))

// ---------- курсор, магнитные кнопки, наклон карточек ----------
if (fine && !reduce) {
  const cur = $('.cursor')
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY })
  const tick = () => { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; cur.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(tick) }
  tick()
  $$('a, button, .tilt, [data-st]').forEach((el) => {
    el.addEventListener('pointerenter', () => cur.classList.add('big'))
    el.addEventListener('pointerleave', () => cur.classList.remove('big'))
  })
  $$('.magnet').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect()
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.2}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`
    })
    b.addEventListener('pointerleave', () => (b.style.transform = ''))
  })
  $$('.tilt').forEach((c) => {
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
      c.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 10}deg) rotateY(${(px - 0.5) * 12}deg)`
      c.style.setProperty('--mx', px * 100 + '%')
      c.style.setProperty('--my', py * 100 + '%')
    })
    c.addEventListener('pointerleave', () => (c.style.transform = ''))
  })
}

// ---------- меню на телефоне ----------
const burger = $('[data-burger]'), menu = $('[data-menu]')
burger.addEventListener('click', () => { burger.classList.toggle('on'); menu.classList.toggle('on') })
$$('a', menu).forEach((a) => a.addEventListener('click', () => { burger.classList.remove('on'); menu.classList.remove('on') }))

// ---------- заявка: письмо в отдел продаж ----------
const form = $<HTMLFormElement>('[data-form]')
form.addEventListener('submit', (e) => {
  e.preventDefault()
  const d = new FormData(form)
  const body = ['Здравствуйте! Заявка с сайта DMRDETAL.', 'Имя или компания: ' + d.get('name'), 'Телефон: ' + d.get('phone'), d.get('note') ? 'Что нужно: ' + d.get('note') : '']
    .filter(Boolean).join('\n')
  location.href = 'mailto:sales@dmrdetal.com?subject=' + encodeURIComponent('Заявка с сайта') + '&body=' + encodeURIComponent(body)
})
