import { PerspectiveCamera, Vector2, Vector3, Raycaster, Sphere, Quaternion, MathUtils } from 'three'

/** Rotate along the shortest arc and zoom on the same smooth timeline. */
export function orbitPosition(start: Vector3, turn: Quaternion, distance: number, progress: number): Vector3 {
  const eased = MathUtils.smootherstep(progress, 0, 1)
  return start.clone().normalize().applyQuaternion(new Quaternion().slerp(turn, eased)).multiplyScalar(MathUtils.lerp(start.length(), distance, eased))
}

/** Chrome rounds wheel coordinates, while pointer events retain subpixel precision. */
export function wheelPointer(event: [number, number], pointer?: [number, number]): [number, number] {
  return pointer && event.every((value, index) => Number.isInteger(value) && value === Math.floor(pointer[index]!)) ? pointer : event
}

/** Keep the globe point under the cursor fixed while zooming around Earth's centre. */
export function zoomAtPointer(camera: PerspectiveCamera, pointer: Vector2, distance: number): void {
  const ray = new Raycaster(), sphere = new Sphere(new Vector3(), 1.0003)
  const anchor = new Vector3(), hit = new Vector3(), rotation = new Quaternion()
  camera.updateMatrixWorld()
  ray.setFromCamera(pointer, camera)
  const anchored = ray.ray.intersectSphere(sphere, anchor)
  if (anchored) {anchor.normalize()}
  camera.position.setLength(distance)
  for (let i = 0; i < 12; i++) {
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    if (!anchored) {break}
    ray.setFromCamera(pointer, camera)
    if (!ray.ray.intersectSphere(sphere, hit)) {break}
    hit.normalize()
    rotation.setFromUnitVectors(hit, anchor)
    camera.position.applyQuaternion(rotation)
    if (hit.distanceToSquared(anchor) < 1e-18) {break}
  }
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
}
