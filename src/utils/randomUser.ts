const adjectives = [
  'Neon', 'Cyber', 'Quantum', 'Glitch', 'Cosmic', 
  'Holo', 'Solar', 'Lunar', 'Vector', 'Pixel', 
  'Crystal', 'Aero', 'Stellar', 'Spectral', 'Matrix'
]

const nouns = [
  'Phoenix', 'Tiger', 'Falcon', 'Nova', 'Rider', 
  'Otter', 'Matrix', 'Orion', 'Pulse', 'Wave', 
  'Nomad', 'Beast', 'Fox', 'Dragon', 'Specter'
]

const neonColors = [
  '#a855f7', // Violet
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#84cc16'  // Lime
]

export interface UserPresence {
  name: string
  color: string
}

export function getRandomUser(): UserPresence {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const color = neonColors[Math.floor(Math.random() * neonColors.length)]
  return {
    name: `${adj} ${noun}`,
    color
  }
}
