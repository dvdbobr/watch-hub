import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  backdropUrl,
  getRecommendations,
  getTitleDetails,
  hasApiKey,
  posterUrl,
} from '../api/tmdb'
import { Countdown } from '../components/Countdown'
import { PosterRow } from '../components/PosterRow'
import { ProgressControl } from '../components/ProgressControl'
import { TrailerModal } from '../components/TrailerModal'
import { genreSlugFromIds } from '../data/catalog'
import { useCollection } from '../store/CollectionContext'
import { isMediaType, type TitleDetails, type TmdbTitle } from '../types'

const TYPE_LABEL = {
  movie: 'Movie',
  tv: 'Series',
  anime: 'Anime',
} as const

export function TitlePage() {
  const { type, id } = useParams()
  const mediaType = isMediaType(type) ? type : null
  const tmdbId = Number(id)
  const { addTitle, isInLibrary, getItem, setEpisodesWatched, setStatus, removeTitle } =
    useCollection()

  const [details, setDetails] = useState<TitleDetails | null>(null)
  const [similar, setSimilar] = useState<TmdbTitle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [trailerOpen, setTrailerOpen] = useState(false)

  useEffect(() => {
    if (!mediaType || !Number.isFinite(tmdbId) || tmdbId <= 0 || !hasApiKey()) {
      setDetails(null)
      setSimilar([])
      setLoading(false)
      setError(mediaType ? 'Missing title.' : 'Unknown title type.')
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setTrailerOpen(false)

    getTitleDetails(mediaType, tmdbId)
      .then(async (next) => {
        if (cancelled) return
        setDetails(next)
        try {
          const recs = await getRecommendations(next)
          if (!cancelled) setSimilar(recs)
        } catch {
          if (!cancelled) setSimilar([])
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setDetails(null)
        setError(err instanceof Error ? err.message : 'Could not load this title.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mediaType, tmdbId])

  async function handleAdd() {
    if (!details) return
    setAdding(true)
    try {
      await addTitle(details)
    } finally {
      setAdding(false)
    }
  }

  const owned = details ? getItem(details.mediaType, details.tmdbId) : undefined
  const inLibrary = details ? isInLibrary(details.mediaType, details.tmdbId) : false
  const poster = details ? posterUrl(details.posterPath, 'w500') : null
  const backdrop = details ? backdropUrl(details.backdropPath) : null
  const similarGenre = details
    ? genreSlugFromIds(details.genreIds, details.mediaType)
    : null
  const similarBrowse = details
    ? `/browse?kind=${details.mediaType}${similarGenre ? `&genre=${similarGenre}` : ''}`
    : undefined
  const facts = details
    ? [
        TYPE_LABEL[details.mediaType],
        details.year,
        details.runtime ? `${details.runtime} min` : null,
        details.totalEpisodes ? `${details.totalEpisodes} episodes` : null,
      ].filter(Boolean)
    : []

  return (
    <div className="page">
      {loading ? <p className="empty-state">Loading description…</p> : null}
      {error ? <p className="row-error">{error}</p> : null}
      {details ? (
        <>
          <section className="title-hero" style={backdrop ? { ['--title-bg' as string]: `url(${backdrop})` } : undefined}>
            <div className="title-layout">
              {poster ? (
                <img className="title-poster" src={poster} alt="" />
              ) : (
                <div className="title-poster title-poster-fallback">{details.title}</div>
              )}
              <div className="title-copy">
                <p className="title-kicker">{facts.join(' · ')}</p>
                <h1>{details.title}</h1>
                {details.tagline ? <p className="title-tagline">{details.tagline}</p> : null}
                {details.genres.length > 0 ? (
                  <div className="title-genres">
                    {details.genres.map((genre) => (
                      <span key={genre}>{genre}</span>
                    ))}
                  </div>
                ) : null}
                <p className="title-overview">
                  {details.overview || 'No description is available for this title yet.'}
                </p>
                <div className="title-stats">
                  <div className="stat-card">
                    <p className="stat-label">TMDB score</p>
                    {details.voteCount > 0 ? (
                      <>
                        <p className="stat-score">
                          {details.voteAverage.toFixed(1)}
                          <span> / 10</span>
                        </p>
                        <p className="stat-sub">
                          {details.voteCount.toLocaleString()} review
                          {details.voteCount === 1 ? '' : 's'}
                        </p>
                      </>
                    ) : (
                      <p className="stat-sub">No score yet</p>
                    )}
                  </div>
                  {details.mediaType !== 'movie' ? (
                    <div className="stat-card">
                      <p className="stat-label">Next episode</p>
                      {details.nextEpisode ? (
                        <>
                          <p className="stat-episode">
                            S{details.nextEpisode.seasonNumber} E{details.nextEpisode.episodeNumber}
                          </p>
                          <p className="stat-sub">{details.nextEpisode.name}</p>
                          <Countdown airDate={details.nextEpisode.airDate} />
                        </>
                      ) : (
                        <p className="stat-sub">
                          {details.status === 'Ended' || details.status === 'Canceled'
                            ? 'No more episodes scheduled'
                            : 'No air date announced'}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="title-actions">
                  {details.trailerKey ? (
                    <button type="button" className="btn btn-trailer" onClick={() => setTrailerOpen(true)}>
                      Watch trailer
                    </button>
                  ) : null}
                  {inLibrary && owned ? (
                    <ProgressControl
                      item={owned}
                      onEpisodes={(count) => setEpisodesWatched(owned.mediaType, owned.tmdbId, count)}
                      onStatus={(status) => setStatus(owned.mediaType, owned.tmdbId, status)}
                      onRemove={() => removeTitle(owned.mediaType, owned.tmdbId)}
                    />
                  ) : (
                    <button type="button" className="btn btn-primary title-add" onClick={handleAdd} disabled={adding}>
                      {adding ? 'Adding…' : '+ Add to library'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
          <PosterRow heading="More like this" items={similar} browseTo={similarBrowse} />
          {trailerOpen && details.trailerKey ? (
            <TrailerModal
              title={details.title}
              youtubeKey={details.trailerKey}
              onClose={() => setTrailerOpen(false)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
