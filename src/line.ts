// Первый экран: производственная линия DMRDETAL. Заготовка едет по конвейеру через пять участков:
// материал → обработка → контроль → маркировка → упаковка. Всё процедурное: без моделей и картинок.
// Линию можно крутить мышью, участки подсвечиваются при наведении, по клику камера подлетает к участку.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RED, materials, box, cyl, gearGeo, canvasTex, text, screen } from './kit'

export type StationId = 'material' | 'machining' | 'control' | 'marking' | 'packing'
export const STATIONS: { id: StationId; name: string; desc: string; x: number }[] = [
  { id: 'material', name: 'Материал', desc: 'Точный подбор материалов для каждой детали.', x: -3.6 },
  { id: 'machining', name: 'Обработка', desc: 'Оборудование того же уровня, что и у мировых автобрендов.', x: -1.5 },
  { id: 'control', name: 'Контроль', desc: 'Многоуровневый контроль качества на каждом этапе.', x: 0.6 },
  { id: 'marking', name: 'Маркировка', desc: 'Стандартизированные процессы на каждом этапе.', x: 2.5 },
  { id: 'packing', name: 'Отгрузка', desc: 'Готовые автокомпоненты едут к покупателю.', x: 4.35 },
]

export type Line = { focus(id: StationId | null): void; dispose(): void }

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const smooth = (t: number) => t * t * (3 - 2 * t)

