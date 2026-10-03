export type MediaType = 'movie' | 'tv' | 'anime'
export type WatchStatus = 'watching' | 'completed'
export type SearchFilter = 'all' | MediaType | 'person'

export interface TmdbTitle {
  tmdbId: number
  mediaType: MediaType
  title: string
  posterPath: string | null
  year: string
  overview: string
  credit?: string
}

export interface NextEpisode {
  airDate: string
  episodeNumber: number
  seasonNumber: number
  name: string
}

export interface CastMember {
  tmdbId: number
  name: string
  character: string
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
  seasons: SeasonSummary[]
  imdbId: string | null
  originalTitle: string
  cast: CastMember[]
}

export interface ExternalRatings {
  imdb: { score: number; votes: string } | null
  rottenTomatoes: { percent: number } | null
  mal: { score: number } | null
  anilist: { score: number } | null
}

export interface SeasonSummary {
  seasonNumber: number
  name: string
  episodeCount: number
  voteAverage: number
  year: string
}

export interface EpisodeSummary {
  episodeNumber: number
  seasonNumber: number
  name: string
  overview: string
  airDate: string
  voteAverage: number
  voteCount: number
  stillPath: string | null
  runtime: number | null
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
