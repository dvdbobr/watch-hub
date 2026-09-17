import { useMemo, useState } from 'react'
import { ProgressControl } from '../components/ProgressControl'
import { PosterCard } from '../components/PosterCard'
import { useCollection } from '../store/CollectionContext'
import type { MediaType, WatchStatus } from '../types'

type TypeFilter = 'all' | MediaType
type StatusFilter = 'all' | WatchStatus

export function Library() {
  const { items, setEpisodesWatched, setStatus, removeTitle } = useCollection()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const visible = useMemo(
    () =>
      items.filter((item) => {
        const typeOk = typeFilter === 'all' || item.mediaType === typeFilter
        const statusOk = statusFilter === 'all' || item.status === statusFilter
        return typeOk && statusOk
      }),
    [items, typeFilter, statusFilter],
  )

  return (
    <div className="page">
      <div className="page-intro">
        <h1>Library</h1>
        <p>Your watched collection, saved on this device. Track episodes or mark a title complete.</p>
      </div>
      <div className="filter-bar">
        <div className="filter-pills">
          {(['all', 'movie', 'tv', 'anime'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={typeFilter === value ? 'pill active' : 'pill'}
              onClick={() => setTypeFilter(value)}
            >
              {value === 'all' ? 'All' : value === 'tv' ? 'Series' : value === 'movie' ? 'Movies' : 'Anime'}
            </button>
          ))}
        </div>
        <div className="filter-pills">
          {(['all', 'watching', 'completed'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={statusFilter === value ? 'pill active' : 'pill'}
              onClick={() => setStatusFilter(value)}
            >
              {value === 'all' ? 'Any status' : value === 'watching' ? 'Watching' : 'Completed'}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="empty-state">
          Nothing in your library yet. Search above, or add something from Home.
        </p>
      ) : visible.length === 0 ? (
        <p className="empty-state">No titles match these filters.</p>
      ) : (
        <div className="library-grid">
          {visible.map((item) => (
            <PosterCard
              key={`${item.mediaType}-${item.tmdbId}`}
              title={item}
              badge={item.status === 'completed' ? 'Completed' : 'Watching'}
              footer={
                <ProgressControl
                  item={item}
                  onEpisodes={(count) => setEpisodesWatched(item.mediaType, item.tmdbId, count)}
                  onStatus={(status) => setStatus(item.mediaType, item.tmdbId, status)}
                  onRemove={() => removeTitle(item.mediaType, item.tmdbId)}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
