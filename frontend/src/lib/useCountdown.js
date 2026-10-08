import { useEffect, useState } from 'react'

/** Secondes restantes avant `deadline` (horodatage en ms, ou null), mises à jour chaque seconde. */
export function useCountdown(deadline) {
  const [remaining, setRemaining] = useState(() => secondsUntil(deadline))

  useEffect(() => {
    setRemaining(secondsUntil(deadline))
    if (!deadline) return undefined
    const timer = setInterval(() => {
      const seconds = secondsUntil(deadline)
      setRemaining(seconds)
      if (seconds === 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  return remaining
}

function secondsUntil(deadline) {
  return deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0
}

/** 65 → « 01:05 ». */
export function formatMinutesSeconds(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}
