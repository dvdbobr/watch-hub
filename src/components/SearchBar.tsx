import { useEffect, useRef, useState } from 'react'
import { searchTitles } from '../api/tmdb'
import { useCollection } from '../store/CollectionContext'
import type { SearchFilter, TmdbTitle } from '../types'
import { PosterCard } from './PosterCard'

const FILTERS: { id: SearchFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'Series' },
  { id: 'anime', label: 'Anime' },
]

export function SearchBar() {
  const { addTitle, isInLibrary } = useCollection()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchFilter>('all')
  const [results, setResults] = useState<TmdbTitle[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pendingId, setPendingId] = useState<number | null>(null)
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
        placeholder="Search to add a title…"
        aria-label="Search titles"
      />
      {open && query.trim().length >= 2 ? (
        <div className="search-panel">
          <div className="filter-pills">
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
          {loading ? <p className="search-status">Searching…</p> : null}
          {!loading && results.length === 0 ? (
            <p className="search-status">No matches.</p>
          ) : (
            <div className="search-grid">
              {results.map((title) => (
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
        </div>
      ) : null}
    </div>
  )
}
