import bat from './halloween/bat.svg'
import bone from './halloween/bone.svg'
import candy from './halloween/candy.svg'
import cobweb from './halloween/cobweb.svg'
import ghost from './halloween/ghost.svg'
import moon from './halloween/moon.svg'
import pumpkin from './halloween/pumpkin.svg'
import skull from './halloween/skull.svg'
import spider from './halloween/spider.svg'
import witch from './halloween/witch.svg'
import zombie from './halloween/zombie.svg'
import glowingStar from './amor/glowing-star.svg'
import heart from './amor/heart.svg'
import sparkles from './amor/sparkles.svg'
import twoHearts from './amor/two-hearts.svg'

export const ICONOS_HALLOWEEN = {
  bat,
  bone,
  candy,
  cobweb,
  ghost,
  moon,
  pumpkin,
  skull,
  spider,
  witch,
  zombie,
}

export const ICONOS_AMOR = {
  glowingStar,
  heart,
  sparkles,
  twoHearts,
}

/** Iconos flotantes para ambient idle de Halloween. */
export const HALLOWEEN_ICONOS_IDLE = [
  { id: 'hw-ghost-1', src: ghost, tipo: 'ghost', left: '8%', top: '18%', size: 42, delay: '0s', duration: '9s' },
  { id: 'hw-bat-1', src: bat, tipo: 'bat', left: '78%', top: '12%', size: 36, delay: '0.8s', duration: '7.5s' },
  { id: 'hw-pumpkin-1', src: pumpkin, tipo: 'pumpkin', left: '14%', top: '68%', size: 40, delay: '1.2s', duration: '10s' },
  { id: 'hw-skull-1', src: skull, tipo: 'skull', left: '84%', top: '62%', size: 34, delay: '0.4s', duration: '8.5s' },
  { id: 'hw-spider-1', src: spider, tipo: 'spider', left: '62%', top: '22%', size: 28, delay: '1.6s', duration: '11s' },
  { id: 'hw-candy-1', src: candy, tipo: 'candy', left: '42%', top: '74%', size: 30, delay: '2s', duration: '9.5s' },
  { id: 'hw-zombie-1', src: zombie, tipo: 'zombie', left: '55%', top: '48%', size: 32, delay: '2.4s', duration: '8s' },
  { id: 'hw-bat-2', src: bat, tipo: 'bat', left: '28%', top: '36%', size: 24, delay: '0.6s', duration: '7s' },
  { id: 'hw-witch-1', src: witch, tipo: 'witch', left: '70%', top: '78%', size: 30, delay: '1.8s', duration: '10.5s' },
  { id: 'hw-bone-1', src: bone, tipo: 'bone', left: '88%', top: '34%', size: 26, delay: '1s', duration: '9s' },
  { id: 'hw-ghost-2', src: ghost, tipo: 'ghost', left: '36%', top: '12%', size: 22, delay: '2.8s', duration: '8.2s' },
  { id: 'hw-skull-2', src: skull, tipo: 'skull', left: '6%', top: '48%', size: 22, delay: '1.4s', duration: '9.8s' },
]

/** Iconos que caen al admitir ingreso (Halloween). */
export const HALLOWEEN_ICONOS_INGRESO = [
  { id: 'hw-in-1', src: ghost, left: '10%', delay: '0s', duration: '1.6s', size: 28 },
  { id: 'hw-in-2', src: bat, left: '22%', delay: '0.08s', duration: '1.45s', size: 24 },
  { id: 'hw-in-3', src: pumpkin, left: '34%', delay: '0.12s', duration: '1.7s', size: 30 },
  { id: 'hw-in-4', src: skull, left: '46%', delay: '0.05s', duration: '1.5s', size: 26 },
  { id: 'hw-in-5', src: spider, left: '58%', delay: '0.18s', duration: '1.65s', size: 22 },
  { id: 'hw-in-6', src: candy, left: '70%', delay: '0.1s', duration: '1.55s', size: 24 },
  { id: 'hw-in-7', src: zombie, left: '82%', delay: '0.22s', duration: '1.8s', size: 28 },
  { id: 'hw-in-8', src: bone, left: '16%', delay: '0.15s', duration: '1.4s', size: 22 },
  { id: 'hw-in-9', src: witch, left: '52%', delay: '0.28s', duration: '1.75s', size: 26 },
  { id: 'hw-in-10', src: ghost, left: '64%', delay: '0.2s', duration: '1.6s', size: 20 },
  { id: 'hw-in-11', src: bat, left: '40%', delay: '0.25s', duration: '1.5s', size: 22 },
  { id: 'hw-in-12', src: skull, left: '88%', delay: '0.14s', duration: '1.7s', size: 24 },
]

/** Explosión radial al admitir (Halloween). */
export const HALLOWEEN_ICONOS_BURST = [
  { id: 'hw-b-1', src: ghost, angle: -20, dist: 140, delay: '0.05s', size: 36 },
  { id: 'hw-b-2', src: bat, angle: 25, dist: 160, delay: '0.08s', size: 32 },
  { id: 'hw-b-3', src: pumpkin, angle: -55, dist: 130, delay: '0.1s', size: 38 },
  { id: 'hw-b-4', src: skull, angle: 70, dist: 150, delay: '0.06s', size: 34 },
  { id: 'hw-b-5', src: candy, angle: -100, dist: 125, delay: '0.12s', size: 28 },
  { id: 'hw-b-6', src: spider, angle: 110, dist: 135, delay: '0.09s', size: 26 },
  { id: 'hw-b-7', src: witch, angle: -145, dist: 145, delay: '0.14s', size: 34 },
  { id: 'hw-b-8', src: bone, angle: 155, dist: 120, delay: '0.11s', size: 28 },
  { id: 'hw-b-9', src: zombie, angle: 0, dist: 170, delay: '0.07s', size: 36 },
  { id: 'hw-b-10', src: ghost, angle: 180, dist: 155, delay: '0.15s', size: 30 },
]

