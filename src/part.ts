// Блок «Инженерная точность»: генератор в разборе. По прокрутке узлы разъезжаются вдоль оси,
// у каждого появляется подпись. Модель процедурная и условная — это иллюстрация, а не чертёж.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { materials, box, cyl, gearGeo } from './kit'

export type Exploded = { setProgress(p: number): void }
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const ease = (t: number) => 1 - Math.pow(1 - t, 3)

function lathe(profile: [number, number][], m: THREE.Material, seg = 48) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg)
  const o = new THREE.Mesh(g, m)
  o.castShadow = o.receiveShadow = true
  return o
}

export function initExploded(root: HTMLElement): Exploded | null {
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
  renderer.toneMappingExposure = 1.15
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environmentIntensity = 0.8
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x221111, 1.2))
  const key = new THREE.DirectionalLight(0xffffff, 3)
  key.position.set(3, 6, 5)
  scene.add(key)
  const red = new THREE.PointLight(0xfe0000, 40, 12, 2)
  red.position.set(-3, -1, 2)
  scene.add(red)

  const M = materials()
  const alu = new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 0.85, roughness: 0.32 })
  const rig = new THREE.Group()
  scene.add(rig)
  // узлы вдоль оси X; at — где стоит в сборе, out — куда уезжает в разборе
  const nodes: { o: THREE.Group; at: number; out: number }[] = []
  const node = (at: number, out: number) => { const o = new THREE.Group(); o.position.x = at; rig.add(o); nodes.push({ o, at, out }); return o }
  const axis = (o: THREE.Object3D) => { o.rotation.z = Math.PI / 2; return o }

  // 1. шкив
  const pulley = node(-1.15, -2.9)
  const pl = axis(new THREE.Group())
  pulley.add(pl)
  const grooves: [number, number][] = [[0.12, -0.22]]
  for (let i = 0; i < 6; i++) grooves.push([0.42, -0.2 + i * 0.07], [0.36, -0.165 + i * 0.07])
  grooves.push([0.42, 0.22], [0.12, 0.22])
  pl.add(lathe(grooves, M.dark))
  cyl(pl, 0.13, 0.5, 0, 0, 0, M.chrome, 0.13, 24)
  // 2. крыльчатка
  const fan = node(-0.8, -2.1)
  const fg = axis(new THREE.Group())
  fan.add(fg)
  cyl(fg, 0.62, 0.04, 0, 0, 0, M.steel, 0.62, 48)
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    const b = box(fg, 0.04, 0.16, 0.42, Math.cos(a) * 0.38, 0.08, Math.sin(a) * 0.38, M.steel, 0.01)
    b.rotation.y = -a + 0.5
  }
  // 3. передняя крышка с окнами
  const front = node(-0.45, -1.2)
  const fr = axis(new THREE.Group())
  front.add(fr)
  fr.add(lathe([[0.15, -0.2], [0.6, -0.2], [0.78, -0.08], [0.8, 0.2], [0.76, 0.22]], alu))
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const v = box(fr, 0.07, 0.22, 0.16, Math.cos(a) * 0.79, 0.05, Math.sin(a) * 0.79, M.dark, 0.01)
    v.rotation.y = -a
  }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; cyl(fr, 0.07, 0.1, Math.cos(a) * 0.86, -0.1, Math.sin(a) * 0.86, alu, 0.07, 16) }
  // 4. ротор (когтеобразные полюса и вал)
  const rotor = node(0.05, -0.15)
  const ro = axis(new THREE.Group())
  rotor.add(ro)
  cyl(ro, 0.045, 2.2, 0, 0, 0, M.chrome, 0.045, 16)
  cyl(ro, 0.42, 0.5, 0, 0, 0, M.copper, 0.42, 36)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const c = box(ro, 0.14, 0.46, 0.1, Math.cos(a) * 0.47, i % 2 ? 0.05 : -0.05, Math.sin(a) * 0.47, M.steel, 0.02)
    c.rotation.y = -a
  }
  // 5. статор с медной обмоткой
  const stator = node(0.05, 0.95)
  const sg = axis(new THREE.Group())
  stator.add(sg)
  sg.add(lathe([[0.56, -0.22], [0.82, -0.22], [0.82, 0.22], [0.56, 0.22], [0.56, -0.22]], M.body, 64))
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2
    const w = box(sg, 0.07, 0.56, 0.05, Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6, M.copper, 0.015)
    w.rotation.y = -a
  }
  // 6. задняя крышка, регулятор и клемма
  const rear = node(0.6, 2.0)
  const re = axis(new THREE.Group())
  rear.add(re)
  re.add(lathe([[0.76, -0.22], [0.8, -0.2], [0.8, 0.1], [0.62, 0.26], [0.18, 0.28], [0.15, 0.3]], alu))
  const reg = new THREE.Group()
  reg.position.set(0.95, 0.15, 0)
  rear.add(reg)
  box(reg, 0.32, 0.4, 0.5, 0, 0, 0, M.dark, 0.05)
  cyl(reg, 0.05, 0.22, 0.12, 0.18, 0, M.red, 0.05, 12)
  const gear = new THREE.Mesh(gearGeo(0.2, 0.06, 12), M.redGlow)
  gear.rotation.z = Math.PI / 2
  gear.position.x = 0.32
  rear.add(gear)
  // стяжные болты едут вместе с задней крышкой
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4
    const b = cyl(rear, 0.025, 1.3, -0.5, Math.cos(a) * 0.86, Math.sin(a) * 0.86, M.chrome, 0.025, 10)
    b.rotation.z = Math.PI / 2
  }

  let progress = 0, cur = 0, raf = 0, visible = false, t0 = performance.now()
  function resize() {
    const w = root.clientWidth, h = root.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // на широком экране генератор справа от текста, на узком — ниже
    camera.setViewOffset(w, h, w > 900 ? -w * 0.17 : 0, w > 900 ? 0 : -h * 0.12, w, h)
    camera.updateProjectionMatrix()
  }
  const tmp = new THREE.Vector3()
  function frame(now: number) {
    raf = 0
    const t = (now - t0) / 1000
    cur += (progress - cur) * 0.08
    const e = ease(clamp(cur * 1.25))
    nodes.forEach((n) => (n.o.position.x = n.at + (n.out - n.at) * e))
    rig.rotation.x = Math.sin(t * 0.4) * 0.05 + 0.18
    rig.rotation.y = -0.55 + cur * 0.5 + Math.sin(t * 0.3) * 0.05
    ro.rotation.y = fg.rotation.y = pl.rotation.y = t * (0.6 + e * 0.6)
    const narrow = camera.aspect < 1
    const dist = (narrow ? 13.5 / camera.aspect : 8.6) + e * (narrow ? 2 : 3.4)
    camera.position.set(0.2, 1.6, dist)
    camera.lookAt(0.1, 0, 0)
    labels.forEach((l, i) => {
      const n = nodes[Number(l.dataset.part)]
      tmp.set(0, 0.95, 0).applyMatrix4(n.o.matrixWorld).project(camera)
      l.style.transform = `translate(${((tmp.x + 1) / 2) * root.clientWidth}px, ${((1 - tmp.y) / 2) * root.clientHeight}px)`
      l.style.opacity = String(clamp((cur - 0.25 - i * 0.05) * 5))
    })
    renderer.render(scene, camera)
    if (visible) raf = requestAnimationFrame(frame)
  }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame) }).observe(root)
  new ResizeObserver(resize).observe(root)
  resize()
  return { setProgress(p) { progress = clamp(p) } }
}
