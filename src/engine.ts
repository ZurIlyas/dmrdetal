// Блок «Технологии»: мотор V8. По прокрутке узлы разъезжаются, блок и головки становятся прозрачными,
// и видно, как работают поршни, шатуны, коленвал, распредвалы и клапаны.
// Модель процедурная и условная — это иллюстрация, а не чертёж.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RED, materials, box, cyl, gearGeo, canvasTex, text, screen } from './kit'

export type Engine = { setProgress(p: number, instant?: boolean): void }
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const ease = (t: number) => 1 - Math.pow(1 - t, 3)
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

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
  inner.position.set(0, 1.2, 0)
  scene.add(inner)

  const M = materials()
  const alu = new THREE.MeshStandardMaterial({ color: 0xb9bfc6, metalness: 0.85, roughness: 0.34, transparent: true })
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.8, roughness: 0.4, transparent: true })
  const liner = new THREE.MeshStandardMaterial({ color: 0x8d949c, metalness: 0.9, roughness: 0.25, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  const header = new THREE.MeshStandardMaterial({ color: 0xa8774f, metalness: 0.95, roughness: 0.28 })   // нержавейка с цветами побежалости
  const black = new THREE.MeshStandardMaterial({ color: 0x15181c, metalness: 0.3, roughness: 0.55 })
  const engine = new THREE.Group()
  scene.add(engine)

  const R = 0.32, L = 1.05            // радиус кривошипа и длина шатуна
  const XS = [-1.35, -0.45, 0.45, 1.35]
  const PHASE = [0, Math.PI / 2, (3 * Math.PI) / 2, Math.PI]   // крестообразный коленвал
  const BANKS = [Math.PI / 4, -Math.PI / 4]                    // развал 90°
  const tube = (p: THREE.Object3D, pts: THREE.Vector3[], r: number, m: THREE.Material, seg = 40) => {
    const o = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 10), m)
    p.add(o)
    return o
  }
  const bolt = (p: THREE.Object3D, x: number, y: number, z: number, axis: 'x' | 'y' | 'z' = 'y', s = 1) => {
    const b = cyl(p, 0.035 * s, 0.05 * s, x, y, z, M.chrome, 0.035 * s, 6)
    if (axis === 'x') b.rotation.z = Math.PI / 2
    if (axis === 'z') b.rotation.x = Math.PI / 2
    return b
  }

  // ---------- картер, опоры, масляный фильтр, стартер ----------
  const crankcase = new THREE.Group()
  engine.add(crankcase)
  box(crankcase, 3.9, 1.3, 1.7, 0, -0.05, 0, iron, 0.08)
  for (const x of [-1.8, -0.9, 0, 0.9, 1.8]) for (const s of [-1, 1]) box(crankcase, 0.07, 1.1, 0.06, x, -0.05, s * 0.86, iron, 0.02)   // рёбра жёсткости
  for (const s of [-1, 1]) {
    box(crankcase, 0.5, 0.32, 0.3, -0.2, -0.1, s * 1.0, black, 0.05)   // опоры двигателя
    box(crankcase, 0.36, 0.08, 0.5, -0.2, -0.3, s * 1.2, M.body, 0.02)
  }
  const filter = new THREE.Group()
  filter.position.set(0.9, -0.25, 1.0)
  filter.rotation.x = Math.PI / 2
  crankcase.add(filter)
  cyl(filter, 0.22, 0.5, 0, 0.25, 0, M.red, 0.22, 28)
  for (let i = 0; i < 3; i++) cyl(filter, 0.225, 0.02, 0, 0.12 + i * 0.13, 0, M.dark, 0.225, 28)
  const starter = new THREE.Group()
  starter.position.set(1.45, -0.45, -1.0)
  crankcase.add(starter)
  cyl(starter, 0.2, 0.7, 0, 0, 0, black, 0.2, 24).rotation.z = Math.PI / 2
  cyl(starter, 0.12, 0.35, 0.05, 0.25, 0, M.chrome, 0.12, 16).rotation.z = Math.PI / 2
  // поддон с рёбрами и пробкой
  const pan = new THREE.Group()
  engine.add(pan)
  box(pan, 3.5, 0.42, 1.3, 0, -0.95, 0, M.dark, 0.1)
  box(pan, 3.6, 0.05, 1.42, 0, -0.73, 0, M.edge, 0.02)
  for (let i = 0; i < 9; i++) box(pan, 0.04, 0.32, 1.32, -1.5 + i * 0.375, -0.98, 0, M.body, 0.01)
  bolt(pan, 1.2, -1.17, 0.3, 'y', 1.6)
  for (let i = 0; i < 10; i++) for (const s of [-1, 1]) bolt(pan, -1.6 + i * 0.355, -0.7, s * 0.67)

  // ---------- блоки цилиндров, головки, распредвалы, клапаны, крышки, выпуск ----------
  const cover = canvasTex(1024, 220, (c, w, h) => {
    c.fillStyle = '#c40000'
    c.fillRect(0, 0, w, h)
    c.strokeStyle = 'rgba(255,255,255,.25)'
    c.lineWidth = 4
    c.strokeRect(10, 10, w - 20, h - 20)
    text(c, 'DMRDETAL', 290, 140, 92, '#ffffff', 800)
  })
  type Valve = { o: THREE.Object3D; base: number; ph: number }
  type Bank = { a: number; s: number; dir: THREE.Vector3; out: THREE.Vector3; head: THREE.Group; cov: THREE.Group; exh: THREE.Group; cams: THREE.Group[]; valves: Valve[] }
  const banks: Bank[] = BANKS.map((a) => {
    const s = Math.sign(a)                 // +1 — правый ряд, −1 — левый
    const g = new THREE.Group()
    g.rotation.x = a                       // локальная ось Y группы — ось цилиндров ряда, локальная Z·s — наружу
    engine.add(g)
    const blockG = new THREE.Group()
    g.add(blockG)
    box(blockG, 3.9, 1.1, 0.9, 0, 1.1, 0, alu, 0.05)
    for (const x of XS) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.1, 28, 1, true), liner)
      t.position.set(x + s * 0.11, 1.1, 0)
      blockG.add(t)
      cyl(blockG, 0.07, 0.03, x + 0.2, 0.95, s * 0.46, M.chrome, 0.07, 16).rotation.x = Math.PI / 2   // заглушки рубашки
    }
    for (let i = 0; i < 8; i++) box(blockG, 0.05, 0.9, 0.04, -1.75 + i * 0.5, 1.05, s * 0.46, alu, 0.01)   // рёбра стенки
    // головка блока
    const head = new THREE.Group()
    g.add(head)
    box(head, 3.95, 0.42, 1.0, 0, 1.86, 0, alu, 0.06)
    box(head, 3.98, 0.04, 1.03, 0, 1.66, 0, M.dark, 0.01)                      // прокладка
    for (let i = 0; i < 10; i++) for (const z of [-0.42, 0.42]) bolt(head, -1.8 + i * 0.4, 2.08, z)
    for (const x of XS) {                                                         // свечи
      cyl(head, 0.05, 0.3, x + 0.15, 2.18, 0, M.white, 0.05, 10)
      cyl(head, 0.035, 0.12, x + 0.15, 2.38, 0, M.chrome, 0.035, 8)
    }
    // распредвалы (по два на головку) и клапаны с пружинами
    const cams: THREE.Group[] = []
    for (const z of [-0.24, 0.24]) {
      const cam = new THREE.Group()
      cam.position.set(0, 1.98, z)
      head.add(cam)
      cyl(cam, 0.05, 4.0, 0, 0, 0, M.chrome, 0.05, 12).rotation.z = Math.PI / 2
      XS.forEach((x, k) => {
        for (const dx of [-0.1, 0.1]) {
          const lobe = box(cam, 0.07, 0.17, 0.12, x + s * 0.11 + dx, 0.03, 0, M.steel, 0.04)
          lobe.rotation.x = PHASE[k] / 2 + (z > 0 ? 0.6 : 0)
        }
      })
      const gear = new THREE.Mesh(gearGeo(0.2, 0.05, 18), M.steel)
      gear.rotation.z = Math.PI / 2
      gear.position.x = -2.05
      cam.add(gear)
      cams.push(cam)
    }
    const valves: Valve[] = []
    XS.forEach((x, k) => {
      for (const z of [-0.24, 0.24]) for (const dx of [-0.1, 0.1]) {
        const v = new THREE.Group()
        v.position.set(x + s * 0.11 + dx, 1.8, z)
        head.add(v)
        cyl(v, 0.018, 0.34, 0, -0.08, 0, M.chrome, 0.018, 6)
        cyl(v, 0.055, 0.015, 0, -0.26, 0, M.chrome, 0.055, 12)                // тарелка клапана
        for (let i = 0; i < 4; i++) cyl(v, 0.045, 0.012, 0, -0.02 + i * 0.035, 0, M.copper, 0.045, 10)   // витки пружины
        valves.push({ o: v, base: 1.8, ph: PHASE[k] / 2 + (z > 0 ? 0.6 : 0) })
      }
    })
    // клапанная крышка с катушками и проводкой
    const cov = new THREE.Group()
    g.add(cov)
    box(cov, 3.8, 0.28, 0.92, 0, 2.21, 0, M.red, 0.1)
    for (let i = 0; i < 6; i++) box(cov, 0.05, 0.05, 0.8, -1.5 + i * 0.6, 2.36, -0.04, M.red, 0.02)
    const lid = screen(cov, 2.6, 0.48, -0.15, 2.39, -0.08, cover.t)
    lid.rotation.x = -Math.PI / 2
    if (a < 0) lid.rotation.z = Math.PI
    for (let i = 0; i < 8; i++) for (const z of [-0.43, 0.43]) bolt(cov, -1.75 + i * 0.5, 2.36, z, 'y', 0.8)
    XS.forEach((x) => box(cov, 0.2, 0.2, 0.2, x + 0.1, 2.43, 0.33, black, 0.04))
    tube(cov, XS.map((x) => V(x + 0.1, 2.55, 0.33)).concat([V(2.05, 2.5, 0.33)]), 0.025, black)
    // выпускной коллектор: четыре трубы на ряд, сходятся в одну
    const exh = new THREE.Group()
    g.add(exh)
    const zo = s * 0.5
    XS.forEach((x, k) => {
      const px = x + s * 0.11
      tube(exh, [V(px, 1.82, zo), V(px, 1.82, zo + s * 0.25), V(px + 0.15 * (1.5 - k), 1.45, zo + s * 0.42), V(0.9, 1.0, zo + s * 0.5), V(1.4, 0.75, zo + s * 0.5)], 0.075, header)
      box(exh, 0.42, 0.3, 0.06, px, 1.82, zo + s * 0.02, header, 0.02)            // фланец
    })
    cyl(exh, 0.13, 0.5, 1.55, 0.7, zo + s * 0.5, header, 0.13, 20).rotation.z = Math.PI / 2
    return { a, s, dir: V(0, Math.cos(a), Math.sin(a)), out: V(0, -Math.sin(a), Math.cos(a)).multiplyScalar(s), head, cov, exh, cams, valves }
  })

  // ---------- впуск: ресивер, патрубки к головкам, топливные рампы с форсунками, дроссель ----------
  const intake = new THREE.Group()
  engine.add(intake)
  box(intake, 3.3, 0.4, 0.66, 0, 1.78, 0, M.body, 0.14)
  for (let i = 0; i < 5; i++) box(intake, 0.06, 0.08, 0.7, -1.3 + i * 0.65, 2.0, 0, M.edge, 0.02)
  const portOf = (bank: Bank, x: number) => bank.dir.clone().multiplyScalar(1.86).add(bank.out.clone().multiplyScalar(-0.5)).setX(x)
  for (const bank of banks) XS.forEach((x) => {
    const px = x + bank.s * 0.11, port = portOf(bank, px)
    tube(intake, [V(px, 1.72, bank.s * 0.2), V(px, 1.75, bank.s * 0.42), port.clone().add(V(0, 0.18, 0)), port], 0.07, M.steel, 24)
    cyl(intake, 0.04, 0.22, px, port.y + 0.2, port.z * 0.8, M.red, 0.04, 8)          // форсунка
  })
  for (const bank of banks) {
    const p0 = portOf(bank, -1.6), p1 = portOf(bank, 1.6)
    tube(intake, [p0.clone().add(V(0, 0.32, -bank.s * 0.07)), p1.clone().add(V(0, 0.32, -bank.s * 0.07))], 0.04, M.chrome, 8)   // топливная рампа
  }
  const tb = cyl(intake, 0.28, 0.42, -1.9, 1.8, 0, M.chrome, 0.28, 32)
  tb.rotation.z = Math.PI / 2
  cyl(intake, 0.2, 0.44, -1.9, 1.8, 0, M.dark, 0.2, 24).rotation.z = Math.PI / 2
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 8, 40), M.redGlow)
  ring.rotation.y = Math.PI / 2
  ring.position.set(-2.12, 1.8, 0)
  intake.add(ring)

  // ---------- коленвал, маховик ----------
  const crank = new THREE.Group()
  engine.add(crank)
  cyl(crank, 0.12, 4.1, 0, 0, 0, M.chrome, 0.12, 20).rotation.z = Math.PI / 2
  for (const x of [-1.8, -0.9, 0, 0.9, 1.8]) cyl(crank, 0.17, 0.12, x, 0, 0, M.steel, 0.17, 20).rotation.z = Math.PI / 2   // коренные шейки
  const cw = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 24, 1, false, -Math.PI / 2, Math.PI)   // противовес-полудиск
  XS.forEach((x, k) => {
    const ph = PHASE[k]
    const py = R * Math.cos(ph), pz = R * Math.sin(ph)
    cyl(crank, 0.1, 0.42, x, py, pz, M.chrome, 0.1, 16).rotation.z = Math.PI / 2
    for (const dx of [-0.25, 0.25]) {
      const web = box(crank, 0.08, 0.62, 0.36, x + dx, py * 0.5, pz * 0.5, M.steel, 0.04)
      web.rotation.x = ph
      const w = new THREE.Mesh(cw, M.steel)
      w.rotation.set(ph + Math.PI, 0, Math.PI / 2, 'XYZ')
      w.position.set(x + dx, 0, 0)
      crank.add(w)
    }
  })
  const flywheel = new THREE.Mesh(gearGeo(0.8, 0.1, 48), M.steel)
  flywheel.rotation.z = Math.PI / 2
  const fly = new THREE.Group()
  fly.add(flywheel)
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; bolt(fly, 0.06, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 'x', 1.4) }
  fly.position.x = 2.15
  engine.add(fly)

  // ---------- передняя крышка ГРМ, навесное и ремень ----------
  const front = new THREE.Group()
  engine.add(front)
  box(front, 0.12, 2.1, 1.9, -2.05, 0.35, 0, M.body, 0.06)
  for (let i = 0; i < 7; i++) bolt(front, -2.12, -0.55 + i * 0.3, 0.9, 'x')
  const P: [number, number, number][] = [   // [радиус, y, z] по кругу, как идёт ремень: коленвал, генератор, ролик, помпа, кондиционер
    [0.42, -0.25, 0], [0.28, 0.75, 0.95], [0.2, 1.45, 0.45], [0.3, 1.45, -0.45], [0.24, 0.6, -0.95],
  ]
  const pulleys: { m: THREE.Mesh; k: number }[] = []
  P.forEach(([r, y, z]) => {
    const p = cyl(front, r, 0.16, -2.25, y, z, M.steel, r, 32)
    p.rotation.z = Math.PI / 2
    cyl(front, r * 0.35, 0.2, -2.27, y, z, M.redGlow, r * 0.35, 16).rotation.z = Math.PI / 2
    for (let j = 0; j < 4; j++) { const a = (j / 4) * Math.PI * 2; bolt(front, -2.35, y + Math.cos(a) * r * 0.6, z + Math.sin(a) * r * 0.6, 'x', 0.8) }
    pulleys.push({ m: p, k: 0.42 / r })
  })
  // генератор и компрессор кондиционера за своими шкивами
  cyl(front, 0.3, 0.55, -1.75, 0.75, 1.05, M.white, 0.3, 28).rotation.z = Math.PI / 2
  for (let i = 0; i < 8; i++) box(front, 0.5, 0.04, 0.05, -1.75, 0.75 + Math.cos(i) * 0.31, 1.05 + Math.sin(i) * 0.31, M.dark, 0.01)
  cyl(front, 0.26, 0.5, -1.75, 0.6, -1.05, black, 0.26, 24).rotation.z = Math.PI / 2
  // ремень обходит шкивы снаружи
  const c0 = V(0, 0.6, 0)
  const beltPts: THREE.Vector3[] = []
  P.forEach(([r, y, z]) => {
    const d = V(0, y, z).sub(c0).normalize()
    for (const t of [-0.5, 0, 0.5]) {
      const ang = Math.atan2(d.z, d.y) + t
      beltPts.push(V(-2.25, y + Math.cos(ang) * (r + 0.03), z + Math.sin(ang) * (r + 0.03)))
    }
  })
  front.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beltPts, true), 160, 0.03, 6, true), M.rubber))
  tube(front, [V(-2.2, 1.45, -0.45), V(-1.9, 1.9, -0.4), V(-1.4, 2.05, -0.1)], 0.07, black)   // шланг от помпы к термостату

  // ---------- поршни и шатуны ----------
  const pistonGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.32, 28)
  const ringGeo = new THREE.TorusGeometry(0.3, 0.012, 6, 32)
  const rodGeo = new THREE.BoxGeometry(0.08, 1, 0.12)
  const capGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.14, 16)
  type Cyl = { x: number; ph: number; bank: Bank; piston: THREE.Group; rod: THREE.Mesh; cap: THREE.Mesh }
  const cyls: Cyl[] = []
  const pistons = new THREE.Group()
  engine.add(pistons)
  banks.forEach((bank) => XS.forEach((x0, k) => {
    const piston = new THREE.Group()
    piston.add(new THREE.Mesh(pistonGeo, M.chrome))
    for (const y of [0.06, 0.1, 0.14]) { const r = new THREE.Mesh(ringGeo, M.dark); r.rotation.x = Math.PI / 2; r.position.y = y; piston.add(r) }
    const pinM = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.62, 10), M.steel)
    pinM.rotation.z = Math.PI / 2
    pinM.position.y = -0.06
    piston.add(pinM)
    piston.quaternion.setFromUnitVectors(V(0, 1, 0), bank.dir)
    pistons.add(piston)
    const rod = new THREE.Mesh(rodGeo, M.steel)
    pistons.add(rod)
    const cap = new THREE.Mesh(capGeo, M.steel)
    cap.rotation.z = Math.PI / 2
    pistons.add(cap)
    cyls.push({ x: x0 + bank.s * 0.11, ph: PHASE[k], bank, piston, rod, cap })
  }))

  // ---------- анимация ----------
  const UP = V(0, 1, 0), pin = V(0, 0, 0), top = V(0, 0, 0), mid = V(0, 0, 0), dir = V(0, 0, 0)
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
      c.cap.position.copy(pin)
    }
    for (const b of banks) {
      b.cams.forEach((cam) => (cam.rotation.x = theta / 2))   // распредвал вдвое медленнее коленвала
      for (const v of b.valves) v.o.position.y = v.base - Math.max(0, Math.sin(theta / 2 + v.ph)) ** 3 * 0.06
    }
  }

  // подписи: точка на каждом узле
  const anchors: Record<string, () => THREE.Vector3> = {
    covers: () => banks[0].dir.clone().multiplyScalar(2.6 + 1.7 * ex).setX(0.6),
    heads: () => banks[1].dir.clone().multiplyScalar(2.1 + 0.95 * ex).setX(-0.9),
    cams: () => banks[0].dir.clone().multiplyScalar(2.0 + 0.95 * ex).setX(-1.2),
    intake: () => V(-0.4, 2.0 + 1.35 * ex, 0),
    exhaust: () => banks[0].dir.clone().multiplyScalar(1.5).add(banks[0].out.clone().multiplyScalar(0.9 + 0.8 * ex)).setX(0.3),
    pistons: () => banks[0].dir.clone().multiplyScalar(1.1).setX(1.35),
    crank: () => V(0.9, 0.35, 0.9),
    pan: () => V(0.2, -1.2 - 1.0 * ex, 0.6),
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
  const tmp = V(0, 0, 0)
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
      b.exh.position.copy(b.out).multiplyScalar(0.8 * ex)
    }
    intake.position.y = 1.35 * ex
    pan.position.y = -1.0 * ex
    front.position.x = -1.1 * ex
    fly.position.x = 2.15 + 0.9 * ex
    // рентген: блок, картер и головки становятся прозрачными
    const op = 1 - xray * 0.84
    for (const m of [alu, iron]) { m.opacity = op; m.depthWrite = op > 0.98 }
    liner.opacity = xray * 0.35
    inner.intensity = xray * 18
    // мотор крутится: на холостых медленно, при разборе быстрее
    theta += dt * (1.6 + cur * 7)
    crank.rotation.x = theta
    flywheel.rotation.y = theta
    pulleys.forEach((p) => (p.m.rotation.y = theta * p.k))
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
      l.style.opacity = String(clamp((cur - 0.35 - i * 0.03) * 5))
    })
    renderer.render(scene, camera)
    if (visible) raf = requestAnimationFrame(frame)
  }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame) } }).observe(root)
  new ResizeObserver(resize).observe(root)
  resize()
  return { setProgress(p, instant) { progress = clamp(p); if (instant) cur = progress } }
}
