/**
 * Seeded Random Number Generator
 *
 * Uses a simple Linear Congruential Generator (LCG) algorithm
 * to produce deterministic pseudo-random numbers from a seed.
 *
 * This ensures all players worldwide get the same "random" sequence
 * for the daily challenge when using the same seed (date).
 */

export class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  /**
   * Generate next random number between 0 and 1
   * Uses LCG algorithm: next = (a * seed + c) % m
   */
  next(): number {
    // LCG parameters (same as Java's Random)
    const a = 1103515245
    const c = 12345
    const m = 2147483648 // 2^31

    this.seed = (a * this.seed + c) % m
    return this.seed / m
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min
  }

  /**
   * Shuffle array using Fisher-Yates algorithm with seeded randomness
   */
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1)
      const temp = shuffled[i]
      const swapVal = shuffled[j]
      if (temp !== undefined && swapVal !== undefined) {
        shuffled[i] = swapVal
        shuffled[j] = temp
      }
    }
    return shuffled
  }

  /**
   * Pick n random items from array without replacement
   */
  sample<T>(array: T[], n: number): T[] {
    if (n >= array.length) {
      return this.shuffle(array)
    }
    const shuffled = this.shuffle(array)
    return shuffled.slice(0, n)
  }
}

/**
 * Create a seeded random generator from a date string (YYYYMMDD)
 */
export function createSeededRandom(dateString: string): SeededRandom {
  const seed = parseInt(dateString, 10)
  return new SeededRandom(seed)
}
