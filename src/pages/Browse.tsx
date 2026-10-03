import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { discoverTitles, hasApiKey, searchCatalog } from '../api/tmdb'
import { Pager } from '../components/Pager'
import { PosterCard } from '../components/PosterCard'
import { BROWSE_GENRES, BROWSE_PAGE_SIZE, WATCH_PROVIDERS, WATCH_REGIONS } from '../data/catalog'
import { useCollection } from '../store/CollectionContext'
import { isMediaType, type MediaType, type SearchFilter, type TmdbTitle } from '../types'

const REGION_KEY = 'watch-region'
const KINDS: { id: MediaType; label: string }[] = [
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'Series' },
  { id: 'anime', label: 'Anime' },
]

function readRegion(): string {
  try {
    return localStorage.getItem(REGION_KEY) || 'US'
  } catch {
    return 'US'
  }
}

export function Browse() {
  const { addTitle, isInLibrary } = useCollection()
  const [params, setParams] = useSearchParams()
  const query = (params.get('q') || '').trim()
  const searching = query.length >= 2
  const rawKind = params.get('kind')
  const activeKind: MediaType | null =
    rawKind && isMediaType(rawKind) ? rawKind : searching ? null : 'movie'
  const kind: MediaType = activeKind ?? 'movie'
  const searchFilter: SearchFilter = activeKind ?? 'all'
  const providerId = params.get('provider') || ''
  const genreId = params.get('genre') || ''
  const region = params.get('region') || readRegion()
  const rawWhen = params.get('when')
  const when = rawWhen === 'upcoming' ? 'upcoming' : rawWhen === 'rating' ? 'rating' : 'hype'
  const page = Math.max(1, Number(params.get('page') || '1') || 1)

  const [items, setItems] = useState<TmdbTitle[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [personName, setPersonName] = useState<string | null>(null)

  const selectedGenre = BROWSE_GENRES.find((genre) => genre.id === genreId)
  const genreTmdbId =
    kind === 'movie' ? selectedGenre?.movie ?? null : selectedGenre?.tv ?? null
  const genreUnavailable = Boolean(selectedGenre && genreTmdbId == null && kind !== 'anime')

  const visibleGenres = useMemo(
    () =>
      BROWSE_GENRES.filter((genre) => {
        if (kind === 'movie') return genre.movie != null
        if (kind === 'tv') return genre.tv != null
        return genre.tv != null || genre.movie != null
      }),
    [kind],
  )

  function update(next: Record<string, string | null>) {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value)
      else merged.delete(key)
    }
    if (!('page' in next)) merged.delete('page')
    if (!merged.get('q') && !merged.get('kind')) merged.set('kind', 'movie')
    setParams(merged)
  }

  useEffect(() => {
    try {
      localStorage.setItem(REGION_KEY, region)
    } catch {
      /* ignore */
    }
  }, [region])

  useEffect(() => {
    if (!hasApiKey()) {
      setItems([])
      setTotalPages(1)
      setPersonName(null)
      setLoading(false)
      setError(null)
      return
    }

    if (searching) {
      let cancelled = false
      setLoading(true)
      setError(null)
      searchCatalog(query, searchFilter)
        .then((next) => {
          if (cancelled) return
          const pages = Math.max(1, Math.ceil(next.items.length / BROWSE_PAGE_SIZE))
          const safePage = Math.min(page, pages)
          setItems(
            next.items.slice((safePage - 1) * BROWSE_PAGE_SIZE, safePage * BROWSE_PAGE_SIZE),
          )
          setTotalPages(pages)
          setPersonName(next.personName)
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setItems([])
            setTotalPages(1)
            setPersonName(null)
            setError(err instanceof Error ? err.message : 'Could not search titles')
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }

    setPersonName(null)

    if (genreUnavailable) {
      setItems([])
      setTotalPages(1)
      setLoading(false)
      setError('That genre is not used for series. Try movies, or pick another genre.')
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    discoverTitles({
      kind,
      providerId: providerId || undefined,
      region: providerId ? region : undefined,
      genreId:
        kind === 'anime'
          ? selectedGenre?.tv ?? selectedGenre?.movie ?? undefined
          : genreTmdbId ?? undefined,
      when,
      page,
      perPage: BROWSE_PAGE_SIZE,
    })
      .then((next) => {
        if (cancelled) return
        setItems(next.items)
        setTotalPages(next.totalPages)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setItems([])
          setTotalPages(1)
          setError(err instanceof Error ? err.message : 'Could not load titles')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    searching,
    query,
    searchFilter,
    kind,
    providerId,
    genreId,
    region,
    genreUnavailable,
    genreTmdbId,
    selectedGenre,
    when,
    page,
  ])

  async function handleAdd(title: TmdbTitle) {
    setPendingId(title.tmdbId)
    try {
      await addTitle(title)
    } finally {
      setPendingId(null)
    }
  }

  const providerName = WATCH_PROVIDERS.find((item) => item.id === providerId)?.name
  const heading = searching
    ? [`Results for “${query}”`, personName && personName.toLowerCase() !== query.toLowerCase() ? personName : null]
        .filter(Boolean)
        .join(' · ')
    : [
        when === 'upcoming' ? 'Upcoming' : when === 'rating' ? 'Top rated' : 'Hype',
        providerName,
        selectedGenre?.name,
        KINDS.find((item) => item.id === kind)?.label,
      ]
        .filter(Boolean)
        .join(' · ')

  return (
    <div className="page">
      <div className="page-intro">
        <h1>{searching ? 'Search' : 'Browse'}</h1>
        <p>
          {searching
            ? 'Titles and people matching what you typed. Use type to narrow the grid, or clear search to browse catalogs again.'
            : 'See what’s popular on a streaming service, or pick a genre. You can combine both. Catalogs come from TMDB and change by region.'}
        </p>
        {searching ? (
          <button type="button" className="btn btn-ghost search-clear" onClick={() => update({ q: null })}>
            Clear search
          </button>
        ) : null}
      </div>

      <section className="browse-filters">
        <div className="filter-block">
          <h2>Type</h2>
          <div className="filter-pills">
            {searching ? (
              <button
                type="button"
                className={!activeKind ? 'pill active' : 'pill'}
                onClick={() => update({ kind: null })}
              >
                All
              </button>
            ) : null}
            {KINDS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={activeKind === item.id ? 'pill active' : 'pill'}
                onClick={() => update({ kind: item.id })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {searching ? null : (
          <>
        <div className="filter-block">
          <h2>When</h2>
          <div className="filter-pills">
            <button
              type="button"
              className={when === 'hype' ? 'pill active' : 'pill'}
              onClick={() => update({ when: 'hype' })}
            >
              Hype
            </button>
            <button
              type="button"
              className={when === 'rating' ? 'pill active' : 'pill'}
              onClick={() => update({ when: 'rating' })}
            >
              Top rated
            </button>
            <button
              type="button"
              className={when === 'upcoming' ? 'pill active' : 'pill'}
              onClick={() => update({ when: 'upcoming' })}
            >
              Upcoming
            </button>
          </div>
        </div>

        <div className="filter-block">
          <div className="filter-head">
            <h2>Service</h2>
            {providerId ? (
              <label className="region-label">
                Region
                <select
                  className="region-select"
                  value={region}
                  onChange={(event) => update({ region: event.target.value })}
                >
                  {WATCH_REGIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="filter-pills">
            <button
              type="button"
              className={!providerId ? 'pill active' : 'pill'}
              onClick={() => update({ provider: null })}
            >
              Any service
            </button>
            {WATCH_PROVIDERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={providerId === item.id ? 'pill active' : 'pill'}
                onClick={() => update({ provider: item.id, region })}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-block">
          <h2>Genre</h2>
          <div className="filter-pills">
            <button
              type="button"
              className={!genreId ? 'pill active' : 'pill'}
              onClick={() => update({ genre: null })}
            >
              Any genre
            </button>
            {visibleGenres.map((item) => (
              <button
                key={item.id}
                type="button"
                className={genreId === item.id ? 'pill active' : 'pill'}
                onClick={() => update({ genre: item.id })}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
          </>
        )}
      </section>

      {loading ? (
        <p className="empty-state">{searching ? `Searching for ${query}…` : `Loading ${heading.toLowerCase()}…`}</p>
      ) : error ? (
        <p className="row-error">{error}</p>
      ) : items.length === 0 ? (
        <p className="empty-state">
          {searching
            ? 'Nothing matched that search.'
            : 'Nothing matched those filters in this region.'}
        </p>
      ) : (
        <section>
          <h2 className="recs-heading">{heading}</h2>
          <div className="library-grid browse-grid">
            {items.map((title) => (
              <PosterCard
                key={`${title.mediaType}-${title.tmdbId}`}
                title={title}
                inLibrary={isInLibrary(title.mediaType, title.tmdbId)}
                onAdd={() => handleAdd(title)}
                adding={pendingId === title.tmdbId}
                requireImage
              />
            ))}
          </div>
          <Pager
            page={page}
            totalPages={totalPages}
            onChange={(nextPage) => {
              update({ page: String(nextPage) })
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        </section>
      )}
    </div>
  )
}
