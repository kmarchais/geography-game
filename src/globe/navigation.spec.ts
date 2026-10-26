import { expect, it } from 'vitest'
import { PerspectiveCamera, Raycaster, Sphere, Vector2, Vector3 } from 'three'
import { coordinateToVector } from './geography'
import { zoomAtPointer } from './navigation'

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
