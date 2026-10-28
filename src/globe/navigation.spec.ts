import { expect, it } from 'vitest'
import { PerspectiveCamera, Raycaster, Sphere, Vector2, Vector3, Quaternion } from 'three'
import { coordinateToVector } from './geography'
import { wheelPointer, zoomAtPointer, orbitPosition } from './navigation'

it('rotates and zooms together without a staged pause or zoom overshoot', () => {
  for (const [from, to] of [[3.1, 1.2], [1.002, 1.2], [1.2, 3.1]] as const) {
    const start = new Vector3(from, 0, 0), direction = new Vector3(0, 0, -1)
    const turn = new Quaternion().setFromUnitVectors(start.clone().normalize(), direction)
    expect(orbitPosition(start, turn, to, 0).distanceTo(start)).toBeLessThan(1e-10)
    expect(orbitPosition(start, turn, to, 1).distanceTo(direction.clone().multiplyScalar(to))).toBeLessThan(1e-10)
    let previous = 0
    for (const progress of [.05, .1, .25, .5, .75, .9, .95]) {
      const position = orbitPosition(start, turn, to, progress)
      const rotated = start.angleTo(position) / (Math.PI / 2)
      const zoomed = (position.length() - from) / (to - from)
      expect(rotated).toBeGreaterThan(previous)
      expect(rotated).toBeLessThan(1)
      expect(zoomed).toBeCloseTo(rotated, 10)
      expect(position.length()).toBeGreaterThan(Math.min(from, to))
      expect(position.length()).toBeLessThan(Math.max(from, to))
      previous = rotated
    }
    expect(start.toArray()).toEqual([from, 0, 0])
  }
})

it('keeps fractional pointer precision for rounded wheel events without reusing a stale pointer', () => {
  expect(wheelPointer([803, 360], [803.1268, 360.7336])).toEqual([803.1268, 360.7336])
  expect(wheelPointer([804, 360], [803.1268, 360.7336])).toEqual([804, 360])
  expect(wheelPointer([803.4, 360.7], [803.1268, 360.7336])).toEqual([803.4, 360.7])
  expect(wheelPointer([803, 360])).toEqual([803, 360])
})

it.each([1.0025, 1.1, 2])('anchors wheel zoom to the cursor at distance %s', distance => {
  for (const factor of [.7, 1.3]) {
    const camera = new PerspectiveCamera(42, 1.4, .0001, 100)
    camera.position.fromArray(coordinateToVector([1.57, 42.54])).multiplyScalar(distance)
    camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
    const pointer = new Vector2(.3, -.2), ray = new Raycaster()
    ray.setFromCamera(pointer, camera)
    const anchor = ray.ray.intersectSphere(new Sphere(new Vector3(), 1.0003), new Vector3())!
    expect(anchor).not.toBeNull()
    zoomAtPointer(camera, pointer, 1 + (distance - 1) * factor)
    const projected = anchor.clone().project(camera)
    expect(projected.x).toBeCloseTo(pointer.x, 5)
    expect(projected.y).toBeCloseTo(pointer.y, 5)
    expect(camera.position.length()).toBeCloseTo(1 + (distance - 1) * factor, 10)
    expect(camera.getWorldDirection(new Vector3()).dot(camera.position.clone().normalize())).toBeCloseTo(-1, 10)
  }
})

it('zooms safely when the pointer is outside the planet', () => {
  const camera = new PerspectiveCamera(42, 1.4, .01, 100)
  camera.position.set(0, 0, 3.1); camera.lookAt(0, 0, 0)
  zoomAtPointer(camera, new Vector2(1, 1), 2.5)
  expect(camera.position.toArray()).toEqual([0, 0, 2.5])
})
