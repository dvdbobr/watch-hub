import { useEffect, useRef, useState } from 'react'
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
import { SeasonGuide } from '../components/SeasonGuide'
import { TrailerModal } from '../components/TrailerModal'
import { genreSlugFromIds } from '../data/catalog'
import { getExternalRatings } from '../api/ratings'
import { useCollection } from '../store/CollectionContext'
import { isMediaType, type ExternalRatings, type TitleDetails, type TmdbTitle } from '../types'

const TYPE_LABEL = {
  movie: 'Movie',
  tv: 'Series',
  anime: 'Anime',
} as const

const FADE_MS = 280

interface TitleView {
  details: TitleDetails
  similar: TmdbTitle[]
  ratings: ExternalRatings | null
}

export function TitlePage() {
  const { type, id } = useParams()
  const mediaType = isMediaType(type) ? type : null
  const tmdbId = Number(id)
  const { addTitle, isInLibrary, getItem, setEpisodesWatched, setStatus, removeTitle } =
    useCollection()

  const [view, setView] = useState<TitleView | null>(null)
  const [layerShown, setLayerShown] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const viewRef = useRef(view)
  const layerRef = useRef(layerShown)
  viewRef.current = view
  layerRef.current = layerShown

  useEffect(() => {
    if (!mediaType || !Number.isFinite(tmdbId) || tmdbId <= 0 || !hasApiKey()) {
      setView(null)
      setError(mediaType ? 'Missing title.' : 'Unknown title type.')
      return
    }

    let cancelled = false
    let fadeTimer = 0
    let ready: TitleView | null = null
    let fadedOut = !viewRef.current || !layerRef.current

    function reveal() {
      if (cancelled || !ready || !fadedOut) return
      setView(ready)
      setError(null)
      setTrailerOpen(false)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return
          layerRef.current = true
          setLayerShown(true)
        })
      })
    }

    function patchView(details: TitleDetails, patch: Partial<Pick<TitleView, 'similar' | 'ratings'>>) {
      if (cancelled) return
      if (ready && ready.details.tmdbId === details.tmdbId && ready.details.mediaType === details.mediaType) {
        ready = { ...ready, ...patch }
      }
      setView((current) =>
        current && current.details.tmdbId === details.tmdbId && current.details.mediaType === details.mediaType
          ? { ...current, ...patch }
          : current,
      )
    }

    if (!fadedOut) {
      layerRef.current = false
      setLayerShown(false)
      window.scrollTo({ top: 0, behavior: 'auto' })
      fadeTimer = window.setTimeout(() => {
        fadedOut = true
        reveal()
      }, FADE_MS)
    }

    getTitleDetails(mediaType, tmdbId)
      .then(async (details) => {
        ready = { details, similar: [], ratings: null }
        reveal()
        const extras = await Promise.allSettled([
          getRecommendations(details),
          getExternalRatings(details),
        ])
        if (cancelled) return
        const similar = extras[0].status === 'fulfilled' ? extras[0].value : []
        const ratings = extras[1].status === 'fulfilled' ? extras[1].value : null
        patchView(details, { similar, ratings })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        fadedOut = true
        setView(null)
        setError(err instanceof Error ? err.message : 'Could not load this title.')
        layerRef.current = true
        setLayerShown(true)
      })

    return () => {
      cancelled = true
      window.clearTimeout(fadeTimer)
    }
  }, [mediaType, tmdbId])

  async function handleAdd() {
    if (!view) return
    setAdding(true)
    try {
      await addTitle(view.details)
    } finally {
      setAdding(false)
    }
  }

  const details = view?.details ?? null
  const similar = view?.similar ?? []
  const ratings = view?.ratings
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
      {error && !details ? <p className="row-error">{error}</p> : null}
      <div className={layerShown ? 'fade-layer' : 'fade-layer is-hidden'}>
        {!details && !error ? <p className="empty-state">Loading description…</p> : null}
        {details ? (
          <>
            <section
              className="title-hero"
              style={backdrop ? { ['--title-bg' as string]: `url(${backdrop})` } : undefined}
            >
              <div className="title-layout">
                <div className="title-poster-wrap">
                  {poster ? (
                    <img className="title-poster" src={poster} alt="" />
                  ) : (
                    <div className="title-poster title-poster-fallback">{details.title}</div>
                  )}
                </div>
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
                    {details.mediaType === 'anime' && ratings?.mal ? (
                      <div className="stat-card">
                        <p className="stat-label">MAL</p>
                        <p className="stat-score">
                          {ratings.mal.score.toFixed(2)}
                          <span> / 10</span>
                        </p>
                      </div>
                    ) : null}
                    {details.mediaType === 'anime' && ratings?.anilist ? (
                      <div className="stat-card">
                        <p className="stat-label">AniList</p>
                        <p className="stat-score">
                          {ratings.anilist.score.toFixed(1)}
                          <span> / 10</span>
                        </p>
                      </div>
                    ) : null}
                    {ratings?.imdb ? (
                      <div className="stat-card">
                        <p className="stat-label">IMDb</p>
                        <p className="stat-score">
                          {ratings.imdb.score.toFixed(1)}
                          <span> / 10</span>
                        </p>
                        {ratings.imdb.votes ? (
                          <p className="stat-sub">{ratings.imdb.votes} votes</p>
                        ) : null}
                      </div>
                    ) : null}
                    {ratings?.rottenTomatoes ? (
                      <div className="stat-card">
                        <p className="stat-label">Rotten Tomatoes</p>
                        <p className="stat-score">
                          {ratings.rottenTomatoes.percent}
                          <span>%</span>
                        </p>
                      </div>
                    ) : null}
                    <div className="stat-card">
                      <p className="stat-label">TMDB</p>
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
            {details.seasons.length > 0 ? (
              <SeasonGuide tmdbId={details.tmdbId} seasons={details.seasons} />
            ) : null}
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
    </div>
  )
}
