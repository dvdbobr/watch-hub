import type { CollectionItem } from '../types'

interface ProgressControlProps {
  item: CollectionItem
  onEpisodes: (count: number) => void
  onStatus: (status: 'watching' | 'completed') => void
  onRemove: () => void
}

export function ProgressControl({ item, onEpisodes, onStatus, onRemove }: ProgressControlProps) {
  const isMovie = item.mediaType === 'movie'
  const total = item.totalEpisodes

  return (
    <div className="progress-control">
      {isMovie ? (
        <button
          type="button"
          className={item.status === 'completed' ? 'btn btn-ghost' : 'btn btn-primary'}
          onClick={() => onStatus(item.status === 'completed' ? 'watching' : 'completed')}
        >
          {item.status === 'completed' ? 'Completed' : 'Mark completed'}
        </button>
      ) : (
        <>
          <div className="episode-stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => onEpisodes(item.episodesWatched - 1)}
              aria-label="Fewer episodes"
            >
              −
            </button>
            <span className="episode-count">
              {item.episodesWatched}
              {total ? ` / ${total}` : ''}
            </span>
            <button
              type="button"
              className="stepper-btn"
              onClick={() => onEpisodes(item.episodesWatched + 1)}
              aria-label="More episodes"
            >
              +
            </button>
          </div>
          <button
            type="button"
            className={item.status === 'completed' ? 'btn btn-ghost' : 'btn btn-primary'}
            onClick={() => onStatus(item.status === 'completed' ? 'watching' : 'completed')}
          >
            {item.status === 'completed' ? 'Completed' : 'Complete'}
          </button>
        </>
      )}
      <button type="button" className="btn btn-text" onClick={onRemove}>
        Remove
      </button>
    </div>
  )
}
