import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getRecommendations, hasApiKey } from '../api/tmdb'
import { PosterCard } from '../components/PosterCard'
import { useCollection } from '../store/CollectionContext'
import type { MediaType, TmdbTitle } from '../types'

function isMediaType(value: string | null): value is MediaType {
  return value === 'movie' || value === 'tv' || value === 'anime'
}

export function Recommendations() {
  const { items, addTitle, isInLibrary } = useCollection()
  const [params, setParams] = useSearchParams()
  const seedId = Number(params.get('id'))
  const seedType = params.get('type')
  const seedName = params.get('title')

  const seedTitle = useMemo(() => {
    if (!Number.isFinite(seedId) || seedId <= 0 || !isMediaType(seedType)) return null
    const owned = items.find(
      (item) => item.tmdbId === seedId && item.mediaType === seedType,
    )
    if (owned) return owned
    return {
      tmdbId: seedId,
      mediaType: seedType,
      title: seedName || 'Selected title',
      posterPath: null,
      year: '',
      overview: '',
    }
  }, [items, seedId, seedName, seedType])

  const [results, setResults] = useState<TmdbTitle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)

  useEffect(() => {
    if (!seedTitle || !hasApiKey()) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    getRecommendations(seedTitle)
      .then((next) => {
        if (!cancelled) setResults(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResults([])
          setError(err instanceof Error ? err.message : 'Could not load recommendations')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [seedTitle])

  async function handleAdd(title: TmdbTitle) {
    setPendingId(title.tmdbId)
    try {
      await addTitle(title)
    } finally {
      setPendingId(null)
    }
  }

  const visible = results.filter((title) => !isInLibrary(title.mediaType, title.tmdbId))

  return (
    <div className="page">
      <div className="page-intro">
        <h1>Recommendations</h1>
        <p>Pick a title you like. We’ll show similar movies, series, or anime from TMDB.</p>
      </div>

      {items.length > 0 ? (
        <section className="seed-picker">
          <h2>From your library</h2>
          <div className="poster-scroller">
            {items.map((item) => (
              <button
                key={`${item.mediaType}-${item.tmdbId}`}
                type="button"
                className={
                  seedTitle &&
                  item.tmdbId === seedTitle.tmdbId &&
                  item.mediaType === seedTitle.mediaType
                    ? 'seed-chip active'
                    : 'seed-chip'
                }
                onClick={() =>
                  setParams({
                    id: String(item.tmdbId),
                    type: item.mediaType,
                    title: item.title,
                  })
                }
              >
                {item.title}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <p className="empty-state">Add titles to your library, or click a poster on Home.</p>
      )}

      {seedTitle ? (
        <section>
          <h2 className="recs-heading">
            Because you picked <em>{seedTitle.title}</em>
          </h2>
          {loading ? <p className="search-status">Finding similar titles…</p> : null}
          {error ? <p className="row-error">{error}</p> : null}
          {!loading && !error && visible.length === 0 ? (
            <p className="empty-state">No new recommendations for this one.</p>
          ) : (
            <div className="library-grid">
              {visible.map((title) => (
                <PosterCard
                  key={`${title.mediaType}-${title.tmdbId}`}
                  title={title}
                  inLibrary={isInLibrary(title.mediaType, title.tmdbId)}
                  onAdd={() => handleAdd(title)}
                  adding={pendingId === title.tmdbId}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
