import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getTvDetails } from '../api/tmdb'
import {
  catalogKey,
  type CollectionItem,
  type MediaType,
  type TmdbTitle,
  type WatchStatus,
} from '../types'

const STORAGE_KEY = 'watch-collection-v1'

interface CollectionContextValue {
  items: CollectionItem[]
  addTitle: (title: TmdbTitle) => Promise<void>
  removeTitle: (mediaType: MediaType, tmdbId: number) => void
  setEpisodesWatched: (mediaType: MediaType, tmdbId: number, count: number) => void
  setStatus: (mediaType: MediaType, tmdbId: number, status: WatchStatus) => void
  isInLibrary: (mediaType: MediaType, tmdbId: number) => boolean
  getItem: (mediaType: MediaType, tmdbId: number) => CollectionItem | undefined
}

const CollectionContext = createContext<CollectionContextValue | null>(null)

function loadItems(): CollectionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CollectionItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveItems(items: CollectionItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CollectionItem[]>(loadItems)

  const commit = useCallback((updater: (current: CollectionItem[]) => CollectionItem[]) => {
    setItems((current) => {
      const next = updater(current)
      saveItems(next)
      return next
    })
  }, [])

  const addTitle = useCallback(
    async (title: TmdbTitle) => {
      const key = catalogKey(title.mediaType, title.tmdbId)
      let totalEpisodes: number | null = null

      if (title.mediaType !== 'movie') {
        try {
          const details = await getTvDetails(title.tmdbId)
          totalEpisodes = details.number_of_episodes ?? null
        } catch {
          totalEpisodes = null
        }
      }

      commit((current) => {
        if (current.some((item) => catalogKey(item.mediaType, item.tmdbId) === key)) {
          return current
        }
        const nextItem: CollectionItem = {
          ...title,
          status: 'watching',
          episodesWatched: 0,
          totalEpisodes,
          addedAt: Date.now(),
        }
        return [nextItem, ...current]
      })
    },
    [commit],
  )

  const removeTitle = useCallback(
    (mediaType: MediaType, tmdbId: number) => {
      const key = catalogKey(mediaType, tmdbId)
      commit((current) =>
        current.filter((item) => catalogKey(item.mediaType, item.tmdbId) !== key),
      )
    },
    [commit],
  )

  const setEpisodesWatched = useCallback(
    (mediaType: MediaType, tmdbId: number, count: number) => {
      const key = catalogKey(mediaType, tmdbId)
      commit((current) =>
        current.map((item) => {
          if (catalogKey(item.mediaType, item.tmdbId) !== key) return item
          const nextCount = Math.max(0, count)
          const completed =
            item.totalEpisodes != null &&
            item.totalEpisodes > 0 &&
            nextCount >= item.totalEpisodes
          return {
            ...item,
            episodesWatched: item.totalEpisodes
              ? Math.min(nextCount, item.totalEpisodes)
              : nextCount,
            status: completed ? 'completed' : item.status === 'completed' ? 'watching' : item.status,
          }
        }),
      )
    },
    [commit],
  )

  const setStatus = useCallback(
    (mediaType: MediaType, tmdbId: number, status: WatchStatus) => {
      const key = catalogKey(mediaType, tmdbId)
      commit((current) =>
        current.map((item) => {
          if (catalogKey(item.mediaType, item.tmdbId) !== key) return item
          return {
            ...item,
            status,
            episodesWatched:
              status === 'completed' && item.totalEpisodes != null
                ? item.totalEpisodes
                : item.episodesWatched,
          }
        }),
      )
    },
    [commit],
  )

  const isInLibrary = useCallback(
    (mediaType: MediaType, tmdbId: number) =>
      items.some((item) => catalogKey(item.mediaType, item.tmdbId) === catalogKey(mediaType, tmdbId)),
    [items],
  )

  const getItem = useCallback(
    (mediaType: MediaType, tmdbId: number) =>
      items.find((item) => catalogKey(item.mediaType, item.tmdbId) === catalogKey(mediaType, tmdbId)),
    [items],
  )

  const value = useMemo(
    () => ({
      items,
      addTitle,
      removeTitle,
      setEpisodesWatched,
      setStatus,
      isInLibrary,
      getItem,
    }),
    [items, addTitle, removeTitle, setEpisodesWatched, setStatus, isInLibrary, getItem],
  )

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>
}

export function useCollection(): CollectionContextValue {
  const context = useContext(CollectionContext)
  if (!context) {
    throw new Error('useCollection must be used inside CollectionProvider')
  }
  return context
}
