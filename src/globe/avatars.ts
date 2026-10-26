export const avatarPresets = [
  { id: 'earth', name: 'Earth', symbol: '🌍', color: '#194337' },
  { id: 'compass', name: 'Compass', symbol: '🧭', color: '#423522' },
  { id: 'mountain', name: 'Mountain', symbol: '🏔️', color: '#283a51' },
  { id: 'island', name: 'Island', symbol: '🏝️', color: '#254743' },
  { id: 'volcano', name: 'Volcano', symbol: '🌋', color: '#4a302e' },
  { id: 'wave', name: 'Wave', symbol: '🌊', color: '#1b3c56' },
] as const

export async function resizeAvatar(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error('Choose a PNG, JPEG, or WebP photo under 10 MB.')
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image(); image.src = url
    try {await image.decode()} catch {throw new Error('Could not read this photo. Try another image.')}
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40000000) {
      throw new Error('Choose a photo smaller than 40 megapixels.')
    }
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
    const context = canvas.getContext('2d')!
    context.fillStyle = '#10252b'; context.fillRect(0, 0, 256, 256)
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256)
    return canvas.toDataURL('image/jpeg', .82)
  } finally {URL.revokeObjectURL(url)}
}
