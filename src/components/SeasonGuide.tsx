import { useEffect, useMemo, useRef, useState } from 'react'
import { getSeasonEpisodes, stillUrl } from '../api/tmdb'
import type { EpisodeSummary, SeasonSummary } from '../types'

interface SeasonGuideProps {
  tmdbId: number
  seasons: SeasonSummary[]
}

function scoreLabel(value: number): string {
  return value > 0 ? value.toFixed(1) : '—'
}

function scoreTone(value: number): string {
  if (value >= 8) return 'high'
  if (value >= 6.5) return 'mid'
  if (value > 0) return 'low'
  return 'none'
}

function formatAirDate(iso: string): string {
  if (!iso) return '—'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function EpisodeRow({ episode }: { episode: EpisodeSummary }) {
  const still = stillUrl(episode.stillPath)
  const [broken, setBroken] = useState(false)

  if (!still || broken) return null

  return (
    <tr>
      <td className="col-ep">{String(episode.episodeNumber).padStart(2, '0')}</td>
      <td>
        <div className="episode-cell">
          <img src={still} alt="" className="episode-still" onError={() => setBroken(true)} />
          <div className="episode-copy">
            <p className="episode-name">{episode.name}</p>
            {episode.overview ? <p className="episode-overview">{episode.overview}</p> : null}
          </div>
        </div>
      </td>
      <td className="col-date">{formatAirDate(episode.airDate)}</td>
      <td className="col-runtime">{episode.runtime ? `${episode.runtime} min` : '—'}</td>
      <td className="col-score">
        <span className={`score-chip ${scoreTone(episode.voteAverage)}`}>
          {scoreLabel(episode.voteAverage)}
        </span>
      </td>
    </tr>
  )
}

function EpisodeTable({ episodes }: { episodes: EpisodeSummary[] }) {
  return (
    <div className="episode-table-wrap">
      <table className="episode-table">
        <thead>
          <tr>
            <th className="col-ep">Ep</th>
            <th>Title</th>
            <th className="col-date">Aired</th>
            <th className="col-runtime">Runtime</th>
            <th className="col-score">Rating</th>
          </tr>
        </thead>
        <tbody>
          {episodes.map((episode) => (
            <EpisodeRow
              key={`${episode.seasonNumber}-${episode.episodeNumber}`}
              episode={episode}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface SeasonView {
  seasonNumber: number
  episodes: EpisodeSummary[]
  error: string | null
}

function SeasonBody({
  view,
  seasons,
}: {
  view: SeasonView
  seasons: SeasonSummary[]
}) {
  const current = seasons.find((season) => season.seasonNumber === view.seasonNumber)
  if (!current) return null

  return (
    <>
      <div className="season-panel-meta">
        <div>
          <h3>{current.name}</h3>
          <p>
            {current.episodeCount} episode{current.episodeCount === 1 ? '' : 's'}
            {current.year ? ` · ${current.year}` : ''}
          </p>
        </div>
        <div className="season-avg">
          <span>TMDB average</span>
          <strong className={scoreTone(current.voteAverage)}>{scoreLabel(current.voteAverage)}</strong>
        </div>
      </div>
      {view.error ? <p className="row-error">{view.error}</p> : null}
      {!view.error && view.episodes.length === 0 ? (
        <p className="search-status">No episode stills for this season.</p>
      ) : null}
      {!view.error && view.episodes.length > 0 ? <EpisodeTable episodes={view.episodes} /> : null}
    </>
  )
}

export function SeasonGuide({ tmdbId, seasons }: SeasonGuideProps) {
  const visible = useMemo(
    () => seasons.filter((season) => season.episodeCount > 0),
    [seasons],
  )
  const [active, setActive] = useState(visible[0]?.seasonNumber ?? 1)
  const [view, setView] = useState<SeasonView | null>(null)
  const [layerShown, setLayerShown] = useState(true)
  const viewRef = useRef(view)
  const layerRef = useRef(layerShown)
  viewRef.current = view
  layerRef.current = layerShown

  useEffect(() => {
    if (visible[0] && !visible.some((season) => season.seasonNumber === active)) {
      setActive(visible[0].seasonNumber)
    }
  }, [active, visible])

  useEffect(() => {
    if (!visible.length) return
    let cancelled = false
    let fadeTimer = 0
    let ready: SeasonView | null = null
    let fadedOut = !viewRef.current || !layerRef.current

    function reveal() {
      if (cancelled || !ready || !fadedOut) return
      setView(ready)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return
          layerRef.current = true
          setLayerShown(true)
        })
      })
    }

    if (!fadedOut) {
      layerRef.current = false
      setLayerShown(false)
      fadeTimer = window.setTimeout(() => {
        fadedOut = true
        reveal()
      }, 280)
    }

    function apply(next: SeasonView) {
      ready = next
      reveal()
    }

    getSeasonEpisodes(tmdbId, active)
      .then((episodes) => {
        apply({ seasonNumber: active, episodes, error: null })
      })
      .catch((err: unknown) => {
        apply({
          seasonNumber: active,
          episodes: [],
          error: err instanceof Error ? err.message : 'Could not load episodes',
        })
      })

    return () => {
      cancelled = true
      window.clearTimeout(fadeTimer)
    }
  }, [active, tmdbId, visible.length])

  if (visible.length === 0) return null

  return (
    <section className="season-guide">
      <div className="poster-row-head">
        <h2>Episodes</h2>
      </div>
      <div className="season-panel">
        <div className="season-tabs" role="tablist" aria-label="Seasons">
          {visible.map((season) => (
            <button
              key={season.seasonNumber}
              type="button"
              role="tab"
              aria-selected={season.seasonNumber === active}
              className={season.seasonNumber === active ? 'season-tab active' : 'season-tab'}
              onClick={() => setActive(season.seasonNumber)}
            >
              <span>{season.seasonNumber === 0 ? 'Specials' : `Season ${season.seasonNumber}`}</span>
              {season.voteAverage > 0 ? (
                <span className={`score-chip ${scoreTone(season.voteAverage)}`}>
                  {season.voteAverage.toFixed(1)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className={layerShown ? 'fade-layer' : 'fade-layer is-hidden'}>
          {view ? (
            <SeasonBody view={view} seasons={visible} />
          ) : (
            <div className="episode-pending" aria-label="Loading episodes">
              <span />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

