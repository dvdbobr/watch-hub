import { useEffect, useState } from 'react'

export interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function getTimeLeft(isoDate: string, now = new Date()): TimeLeft | 'today' | 'aired' {
  const target = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(target.getTime())) return 'aired'

  const ms = target.getTime() - now.getTime()
  const sameDay =
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()

  if (ms <= 0) return sameDay ? 'today' : 'aired'

  const totalSeconds = Math.floor(ms / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function Countdown({ airDate }: { airDate: string }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const left = getTimeLeft(airDate, now)

  if (left === 'today') return <p className="countdown-value">Airing today</p>
  if (left === 'aired') return <p className="countdown-value">Already aired</p>

  return (
    <p className="countdown-value" aria-live="polite">
      {left.days > 0 ? `${left.days}d ` : ''}
      {pad(left.hours)}h {pad(left.minutes)}m {pad(left.seconds)}s
    </p>
  )
}
