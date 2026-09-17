import { useEffect, useRef } from 'react'

interface TrailerModalProps {
  title: string
  youtubeKey: string
  onClose: () => void
}

interface YoutubePlayer {
  setVolume: (value: number) => void
  unMute: () => void
  playVideo: () => void
  destroy: () => void
}

interface YoutubeNamespace {
  Player: new (
    elementId: string,
    options: {
      videoId: string
      playerVars?: Record<string, number | string>
      events?: { onReady?: (event: { target: YoutubePlayer }) => void }
    },
  ) => YoutubePlayer
}

const START_VOLUME = 20
const PLAYER_ID = 'trailer-player'

function youtubeApi(): YoutubeNamespace | undefined {
  return (window as Window & { YT?: YoutubeNamespace }).YT
}

function loadYoutubeApi(): Promise<YoutubeNamespace> {
  const existing = youtubeApi()
  if (existing?.Player) return Promise.resolve(existing)

  return new Promise((resolve) => {
    const previous = (window as Window & { onYouTubeIframeAPIReady?: () => void })
      .onYouTubeIframeAPIReady
    ;(window as Window & { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
      previous?.()
      const api = youtubeApi()
      if (api) resolve(api)
    }

    if (!document.getElementById('youtube-iframe-api')) {
      const script = document.createElement('script')
      script.id = 'youtube-iframe-api'
      script.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(script)
    }
  })
}

export function TrailerModal({ title, youtubeKey, onClose }: TrailerModalProps) {
  const playerRef = useRef<YoutubePlayer | null>(null)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false

    loadYoutubeApi().then((api) => {
      if (cancelled) return
      playerRef.current = new api.Player(PLAYER_ID, {
        videoId: youtubeKey,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(START_VOLUME)
            event.target.unMute()
            event.target.playVideo()
          },
        },
      })
    })

    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [youtubeKey])

  return (
    <div className="trailer-overlay" onClick={onClose} role="presentation">
      <div
        className="trailer-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${title} trailer`}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="trailer-close" onClick={onClose}>
          Close
        </button>
        <div className="trailer-frame-wrap">
          <div id={PLAYER_ID} />
        </div>
      </div>
    </div>
  )
}
