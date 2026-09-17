import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { posterUrl, searchTitles } from '../api/tmdb'
import { useCollection } from '../store/CollectionContext'
import type { SearchFilter, TmdbTitle } from '../types'

const FILTERS: { id: SearchFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'Series' },
  { id: 'anime', label: 'Anime' },
]

const TYPE_LABEL = {
  movie: 'Movie',
  tv: 'Series',
  anime: 'Anime',
} as const

export function SearchBar() {
  const { addTitle, isInLibrary } = useCollection()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchFilter>('all')
  const [results, setResults] = useState<TmdbTitle[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set())
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    const handle = window.setTimeout(async () => {
      setLoading(true)
      try {
        const next = await searchTitles(trimmed, filter)
        setResults(next.slice(0, 12))
        setBrokenIds(new Set())
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(handle)
  }, [query, filter])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  async function handleAdd(title: TmdbTitle) {
    setPendingId(title.tmdbId)
    try {
      await addTitle(title)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="search-bar" ref={boxRef}>
      <input
        className="search-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search titles…"
        aria-label="Search titles"
      />
      {open && query.trim().length >= 2 ? (
        <div className="search-panel">
          <div className="search-panel-head">
            <div className="filter-pills search-filters">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={filter === item.id ? 'pill active' : 'pill'}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="search-count">
              {loading ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
            </p>
          </div>
          {!loading && results.length === 0 ? (
            <p className="search-status">No titles matched that search.</p>
          ) : (
            <div className="search-list">
              {results.map((title) => {
                const image = posterUrl(title.posterPath, 'w185')
                const key = `${title.mediaType}-${title.tmdbId}`
                if (!image || brokenIds.has(key)) return null
                const inLibrary = isInLibrary(title.mediaType, title.tmdbId)
                return (
                  <article key={key} className="search-hit">
                    <Link
                      className="search-hit-main"
                      to={`/title/${title.mediaType}/${title.tmdbId}`}
                      onClick={() => setOpen(false)}
                    >
                      <img
                        src={image}
                        alt=""
                        className="search-hit-poster"
                        onError={() =>
                          setBrokenIds((current) => {
                            const next = new Set(current)
                            next.add(key)
                            return next
                          })
                        }
                      />
                      <div className="search-hit-copy">
                        <h3>{title.title}</h3>
                        <p>
                          <span className="search-hit-badge">{TYPE_LABEL[title.mediaType]}</span>
                          {title.year ? <span>{title.year}</span> : null}
                        </p>
                      </div>
                    </Link>
                    {inLibrary ? (
                      <span className="in-library">In library</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-add"
                        onClick={() => handleAdd(title)}
                        disabled={pendingId === title.tmdbId}
                      >
                        {pendingId === title.tmdbId ? 'Adding…' : '+ Add'}
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
