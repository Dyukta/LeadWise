import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'

const PLAY_MS = 3200

const COLORS = ['#ffffff', '#fde68a', '#f9a8d4', '#bae6fd', '#c4b5fd', '#86efac']
const COUNT = 28

const BURST = Array.from({ length: COUNT }, (_, index) => {
  const angle = (index / COUNT) * Math.PI * 2
  const reach = 1 + (index % 4) * 0.35

  return {
    x: Math.cos(angle) * 170 * reach,
    y: Math.sin(angle) * 55 * reach,
    rotate: (index % 2 === 0 ? 1 : -1) * (200 + index * 15),
    color: COLORS[index % COLORS.length],
    size: 6 + (index % 3) * 2,
    round: index % 3 === 0,
    delay: 0.25 + (index % 5) * 0.04
  }
})

const RAIN = Array.from({ length: 16 }, (_, index) => ({
  left: (index * 61) % 100,
  color: COLORS[index % COLORS.length],
  size: 5 + (index % 3) * 2,
  round: index % 2 === 0,
  duration: 2.6 + (index % 4) * 0.5,
  delay: (index * 0.37) % 2.5
}))

const played = new Set<string>()

export function GoalCelebration({ id, title }: { id: string; title: string }) {
  const still = useReducedMotion()
  const [playing, setPlaying] = useState(() => !played.has(id))

  useEffect(() => {
    if (!playing) return
    played.add(id)
    const timer = window.setTimeout(() => setPlaying(false), PLAY_MS)
    return () => window.clearTimeout(timer)
  }, [playing, id])

  if (still) return null

  return (
    <>
      {!playing && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {RAIN.map((piece, index) => (
            <motion.span
              key={index}
              className="absolute"
              style={{
                left: `${piece.left}%`,
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                borderRadius: piece.round ? 9999 : 2
              }}
              initial={{ top: '-8%', rotate: 0, opacity: 0 }}
              animate={{ top: '108%', rotate: 360, opacity: [0, 1, 1, 0] }}
              transition={{ duration: piece.duration, delay: piece.delay, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {playing && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 overflow-hidden bg-gradient-to-r from-amber-400 via-pink-500 to-violet-600 px-4 text-center text-white"
            style={{ backgroundSize: '200% 100%' }}
            initial={{ opacity: 0, backgroundPosition: '0% 50%' }}
            animate={{ opacity: 1, backgroundPosition: '100% 50%' }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.35 },
              backgroundPosition: { duration: PLAY_MS / 1000, ease: 'linear' }
            }}
          >
            {BURST.map((piece, index) => (
              <motion.span
                key={index}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: piece.size,
                  height: piece.size,
                  marginLeft: -piece.size / 2,
                  marginTop: -piece.size / 2,
                  backgroundColor: piece.color,
                  borderRadius: piece.round ? 9999 : 2
                }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.4 }}
                animate={{ x: piece.x, y: piece.y, rotate: piece.rotate, opacity: [0, 1, 1, 0], scale: 1 }}
                transition={{
                  delay: piece.delay,
                  duration: 2,
                  ease: 'easeOut',
                  opacity: { delay: piece.delay, duration: 2, times: [0, 0.1, 0.75, 1] }
                }}
              />
            ))}

            <motion.span
              className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/25"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.25, 1], rotate: [-30, 12, -6, 0] }}
              transition={{ duration: 0.9, delay: 0.15 }}
            >
              <Trophy className="h-8 w-8" />
            </motion.span>
            <motion.p
              className="relative text-lg font-bold"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              Target reached!
            </motion.p>
            <motion.p
              className="relative max-w-full truncate text-xs font-semibold uppercase tracking-wide text-white/85"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {title}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
