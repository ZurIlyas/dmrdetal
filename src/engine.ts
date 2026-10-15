// Блок «Технологии»: мотор V8. По прокрутке узлы разъезжаются, блок цилиндров становится прозрачным
// и видно, как работают поршни, шатуны и коленвал. Модель процедурная и условная — это иллюстрация, а не чертёж.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RED, materials, box, cyl, gearGeo, canvasTex, text, screen } from './kit'

export type Engine = { setProgress(p: number, instant?: boolean): void }
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const ease = (t: number) => 1 - Math.pow(1 - t, 3)

export function initEngine(root: HTMLElement): Engine | null {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!
  const labels = Array.from(root.querySelectorAll<HTMLElement>('[data-part]'))
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.75
  pmrem.dispose()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x221111, 1.1))
  const key = new THREE.DirectionalLight(0xffffff, 2.8)
  key.position.set(-3, 7, 5)
  scene.add(key)
  const red = new THREE.PointLight(RED, 45, 14, 2)
  red.position.set(2.5, -1.5, 3)
  scene.add(red)
  const inner = new THREE.PointLight(0xff5533, 0, 5, 2)   // загорается внутри, когда блок прозрачный
  scene.add(inner)

  const M = materials()
  const alu = new THREE.MeshStandardMaterial({ color: 0xb9bfc6, metalness: 0.85, roughness: 0.34, transparent: true })
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.8, roughness: 0.4, transparent: true })
  const liner = new THREE.MeshStandardMaterial({ color: 0x8d949c, metalness: 0.9, roughness: 0.25, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  const engine = new THREE.Group()
  scene.add(engine)

  const R = 0.32, L = 1.05            // радиус кривошипа и длина шатуна
  const XS = [-1.35, -0.45, 0.45, 1.35]
  const PHASE = [0, Math.PI / 2, (3 * Math.PI) / 2, Math.PI]   // крестообразный коленвал
  const BANKS = [Math.PI / 4, -Math.PI / 4]                    // развал 90°

  // ---------- картер и поддон ----------
  const crankcase = new THREE.Group()
  engine.add(crankcase)
  box(crankcase, 3.9, 1.3, 1.7, 0, -0.05, 0, iron, 0.08)
  const pan = new THREE.Group()
  engine.add(pan)
  box(pan, 3.5, 0.42, 1.3, 0, -0.95, 0, M.dark, 0.1)
  box(pan, 3.6, 0.05, 1.42, 0, -0.73, 0, M.edge, 0.02)

  // ---------- блоки цилиндров, головки и клапанные крышки по двум рядам ----------
  const cover = canvasTex(1024, 220, (c, w, h) => {
    c.fillStyle = '#c40000'
    c.fillRect(0, 0, w, h)
    c.strokeStyle = 'rgba(255,255,255,.25)'
    c.lineWidth = 4
    c.strokeRect(10, 10, w - 20, h - 20)
    text(c, 'DMRDETAL', 290, 140, 92, '#ffffff', 800)
  })
  type Bank = { a: number; dir: THREE.Vector3; blockG: THREE.Group; head: THREE.Group; cov: THREE.Group }
  const banks: Bank[] = BANKS.map((a) => {
    const g = new THREE.Group()
    g.rotation.x = a                     // локальная ось Y группы — ось цилиндров ряда
    engine.add(g)
    const blockG = new THREE.Group()
    g.add(blockG)
    box(blockG, 3.9, 1.1, 0.9, 0, 1.1, 0, alu, 0.05)
    for (const x of XS) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.1, 28, 1, true), liner)
      t.position.set(x + (a > 0 ? 0.11 : -0.11), 1.1, 0)
      blockG.add(t)
    }
    const head = new THREE.Group()
    g.add(head)
    box(head, 3.95, 0.42, 1.0, 0, 1.86, 0, alu, 0.06)
    for (const x of XS) cyl(head, 0.06, 0.12, x, 1.86, a > 0 ? 0.52 : -0.52, M.chrome, 0.06, 12).rotation.x = Math.PI / 2
    const cov = new THREE.Group()
    g.add(cov)
    box(cov, 3.8, 0.28, 0.92, 0, 2.21, 0, M.red, 0.1)
    const lid = screen(cov, 2.6, 0.48, -0.15, 2.355, -0.08, cover.t)
    lid.rotation.x = -Math.PI / 2
    if (a < 0) lid.rotation.z = Math.PI
    for (const x of XS) box(cov, 0.2, 0.2, 0.2, x + 0.1, 2.43, 0.33, M.dark, 0.04)   // катушки зажигания вдоль края крышки
    return { a, dir: new THREE.Vector3(0, Math.cos(a), Math.sin(a)), blockG, head, cov }
  })

  // ---------- впускной коллектор между рядами ----------
  const intake = new THREE.Group()
  engine.add(intake)
  box(intake, 3.3, 0.36, 0.62, 0, 1.75, 0, M.body, 0.1)
  for (const x of XS) for (const s of [-1, 1]) {
    const r = box(intake, 0.16, 0.14, 0.6, x + s * 0.11, 1.6, s * 0.42, M.steel, 0.05)
    r.rotation.x = s * 0.5
  }
  const tb = cyl(intake, 0.26, 0.4, -1.9, 1.78, 0, M.chrome, 0.26, 28)
  tb.rotation.z = Math.PI / 2
  cyl(intake, 0.18, 0.42, -1.9, 1.78, 0, M.dark, 0.18, 24).rotation.z = Math.PI / 2

  // ---------- коленвал, маховик, шкив и ремень ----------
  const crank = new THREE.Group()
  engine.add(crank)
  const journal = cyl(crank, 0.12, 4.1, 0, 0, 0, M.chrome, 0.12, 20)
  journal.rotation.z = Math.PI / 2
  XS.forEach((x, k) => {
    const ph = PHASE[k]
    const py = R * Math.cos(ph), pz = R * Math.sin(ph)
    const pin = cyl(crank, 0.1, 0.42, x, py, pz, M.chrome, 0.1, 16)
    pin.rotation.z = Math.PI / 2
    for (const dx of [-0.25, 0.25]) {
      const web = box(crank, 0.08, 0.86, 0.42, x + dx, py * 0.35, pz * 0.35, M.steel, 0.04)
      web.rotation.x = ph
    }
  })
  const flywheel = new THREE.Mesh(gearGeo(0.8, 0.1, 40), M.steel)
  flywheel.rotation.z = Math.PI / 2
  const fly = new THREE.Group()
  fly.add(flywheel)
  fly.position.x = 2.15
  engine.add(fly)
  const front = new THREE.Group()
  engine.add(front)
  box(front, 0.12, 2.1, 1.9, -2.05, 0.35, 0, M.body, 0.06)
  const pulleys: THREE.Mesh[] = []
  const belt: THREE.Vector3[] = []
  ;[[0.42, -0.1, 0], [0.24, 1.25, 0.62], [0.24, 1.25, -0.62], [0.2, 0.55, 0.85]].forEach(([r, y, z]) => {
    const p = cyl(front, r, 0.16, -2.2, y, z, M.steel, r, 32)
    p.rotation.z = Math.PI / 2
    cyl(front, r * 0.35, 0.2, -2.22, y, z, M.redGlow, r * 0.35, 16).rotation.z = Math.PI / 2
    pulleys.push(p)
  })
  // ремень огибает шкивы снаружи
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2
    const y = 0.45 + Math.cos(a) * 1.08, z = Math.sin(a) * 0.9
    belt.push(new THREE.Vector3(-2.2, y, z))
  }
  front.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(belt, true), 96, 0.035, 6, true), M.rubber))

  // ---------- поршни и шатуны ----------
  const pistonGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.32, 28)
  const ringGeo = new THREE.TorusGeometry(0.3, 0.012, 6, 32)
  const rodGeo = new THREE.BoxGeometry(0.08, 1, 0.12)
  type Cyl = { x: number; ph: number; bank: Bank; piston: THREE.Group; rod: THREE.Mesh }
  const cyls: Cyl[] = []
  const pistons = new THREE.Group()
  engine.add(pistons)
  banks.forEach((bank) => XS.forEach((x0, k) => {
    const piston = new THREE.Group()
    const body = new THREE.Mesh(pistonGeo, M.chrome)
    piston.add(body)
    for (const y of [0.08, 0.12]) { const r = new THREE.Mesh(ringGeo, M.dark); r.rotation.x = Math.PI / 2; r.position.y = y; piston.add(r) }
    piston.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bank.dir)
    pistons.add(piston)
    const rod = new THREE.Mesh(rodGeo, M.steel)
    pistons.add(rod)
    cyls.push({ x: x0 + (bank.a > 0 ? 0.11 : -0.11), ph: PHASE[k], bank, piston, rod })
  }))

  // ---------- анимация ----------
  const UP = new THREE.Vector3(0, 1, 0), pin = new THREE.Vector3(), top = new THREE.Vector3(), mid = new THREE.Vector3(), dir = new THREE.Vector3()
  let theta = 0
  function updatePistons() {
    for (const c of cyls) {
      const ang = theta + c.ph
      pin.set(c.x, R * Math.cos(ang), R * Math.sin(ang))
      const rel = ang - c.bank.a
      const s = R * Math.cos(rel) + Math.sqrt(L * L - (R * Math.sin(rel)) ** 2)
      top.copy(c.bank.dir).multiplyScalar(s).setX(c.x)
      c.piston.position.copy(c.bank.dir).multiplyScalar(s + 0.12).setX(c.x)
      mid.addVectors(pin, top).multiplyScalar(0.5)
      dir.subVectors(top, pin)
      c.rod.position.copy(mid)
      c.rod.scale.y = dir.length()
      c.rod.quaternion.setFromUnitVectors(UP, dir.normalize())
    }
  }

  // подписи: где у каждого узла точка для подписи
  const anchors: Record<string, () => THREE.Vector3> = {
    covers: () => banks[0].dir.clone().multiplyScalar(2.6 + 1.7 * ex).setX(0.6),
    heads: () => banks[1].dir.clone().multiplyScalar(2.1 + 0.95 * ex).setX(-0.9),
    intake: () => new THREE.Vector3(-0.4, 2.0 + 1.35 * ex, 0),
    pistons: () => banks[0].dir.clone().multiplyScalar(1.1).setX(1.35),
    crank: () => new THREE.Vector3(0.9, 0.35, 0.9),
    pan: () => new THREE.Vector3(0.2, -1.2 - 1.0 * ex, 0.6),
  }

  let progress = 0, cur = 0, ex = 0, raf = 0, visible = false, last = performance.now()
  function resize() {
    const w = root.clientWidth, h = root.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // на широком экране мотор справа от текста, на узком — ниже
    camera.setViewOffset(w, h, w > 900 ? -w * 0.17 : 0, w > 900 ? 0 : -h * 0.12, w, h)
    camera.updateProjectionMatrix()
  }
  const tmp = new THREE.Vector3()
  function frame(now: number) {
    raf = 0
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    cur += (progress - cur) * 0.08
    ex = ease(clamp((cur - 0.05) / 0.6))
    const xray = clamp((cur - 0.2) / 0.4)
    // разбор
    for (const b of banks) {
      b.head.position.copy(b.dir).multiplyScalar(0.95 * ex)
      b.cov.position.copy(b.dir).multiplyScalar(1.7 * ex)
    }
    intake.position.y = 1.35 * ex
    pan.position.y = -1.0 * ex
    front.position.x = -1.1 * ex
    fly.position.x = 2.15 + 0.9 * ex
    // рентген: блок и картер становятся прозрачными, видны гильзы и поршни
    const op = 1 - xray * 0.84
    for (const m of [alu, iron]) { m.opacity = op; m.depthWrite = op > 0.98 }
    liner.opacity = xray * 0.35
    inner.intensity = xray * 18
    inner.position.set(0, 1.2, 0)
    // мотор крутится: на холостых медленно, при разборе быстрее
    theta += dt * (1.6 + cur * 7)
    crank.rotation.x = theta
    flywheel.rotation.y = theta
    pulleys.forEach((p, i) => (p.rotation.y = theta * (i ? 1.7 : 1)))
    updatePistons()
    // камера облетает мотор по ходу прокрутки
    const narrow = camera.aspect < 1
    const dist = (narrow ? 16 / camera.aspect : 12.5) + ex * (narrow ? 3 : 3.2)
    const az = -0.75 + cur * 1.1, el = 0.32 + Math.sin(cur * Math.PI) * 0.12
    camera.position.set(Math.sin(az) * dist * Math.cos(el), 0.6 + Math.sin(el) * dist, Math.cos(az) * dist * Math.cos(el))
    camera.lookAt(0, 0.4, 0)
    camera.updateMatrixWorld()
    labels.forEach((l, i) => {
      const f = anchors[l.dataset.part!]
      if (!f) return
      tmp.copy(f()).project(camera)
      l.style.transform = `translate(${((tmp.x + 1) / 2) * root.clientWidth}px, ${((1 - tmp.y) / 2) * root.clientHeight}px)`
      l.style.opacity = String(clamp((cur - 0.35 - i * 0.04) * 5))
    })
    renderer.render(scene, camera)
    if (visible) raf = requestAnimationFrame(frame)
  }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame) } }).observe(root)
  new ResizeObserver(resize).observe(root)
  resize()
  return { setProgress(p, instant) { progress = clamp(p); if (instant) cur = progress } }
}
