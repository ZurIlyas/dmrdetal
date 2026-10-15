// Общие детали для 3D-сцен: материалы, примитивы, текстуры-надписи.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export const RED = 0xfe0000
export const FONT = '"Tektur", "Manrope", system-ui, sans-serif'

export const mat = (color: number, metalness = 0.2, roughness = 0.45, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra })

export function materials() {
  return {
    body: mat(0x2b3037, 0.75, 0.32),
    base: mat(0x1d2126, 0.8, 0.36),
    edge: mat(0x6b737d, 0.85, 0.25),
    chrome: mat(0xd0d5da, 0.95, 0.16),
    steel: mat(0x9aa1a9, 0.9, 0.3),
    billet: mat(0x7d8288, 0.85, 0.48),
    dark: mat(0x101317, 0.4, 0.42),
    rubber: mat(0x0a0c0f, 0.05, 0.7),
    red: mat(RED, 0.35, 0.3),
    redGlow: mat(RED, 0.2, 0.3, { emissive: RED, emissiveIntensity: 2.2 }),
    white: mat(0xeef0f2, 0.3, 0.35),
    whiteGlow: mat(0xffffff, 0.1, 0.3, { emissive: 0xffffff, emissiveIntensity: 1.6 }),
    green: mat(0x39d98a, 0.1, 0.3, { emissive: 0x39d98a, emissiveIntensity: 1.6 }),
    copper: mat(0xc0703a, 0.9, 0.32),
    glass: mat(0x9fb3c2, 0.3, 0.05, { transparent: true, opacity: 0.16, depthWrite: false }),
    cardboard: mat(0xb88a57, 0, 0.85),
    wood: mat(0x8a6542, 0, 0.8),
  }
}
export type Mats = ReturnType<typeof materials>

const cache = new Map<string, THREE.BufferGeometry>()
export function boxGeo(w: number, h: number, d: number, r = 0.03) {
  const k = `b${w},${h},${d},${r}`
  if (!cache.has(k)) cache.set(k, r ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d))
  return cache.get(k)!
}
export function box(p: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, r = 0.03) {
  const o = new THREE.Mesh(boxGeo(w, h, d, r), m)
  o.position.set(x, y, z)
  o.castShadow = o.receiveShadow = true
  p.add(o)
  return o
}
export function cyl(p: THREE.Object3D, r: number, h: number, x: number, y: number, z: number, m: THREE.Material, r2 = r, seg = 32) {
  const k = `c${r},${r2},${h},${seg}`
  if (!cache.has(k)) cache.set(k, new THREE.CylinderGeometry(r, r2, h, seg))
  const o = new THREE.Mesh(cache.get(k)!, m)
  o.position.set(x, y, z)
  o.castShadow = o.receiveShadow = true
  p.add(o)
  return o
}

/** Шестерня-шкив: цилиндр с зубьями по кругу и ступицей. */
export function gearGeo(r: number, h: number, teeth = 14) {
  const shape = new THREE.Shape()
  const inner = r * 0.86
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2
    const rr = i % 4 === 1 || i % 4 === 2 ? r : inner
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr
    i ? shape.lineTo(x, y) : shape.moveTo(x, y)
  }
  const hole = new THREE.Path()
  hole.absarc(0, 0, r * 0.28, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 6 })
  g.translate(0, 0, -h / 2)
  g.rotateX(Math.PI / 2)
  return g
}

export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')!
  draw(ctx, w, h)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return { t, ctx, cv }
}
export function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, weight = 600) {
  c.fillStyle = color
  c.font = `${weight} ${size}px ${FONT}`
  c.fillText(s, x, y)
}
export function screen(p: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, t: THREE.Texture) {
  const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }))
  o.position.set(x, y, z)
  p.add(o)
  return o
}
