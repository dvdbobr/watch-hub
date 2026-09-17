export type MediaType = 'movie' | 'tv' | 'anime'
export type WatchStatus = 'watching' | 'completed'
export type SearchFilter = 'all' | MediaType

export interface TmdbTitle {
  tmdbId: number
  mediaType: MediaType
  title: string
  posterPath: string | null
  year: string
  overview: string
}

export interface NextEpisode {
  airDate: string
  episodeNumber: number
  seasonNumber: number
  name: string
}

export interface TitleDetails extends TmdbTitle {
  tagline: string
  genres: string[]
  genreIds: number[]
  runtime: number | null
  totalEpisodes: number | null
  backdropPath: string | null
  voteAverage: number
  voteCount: number
  nextEpisode: NextEpisode | null
  status: string
  trailerKey: string | null
}

export function isMediaType(value: string | undefined): value is MediaType {
  return value === 'movie' || value === 'tv' || value === 'anime'
}

export interface CollectionItem extends TmdbTitle {
  status: WatchStatus
  episodesWatched: number
  totalEpisodes: number | null
  addedAt: number
}

export function catalogKey(mediaType: MediaType, tmdbId: number): string {
  const kind = mediaType === 'movie' ? 'movie' : 'tv'
  return `${kind}:${tmdbId}`
}
