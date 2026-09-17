import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { posterUrl } from '../api/tmdb'
import type { MediaType, TmdbTitle } from '../types'

const TYPE_LABEL: Record<MediaType, string> = {
  movie: 'Movie',
  tv: 'Series',
  anime: 'Anime',
}

interface PosterCardProps {
  title: TmdbTitle
  badge?: string
  footer?: ReactNode
  inLibrary?: boolean
  onAdd?: () => void
  adding?: boolean
}

export function PosterCard({
  title,
  badge,
  footer,
  inLibrary,
  onAdd,
  adding,
}: PosterCardProps) {
  const image = posterUrl(title.posterPath, 'w500')
  const recsTo = `/title/${title.mediaType}/${title.tmdbId}`

  return (
    <article className="poster-card">
      <Link className="poster-link" to={recsTo} title={title.title}>
        {image ? (
          <img src={image} alt="" className="poster-image" />
        ) : (
          <div className="poster-fallback">{title.title}</div>
        )}
        <span className="poster-type">{TYPE_LABEL[title.mediaType]}</span>
        {badge ? <span className="poster-badge">{badge}</span> : null}
      </Link>
      <div className="poster-copy">
        <h3 className="poster-title">{title.title}</h3>
        <p className="poster-year">{title.year || '—'}</p>
      </div>
      {onAdd || footer ? (
        <div className="poster-meta">
          {onAdd ? (
            inLibrary ? (
              <span className="in-library">In library</span>
            ) : (
              <button type="button" className="btn btn-add" onClick={onAdd} disabled={adding}>
                {adding ? 'Adding…' : '+ Add'}
              </button>
            )
          ) : null}
          {footer}
        </div>
      ) : null}
    </article>
  )
}
