import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { posterUrl, searchPersonFilmography, searchTitles } from '../api/tmdb'
import { useCollection } from '../store/CollectionContext'
import { catalogKey, type SearchFilter, type TmdbTitle } from '../types'

const FILTERS: { id: SearchFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'Series' },
  { id: 'anime', label: 'Anime' },
  { id: 'person', label: 'People' },
]

const TYPE_LABEL = {
  movie: 'Movie',
  tv: 'Series',
  anime: 'Anime',
} as const

function uniqueTitles(items: TmdbTitle[]): TmdbTitle[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = catalogKey(item.mediaType, item.tmdbId)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function SearchBar() {
  const navigate = useNavigate()
  const { addTitle, isInLibrary } = useCollection()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchFilter>('all')
  const [results, setResults] = useState<TmdbTitle[]>([])
  const [personName, setPersonName] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set())
  const boxRef = useRef<HTMLDivElement>(null)
  const requestId = useRef(0)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setPersonName(null)
      setLoading(false)
      return
    }

    const id = ++requestId.current
    const withPeople = filter === 'person'

    const handle = window.setTimeout(async () => {
      setLoading(true)
      setOpen(true)
      try {
        const titleHits = filter === 'person' ? [] : await searchTitles(trimmed, filter)
        let personHits: TmdbTitle[] = []
        let matchedPerson: string | null = null
        if (withPeople) {
          const person = await searchPersonFilmography(trimmed, filter)
          if (person) {
            matchedPerson = person.name
            personHits = person.titles
          }
        }
        if (id !== requestId.current) return
        const merged = uniqueTitles(
          withPeople ? [...personHits, ...titleHits] : titleHits,
        ).slice(0, 20)
        setResults(merged)
        setPersonName(matchedPerson)
        setBrokenIds(new Set())
      } catch {
        if (id !== requestId.current) return
        setResults([])
        setPersonName(null)
      } finally {
        if (id === requestId.current) setLoading(false)
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    setOpen(false)
    const next = new URLSearchParams({ q: trimmed })
    if (filter === 'movie' || filter === 'tv' || filter === 'anime') {
      next.set('kind', filter)
    }
    navigate(`/browse?${next}`)
  }

  return (
    <div className="search-bar" ref={boxRef}>
      <form onSubmit={handleSubmit}>
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search titles or people…"
          aria-label="Search titles or people"
        />
      </form>
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
              {loading
                ? 'Searching…'
                : `${results.length} result${results.length === 1 ? '' : 's'}${
                    personName ? ` · ${personName}` : ''
                  }`}
            </p>
          </div>
          {!loading && results.length === 0 ? (
            <p className="search-status">
              {filter === 'person'
                ? 'No people matched that search.'
                : 'No titles matched that search. Press Enter to open Browse.'}
            </p>
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
                          {title.credit ? <span>{title.credit}</span> : null}
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
