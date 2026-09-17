import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useCollection } from '../store/CollectionContext'
import type { TmdbTitle } from '../types'
import { PosterCard } from './PosterCard'

interface PosterRowProps {
  heading: string
  items: TmdbTitle[]
  loading?: boolean
  error?: string | null
  browseTo?: string
}

export function PosterRow({ heading, items, loading, error, browseTo }: PosterRowProps) {
  const { addTitle, isInLibrary } = useCollection()
  const [pendingId, setPendingId] = useState<number | null>(null)

  async function handleAdd(title: TmdbTitle) {
    setPendingId(title.tmdbId)
    try {
      await addTitle(title)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="poster-row">
      <div className="poster-row-head">
        <h2>{heading}</h2>
        {browseTo ? (
          <Link className="row-browse" to={browseTo}>
            Browse
          </Link>
        ) : null}
      </div>
      {error ? <p className="row-error">{error}</p> : null}
      <div className="poster-scroller">
        {loading
          ? Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="poster-skeleton" />
            ))
          : items.map((title) => (
              <PosterCard
                key={`${title.mediaType}-${title.tmdbId}`}
                title={title}
                inLibrary={isInLibrary(title.mediaType, title.tmdbId)}
                onAdd={() => handleAdd(title)}
                adding={pendingId === title.tmdbId}
              />
            ))}
        {!loading && !error && items.length === 0 ? (
          <p className="empty-inline">Nothing here right now.</p>
        ) : null}
      </div>
    </section>
  )
}