export function initLine(root: HTMLElement, opts: { onReady?: () => void; onStation?: (id: StationId | null) => void } = {}): Line | null {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!
  const labelsBox = root.querySelector<HTMLElement>('[data-labels]')!
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  // размер берём у холста: на телефоне он ниже текста и меньше всего первого экрана
  const W = () => canvas.clientWidth, H = () => canvas.clientHeight
  renderer.setPixelRatio(Math.min(devicePixelRatio, W() < 900 ? 1.5 : 1.75))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  scene.environment = pmrem.fromScene(room, 0.04).texture
  scene.environmentIntensity = 0.55
  room.dispose()
  pmrem.dispose()

  scene.add(new THREE.HemisphereLight(0xdfe6f0, 0x1a1414, 1.6))
  const key = new THREE.DirectionalLight(0xfff4e6, 3.6)
  key.position.set(-5, 11, 7)
  key.castShadow = true
  key.shadow.mapSize.set(1536, 1536)
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 7, bottom: -7, near: 1, far: 30 })
  key.shadow.bias = -0.0003
  key.shadow.normalBias = 0.03
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xbfd0ff, 2.2)
  rim.position.set(4, 6, -9)
  scene.add(rim)
  const redLight = new THREE.PointLight(RED, 30, 9, 2)
  redLight.position.set(0.6, 2.2, 1.6)
  scene.add(redLight)

  const M = materials()
  const line = new THREE.Group()
  scene.add(line)

  // пол: тень и красная разметка, как на сетке фирменного сайта
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.35 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.36
  floor.receiveShadow = true
  scene.add(floor)
  const grid = new THREE.GridHelper(40, 40, 0x5a1010, 0x2a1416)
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.35
  grid.position.y = -0.355
  scene.add(grid)

  // плита-основание с гравировкой
  box(line, 12.6, 0.34, 5.6, 0, -0.17, 0, M.base, 0.15)
  box(line, 12.4, 0.05, 5.42, 0, 0.02, 0, M.edge, 0.1)
  box(line, 12.3, 0.08, 5.32, 0, 0.07, 0, M.body, 0.08)
  box(line, 11.8, 0.025, 0.03, 0, -0.16, 2.81, M.redGlow, 0.01)
  for (const x of [-5.7, 5.7]) for (const z of [-2.3, 2.3]) cyl(line, 0.07, 0.03, x, 0.125, z, M.chrome, 0.07, 14)
  const plate = canvasTex(1600, 150, (c, w, h) => {
    c.fillStyle = '#1b1f24'
    c.fillRect(0, 0, w, h)
    c.strokeStyle = '#3b4148'
    c.lineWidth = 3
    c.strokeRect(3, 3, w - 6, h - 6)
    text(c, 'DMRDETAL', 40, 92, 56, '#f2f3f5', 800)
    text(c, '·  КАЧЕСТВО, ПРОВЕРЕННОЕ ДОРОГОЙ', 400, 90, 40, '#9aa2ab', 600)
    text(c, 'ЛИНИЯ 01', 1380, 92, 40, '#fe2020', 700)
  })
  const plateMesh = screen(line, 7.4, 0.7, -1.2, 0.115, 2.3, plate.t)
  plateMesh.rotation.x = -Math.PI / 2

  // конвейер: «стадион» — по переднему пути детали едут вперёд, по заднему лента возвращается
  const R = 0.85, X0 = -4.3, X1 = 4.3, ZF = 0.55, ZB = ZF - 2 * R, BY = 0.62
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector3(X0 + ((X1 - X0) * i) / 20, BY, ZF))
  for (let i = 1; i < 16; i++) { const a = Math.PI / 2 - (i / 16) * Math.PI; pts.push(new THREE.Vector3(X1 + Math.cos(a) * R, BY, ZF - R + Math.sin(a) * R)) }
  for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector3(X1 - ((X1 - X0) * i) / 20, BY, ZB))
  for (let i = 1; i < 16; i++) { const a = -Math.PI / 2 - (i / 16) * Math.PI; pts.push(new THREE.Vector3(X0 + Math.cos(a) * R, BY, ZF - R + Math.sin(a) * R)) }
  const path = new THREE.CatmullRomCurve3(pts, true, 'centripetal')
  const beltFrame = new THREE.Mesh(new THREE.TubeGeometry(path, 200, 0.36, 10, true), M.dark)
  beltFrame.scale.y = 0.35
  beltFrame.position.y = BY * 0.62
  beltFrame.castShadow = beltFrame.receiveShadow = true
  line.add(beltFrame)
  for (const side of [-1, 1]) {
    const rp: THREE.Vector3[] = []
    const p = new THREE.Vector3(), t = new THREE.Vector3()
    for (let i = 0; i <= 220; i++) {
      path.getPointAt(i / 220, p)
      path.getTangentAt(i / 220, t)
      rp.push(p.clone().add(new THREE.Vector3(-t.z * 0.37 * side, 0.07, t.x * 0.37 * side)))
    }
    line.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rp, true), 220, 0.026, 6, true), M.chrome))
  }
  for (let i = 0; i < 14; i++) {
    const p = path.getPointAt(i / 14)
    cyl(line, 0.05, BY - 0.1, p.x, (BY - 0.1) / 2 + 0.1, p.z, M.steel, 0.05, 12)
  }
  const SLATS = 170
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.05, 0.62), M.body, SLATS)
  slats.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  slats.receiveShadow = true
  line.add(slats)
  const dummy = new THREE.Object3D(), pv = new THREE.Vector3(), tv = new THREE.Vector3()
  function updateSlats(t: number) {
    for (let i = 0; i < SLATS; i++) {
      const u = (i / SLATS + t * 0.018) % 1
      path.getPointAt(u, pv)
      path.getTangentAt(u, tv)
      dummy.position.copy(pv)
      dummy.rotation.set(0, -Math.atan2(tv.z, tv.x), 0)
      dummy.updateMatrix()
      slats.setMatrixAt(i, dummy.matrix)
    }
    slats.instanceMatrix.needsUpdate = true
  }

  // ---------- участки ----------
  type St = (typeof STATIONS)[number] & { group: THREE.Group; glow: THREE.MeshStandardMaterial; label: HTMLElement; anchor: THREE.Vector3 }
  const st: St[] = []
  STATIONS.forEach((d, i) => {
    const group = new THREE.Group()
    group.position.set(d.x, 0.1, 0)
    line.add(group)
    const glow = M.redGlow.clone()
    glow.emissiveIntensity = 0.35
    box(group, 1.5, 0.03, 0.06, 0, 0.02, ZB - 0.6, glow, 0.01)
    const label = document.createElement('button')
    label.className = 'st-label'
    label.type = 'button'
    label.innerHTML = `<i></i><span><b>${String(i + 1).padStart(2, '0')}</b>${d.name}</span>`
    labelsBox.appendChild(label)
    st.push({ ...d, group, glow, label, anchor: new THREE.Vector3(d.x, 2.6, -0.3) })
  })
  const g = (id: StationId) => st.find((s) => s.id === id)!.group

  // 01 материал: бункер над лентой и пирамида заготовок рядом
  const mat1 = g('material')
  for (const x of [-0.55, 0.55]) box(mat1, 0.12, 1.9, 0.12, x, 0.95, ZB - 0.3, M.body, 0.03)
  const hopper = cyl(mat1, 0.55, 0.7, 0, 1.75, ZF - 0.05, M.white, 0.2, 28)
  hopper.material = M.white
  box(mat1, 1.3, 0.12, 0.2, 0, 1.95, ZB - 0.3, M.red, 0.04)
  box(mat1, 0.12, 0.12, 1.25, 0, 1.95, (ZB - 0.3 + ZF) / 2, M.body, 0.03)
  for (let row = 0; row < 3; row++)
    for (let k = 0; k < 3 - row; k++) {
      const b = cyl(mat1, 0.13, 0.9, -0.5 + k * 0.27 + row * 0.135, 0.2 + row * 0.23, ZB - 1.05, M.billet, 0.13, 20)
      b.rotation.z = Math.PI / 2
    }

  // 02 обработка: станок-портал над лентой, шпиндель ходит вниз, когда под ним деталь
  const mach = g('machining')
  box(mach, 0.3, 1.9, 1.9, -0.85, 0.95, ZF - 0.55, M.body, 0.06)
  box(mach, 0.3, 1.9, 1.9, 0.85, 0.95, ZF - 0.55, M.body, 0.06)
  box(mach, 2.0, 0.55, 1.9, 0, 2.15, ZF - 0.55, M.white, 0.08)
  box(mach, 2.02, 0.08, 1.92, 0, 1.86, ZF - 0.55, M.red, 0.02)
  const glass = box(mach, 1.42, 1.25, 0.03, 0, 1.15, ZF + 0.42, M.glass, 0.01)
  glass.castShadow = false
  const spindle = new THREE.Group()
  spindle.position.set(0, 1.55, ZF)
  mach.add(spindle)
  cyl(spindle, 0.17, 0.42, 0, 0, 0, M.body, 0.17, 24)
  cyl(spindle, 0.06, 0.32, 0, -0.34, 0, M.chrome, 0.03, 16)
  const sparkGeo = new THREE.BufferGeometry()
  const SP = 60, sparkPos = new Float32Array(SP * 3), sparkVel: number[] = []
  for (let i = 0; i < SP; i++) sparkVel.push(Math.random() * 2 - 1, Math.random() * 1.6 + 0.4, Math.random() * 2 - 1, Math.random())
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3))
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xffb04a, size: 0.05, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }))
  sparks.position.set(0, 0.9, ZF)
  mach.add(sparks)
  const millTex = canvasTex(512, 200, () => {})
  screen(mach, 1.2, 0.46, 0, 2.15, ZF + 0.405, millTex.t)

  // 03 контроль: арка-сканер с красной лазерной плоскостью
  const ctrl = g('control')
  for (const x of [-0.62, 0.62]) box(ctrl, 0.18, 1.7, 0.4, x, 0.85, ZF, M.white, 0.06)
  box(ctrl, 1.42, 0.24, 0.4, 0, 1.75, ZF, M.white, 0.06)
  box(ctrl, 1.06, 0.04, 0.42, 0, 1.6, ZF, M.redGlow, 0.01)
  const laser = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.38), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }))
  laser.rotation.x = -Math.PI / 2
  laser.position.set(0, 1.1, ZF)
  ctrl.add(laser)
  const ctrlTex = canvasTex(512, 300, () => {})
  const ctrlScreen = new THREE.Group()
  ctrlScreen.position.set(1.15, 0, ZB - 0.25)
  ctrl.add(ctrlScreen)
  cyl(ctrlScreen, 0.05, 1.3, 0, 0.65, 0, M.steel, 0.05, 12)
  box(ctrlScreen, 0.95, 0.6, 0.06, 0, 1.45, 0, M.dark, 0.03)
  screen(ctrlScreen, 0.88, 0.52, 0, 1.45, 0.035, ctrlTex.t)
  ctrlScreen.rotation.y = -0.35

  // 04 маркировка: стойка с рукой и лазерной головкой
  const mark = g('marking')
  box(mark, 0.26, 1.85, 0.26, 0, 0.93, ZB - 0.25, M.body, 0.05)
  box(mark, 0.22, 0.2, 1.25, 0, 1.75, (ZB - 0.25 + ZF) / 2 + 0.05, M.white, 0.05)
  const head = box(mark, 0.3, 0.38, 0.3, 0, 1.5, ZF, M.body, 0.05)
  const nozzle = cyl(mark, 0.05, 0.12, 0, 1.25, ZF, M.redGlow, 0.03, 12)
  const markLight = new THREE.PointLight(RED, 0, 2.2, 2)
  markLight.position.set(0, 0.95, ZF)
  mark.add(markLight)
  void head

  // 05 отгрузка: ящик в конце ленты и паллета с коробками
  const pack = g('packing')
  const crate = new THREE.Group()
  crate.position.set(0.25, 0, ZF - 0.85)
  pack.add(crate)
  box(crate, 1.0, 0.06, 1.0, 0, 0.1, 0, M.cardboard, 0.01)
  box(crate, 1.0, 0.55, 0.05, 0, 0.38, 0.48, M.cardboard, 0.01)
  box(crate, 1.0, 0.55, 0.05, 0, 0.38, -0.48, M.cardboard, 0.01)
  box(crate, 0.05, 0.55, 1.0, 0.48, 0.38, 0, M.cardboard, 0.01)
  const stamp = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#b88a57'
    c.fillRect(0, 0, w, h)
    c.strokeStyle = '#7a1010'
    c.lineWidth = 6
    c.strokeRect(12, 12, w - 24, h - 24)
    text(c, 'DMR', 44, 86, 54, '#8a1010', 800)
  })
  const stampMat = new THREE.MeshStandardMaterial({ map: stamp.t, roughness: 0.85 })
  for (let k = 0; k < 4; k++) {
    const b = box(pack, 0.5, 0.36, 0.5, -0.05 + (k % 2) * 0.54, 0.28 + Math.floor(k / 2) * 0.38, ZB - 0.85, M.cardboard, 0.015)
    b.rotation.y = (k % 3) * 0.03
    screen(b, 0.36, 0.18, 0, 0, 0.252, stamp.t)
  }
  void stampMat
  box(pack, 1.15, 0.09, 0.62, 0.22, 0.06, ZB - 0.85, M.wood, 0.01)

  // ---------- детали на ленте ----------
  const billetGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.26, 28)
  const partGeo = gearGeo(0.27, 0.16, 16)
  const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.24, 20)
  const ringGeo = new THREE.TorusGeometry(0.33, 0.012, 6, 40)
  type Part = { g: THREE.Group; billet: THREE.Mesh; part: THREE.Group; ring: THREE.Mesh; ringMat: THREE.MeshBasicMaterial; dot: THREE.Mesh; s: number }
  const parts: Part[] = []
  const N = 7
  for (let i = 0; i < N; i++) {
    const pg = new THREE.Group()
    line.add(pg)
    const billet = new THREE.Mesh(billetGeo, M.billet)
    billet.castShadow = true
    pg.add(billet)
    const part = new THREE.Group()
    const gm = new THREE.Mesh(partGeo, M.chrome)
    gm.castShadow = true
    part.add(gm)
    const hub = new THREE.Mesh(hubGeo, M.steel)
    part.add(hub)
    pg.add(part)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x39d98a, transparent: true, opacity: 0, depthWrite: false })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = -0.1
    pg.add(ring)
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), M.redGlow)
    dot.rotation.x = -Math.PI / 2
    dot.position.set(0.15, 0.1, 0)
    part.add(dot)
    parts.push({ g: pg, billet, part, ring, ringMat, dot, s: i / N })
  }
  const SPEED = 0.042   // доля пути в секунду
  const XA = -3.75, XB = 4.15
  const xm = STATIONS.map((s) => s.x)

  // ---------- экраны ----------
  function drawMill(t: number, busy: boolean) {
    const c = millTex.ctx
    c.fillStyle = '#0f1216'
    c.fillRect(0, 0, 512, 200)
    text(c, 'ОБРАБОТКА', 26, 56, 34, '#e9ecef', 700)
    text(c, busy ? 'В РАБОТЕ' : 'ГОТОВ', 330, 56, 26, busy ? '#fe2020' : '#39d98a', 700)
    c.fillStyle = '#262c33'
    c.fillRect(26, 92, 460, 14)
    c.fillStyle = '#fe0000'
    c.fillRect(26, 92, 460 * ((t * 0.37) % 1), 14)
    for (let i = 0; i < 18; i++) {
      c.fillStyle = i % 5 === 0 ? '#59616b' : '#2c333b'
      c.fillRect(26 + i * 26, 132 + (i % 3) * 8, 16, 40 - (i % 3) * 8)
    }
    millTex.t.needsUpdate = true
  }
  let checked = 0
  function drawCtrl(t: number, flash: number) {
    const c = ctrlTex.ctx
    c.fillStyle = '#0f1216'
    c.fillRect(0, 0, 512, 300)
    text(c, 'КОНТРОЛЬ', 26, 54, 34, '#e9ecef', 700)
    c.strokeStyle = '#2c333b'
    c.lineWidth = 2
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(26, 90 + i * 30); c.lineTo(486, 90 + i * 30); c.stroke() }
    c.strokeStyle = '#fe2020'
    c.lineWidth = 4
    c.beginPath()
    for (let x = 0; x <= 460; x += 6) {
      const y = 165 + Math.sin(x * 0.045 + t * 3) * 26 * Math.exp(-((x - 230) ** 2) / 20000)
      x ? c.lineTo(26 + x, y) : c.moveTo(26 + x, y)
    }
    c.stroke()
    text(c, 'ПРОВЕРЕНО', 26, 272, 26, flash > 0 ? '#39d98a' : '#59616b', 700)
    text(c, String(checked).padStart(4, '0'), 360, 272, 30, '#e9ecef', 700)
    ctrlTex.t.needsUpdate = true
  }

  // ---------- камера, управление ----------
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.enablePan = false
  controls.enableZoom = false
  controls.minPolarAngle = 0.35
  controls.maxPolarAngle = 1.32
  controls.rotateSpeed = 0.5
  controls.target.set(0, 0.7, 0)
  if (matchMedia('(pointer:coarse)').matches) controls.enableRotate = false   // на телефоне палец листает страницу
  const HOME_DIR = new THREE.Vector3(6.8, 6.6, 11.6).normalize()
  // на телефоне смотрим на линию по диагонали сверху: она уходит вглубь и не сплющивается в полоску
  const NARROW_DIR = new THREE.Vector3(10, 10.5, 5.6).normalize()
  const HOME = HOME_DIR.clone().multiplyScalar(17.5)
  camera.position.copy(HOME)
  let focusId: StationId | null = null
  const camGoal = new THREE.Vector3().copy(HOME), tgtGoal = new THREE.Vector3(0, 0.7, 0)
  let flying = 0, lastUser = -10

  function focus(id: StationId | null) {
    focusId = id
    if (id) {
      const s = st.find((x) => x.id === id)!
      tgtGoal.set(s.x, 1.0, 0.2)
      camGoal.set(s.x + 2.6, 3.3, 6.2)
    } else {
      tgtGoal.set(0, 0.7, 0)
      camGoal.copy(HOME)
    }
    flying = 1
    st.forEach((s) => s.label.classList.toggle('on', s.id === id))
    opts.onStation?.(id)
  }
  controls.addEventListener('start', () => { flying = 0; lastUser = clock.elapsedTime })

  let wide = true, sized = false
  function resize() {
    const w = W(), h = H()
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    wide = w > 900
    // на широком экране линия справа от заголовка, на узком — ниже текста
    camera.setViewOffset(w, h, wide ? -w * 0.16 : 0, 0, w, h)
    camera.fov = 32
    // линия длиной ~13 должна поместиться по ширине кадра: на узком экране камера отходит дальше
    if (wide) HOME.copy(HOME_DIR).multiplyScalar(20.5)
    else HOME.copy(NARROW_DIR).multiplyScalar(Math.min(38, Math.max(16, 12.2 / (0.573 * camera.aspect))))
    if (!sized) { camera.position.copy(HOME); sized = true }   // первый кадр сразу с нужного ракурса
    else if (!focusId) { camGoal.copy(HOME); flying = 1 }
    camera.updateProjectionMatrix()
  }

  // ---------- наведение и клики ----------
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2()
  let hovered: StationId | null = null
  function pick(e: PointerEvent): StationId | null {
    const r = canvas.getBoundingClientRect()
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(mouse, camera)
    const hit = ray.intersectObjects(st.map((s) => s.group), true)[0]
    if (!hit) return null
    let o: THREE.Object3D | null = hit.object
    while (o && !st.some((s) => s.group === o)) o = o.parent
    return o ? st.find((s) => s.group === o)!.id : null
  }
  let downAt = 0, downX = 0
  const onMove = (e: PointerEvent) => {
    hovered = pick(e)
    canvas.style.cursor = hovered ? 'pointer' : 'grab'
    st.forEach((s) => s.label.classList.toggle('hover', s.id === hovered))
  }
  const onDown = (e: PointerEvent) => { downAt = performance.now(); downX = e.clientX }
  const onUp = (e: PointerEvent) => {
    if (performance.now() - downAt > 300 || Math.abs(e.clientX - downX) > 6) return
    const id = pick(e)
    focus(id && id !== focusId ? id : null)
  }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  st.forEach((s) => s.label.addEventListener('click', () => focus(s.id === focusId ? null : s.id)))

  // ---------- кадр ----------
  const clock = new THREE.Clock()
  let raf = 0, visible = true, ready = false, sim = 0
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const tmp = new THREE.Vector3()
  let ctrlFlash = 0, lastScanned = -1

  function frame() {
    raf = 0
    const dt = Math.min(clock.getDelta(), 0.05)
    const t = clock.elapsedTime
    if (!reduce) sim += dt
    updateSlats(sim)

    // детали
    let busy = false
    for (const p of parts) {
      const s = (p.s + sim * SPEED) % 1
      const x = XA + (XB - XA) * s
      p.g.position.set(x, BY + 0.17, ZF)
      // появляется из бункера и падает в ящик
      const appear = smooth(clamp((x - XA) / 0.35))
      const fall = clamp((x - (XB - 0.35)) / 0.35)
      p.g.scale.setScalar(appear * (1 - fall * 0.6))
      p.g.position.y = BY + 0.17 - fall * 0.5 + (1 - appear) * 0.6
      const machined = x > xm[1] + 0.05
      p.billet.visible = !machined
      p.part.visible = machined
      p.part.rotation.y = machined ? t * 0.8 : 0
      if (Math.abs(x - xm[1]) < 0.18) busy = true
      // контроль: зелёное кольцо после сканера
      const after = x - xm[2]
      p.ringMat.opacity = after > 0 && after < 1.4 ? (1 - after / 1.4) * 0.9 : 0
      p.ring.scale.setScalar(1 + clamp(after) * 0.4)
      if (after > 0 && after < 0.1 && lastScanned !== parts.indexOf(p)) { lastScanned = parts.indexOf(p); checked++; ctrlFlash = 0.8 }
      p.dot.visible = x > xm[3]
    }
    // шпиндель и искры
    spindle.position.y += ((busy ? 1.2 : 1.55) - spindle.position.y) * 0.15
    ;(sparks.material as THREE.PointsMaterial).opacity = busy ? 0.95 : Math.max(0, (sparks.material as THREE.PointsMaterial).opacity - dt * 3)
    for (let i = 0; i < SP; i++) {
      const life = (sparkVel[i * 4 + 3] + t * 1.7) % 1
      sparkPos[i * 3] = sparkVel[i * 4] * life * 0.55
      sparkPos[i * 3 + 1] = sparkVel[i * 4 + 1] * life * 0.45 - life * life * 0.6
      sparkPos[i * 3 + 2] = sparkVel[i * 4 + 2] * life * 0.45
    }
    sparkGeo.attributes.position.needsUpdate = true
    // лазер сканера и маркировка
    laser.position.y = 0.95 + Math.sin(t * 3.2) * 0.3
    const nearMark = parts.some((p) => Math.abs(p.g.position.x - xm[3]) < 0.12)
    markLight.intensity += ((nearMark ? 6 : 0) - markLight.intensity) * 0.3
    ;(nozzle.material as THREE.MeshStandardMaterial).emissiveIntensity = 1 + markLight.intensity * 0.4
    ctrlFlash = Math.max(0, ctrlFlash - dt)
    if (Math.floor(t * 20) % 2 === 0) { drawMill(t, busy); drawCtrl(t, ctrlFlash) }
    redLight.intensity = 22 + Math.sin(t * 2) * 6

    // подсветка участков
    for (const s of st) {
      const on = s.id === hovered || s.id === focusId
      s.glow.emissiveIntensity += ((on ? 2.6 : 0.35) - s.glow.emissiveIntensity) * 0.15
    }

    // камера: перелёт к участку, медленный облёт в покое
    if (flying > 0) {
      camera.position.lerp(camGoal, 0.06)
      controls.target.lerp(tgtGoal, 0.08)
      if (camera.position.distanceTo(camGoal) < 0.05) flying = 0
    } else if (!focusId && !reduce && t - lastUser > 4) {
      const a = Math.sin(t * 0.12) * 0.22
      tmp.copy(HOME).applyAxisAngle(new THREE.Vector3(0, 1, 0), a)
      camera.position.lerp(tmp, 0.01)
    }
    controls.update()

    // подписи участков
    const w = W(), h = H()
    for (const s of st) {
      tmp.copy(s.anchor).project(camera)
      const hidden = tmp.z > 1
      s.label.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`
      s.label.style.opacity = hidden ? '0' : ''
    }

    renderer.render(scene, camera)
    if (!ready) { ready = true; opts.onReady?.() }
    if (visible) raf = requestAnimationFrame(frame)
  }
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame) }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { clock.getDelta(); kick() } })
  io.observe(root)
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()
  kick()

  return {
    focus,
    dispose() {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
    },
  }
}