/** Vuelo lateral de murciélagos (Halloween). */
export const HALLOWEEN_ICONOS_VUELO = [
  { id: 'hw-v-1', src: bat, from: 'left', top: '18%', delay: '0.2s', duration: '2.2s', size: 40 },
  { id: 'hw-v-2', src: bat, from: 'right', top: '32%', delay: '0.35s', duration: '2s', size: 34 },
  { id: 'hw-v-3', src: bat, from: 'left', top: '58%', delay: '0.5s', duration: '2.4s', size: 30 },
  { id: 'hw-v-4', src: ghost, from: 'right', top: '72%', delay: '0.4s', duration: '2.3s', size: 36 },
]

export const AMOR_ICONOS_IDLE = [
  { id: 'amor-heart-1', src: heart, tipo: 'heart', left: '10%', top: '20%', size: 28, delay: '0s', duration: '8s' },
  { id: 'amor-star-1', src: glowingStar, tipo: 'star', left: '76%', top: '14%', size: 26, delay: '0.7s', duration: '7.5s' },
  { id: 'amor-two-1', src: twoHearts, tipo: 'two', left: '18%', top: '70%', size: 34, delay: '1.1s', duration: '9s' },
  { id: 'amor-spark-1', src: sparkles, tipo: 'spark', left: '82%', top: '58%', size: 30, delay: '0.4s', duration: '8.5s' },
  { id: 'amor-heart-2', src: heart, tipo: 'heart', left: '48%', top: '22%', size: 20, delay: '1.5s', duration: '7s' },
  { id: 'amor-star-2', src: glowingStar, tipo: 'star', left: '62%', top: '72%', size: 22, delay: '1.9s', duration: '10s' },
  { id: 'amor-two-2', src: twoHearts, tipo: 'two', left: '30%', top: '40%', size: 24, delay: '0.9s', duration: '8.8s' },
  { id: 'amor-spark-2', src: sparkles, tipo: 'spark', left: '88%', top: '32%', size: 18, delay: '2.2s', duration: '7.8s' },
]

export const AMOR_ICONOS_INGRESO = [
  { id: 'amor-in-1', src: heart, left: '14%', delay: '0s', duration: '1.5s', size: 24 },
  { id: 'amor-in-2', src: sparkles, left: '30%', delay: '0.08s', duration: '1.4s', size: 22 },
  { id: 'amor-in-3', src: twoHearts, left: '46%', delay: '0.12s', duration: '1.65s', size: 28 },
  { id: 'amor-in-4', src: glowingStar, left: '62%', delay: '0.05s', duration: '1.45s', size: 24 },
  { id: 'amor-in-5', src: heart, left: '78%', delay: '0.18s', duration: '1.55s', size: 20 },
  { id: 'amor-in-6', src: twoHearts, left: '22%', delay: '0.22s', duration: '1.7s', size: 26 },
  { id: 'amor-in-7', src: sparkles, left: '54%', delay: '0.15s', duration: '1.35s', size: 20 },
  { id: 'amor-in-8', src: glowingStar, left: '70%', delay: '0.28s', duration: '1.6s', size: 22 },
  { id: 'amor-in-9', src: heart, left: '38%', delay: '0.2s', duration: '1.55s', size: 22 },
  { id: 'amor-in-10', src: twoHearts, left: '86%', delay: '0.1s', duration: '1.7s', size: 24 },
]

/** Explosión radial al admitir (Amor). */
export const AMOR_ICONOS_BURST = [
  { id: 'amor-b-1', src: heart, angle: -15, dist: 130, delay: '0.05s', size: 32 },
  { id: 'amor-b-2', src: sparkles, angle: 30, dist: 150, delay: '0.08s', size: 28 },
  { id: 'amor-b-3', src: twoHearts, angle: -60, dist: 140, delay: '0.1s', size: 36 },
  { id: 'amor-b-4', src: glowingStar, angle: 75, dist: 145, delay: '0.06s', size: 30 },
  { id: 'amor-b-5', src: heart, angle: -110, dist: 120, delay: '0.12s', size: 26 },
  { id: 'amor-b-6', src: sparkles, angle: 120, dist: 135, delay: '0.09s', size: 24 },
  { id: 'amor-b-7', src: twoHearts, angle: -150, dist: 155, delay: '0.14s', size: 32 },
  { id: 'amor-b-8', src: glowingStar, angle: 165, dist: 125, delay: '0.11s', size: 28 },
]

/** Corazones que suben al admitir (Amor). */
export const AMOR_ICONOS_SUBIDA = [
  { id: 'amor-up-1', src: heart, left: '18%', delay: '0.15s', duration: '2.1s', size: 28 },
  { id: 'amor-up-2', src: twoHearts, left: '36%', delay: '0.3s', duration: '2.3s', size: 32 },
  { id: 'amor-up-3', src: heart, left: '55%', delay: '0.22s', duration: '2s', size: 24 },
  { id: 'amor-up-4', src: sparkles, left: '72%', delay: '0.4s', duration: '2.4s', size: 26 },
  { id: 'amor-up-5', src: glowingStar, left: '88%', delay: '0.28s', duration: '2.2s', size: 24 },
]
