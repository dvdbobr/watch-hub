import type { MediaType, SearchFilter, TitleDetails, TmdbTitle } from '../types'

const BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'
const ANIMATION_GENRE = '16'
const KIDS_GENRE = '10762'

interface TmdbMovie {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  overview?: string
  media_type?: string
  genre_ids?: number[]
  origin_country?: string[]
  original_language?: string
}

interface TmdbListResponse {
  results: TmdbMovie[]
  page?: number
  total_pages?: number
}

interface TmdbEpisodeAir {
  air_date?: string | null
  episode_number?: number
  season_number?: number
  name?: string
}

interface TmdbFullDetails {
  id: number
  title?: string
  name?: string
  overview?: string
  tagline?: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  first_air_date?: string
  runtime?: number | null
  episode_run_time?: number[]
  number_of_episodes?: number | null
  genres?: { id: number; name: string }[]
  vote_average?: number
  vote_count?: number
  status?: string
  next_episode_to_air?: TmdbEpisodeAir | null
  videos?: {
    results?: {
      key?: string
      site?: string
      type?: string
      official?: boolean
      name?: string
    }[]
  }
}

export function hasApiKey(): boolean {
  return Boolean(import.meta.env.VITE_TMDB_API_KEY)
}

export function posterUrl(
  path: string | null,
  size: 'w185' | 'w342' | 'w500' = 'w342',
): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function backdropUrl(path: string | null): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/w1280${path}`
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function yearFromDate(date?: string): string {
  return date?.slice(0, 4) || ''
}

function mapNextEpisode(episode?: TmdbEpisodeAir | null): TitleDetails['nextEpisode'] {
  if (!episode?.air_date) return null
  return {
    airDate: episode.air_date,
    episodeNumber: episode.episode_number ?? 0,
    seasonNumber: episode.season_number ?? 0,
    name: episode.name || 'Upcoming episode',
  }
}

function mapTitle(item: TmdbMovie, mediaType: MediaType): TmdbTitle {
  return {
    tmdbId: item.id,
    mediaType,
    title: item.title || item.name || 'Untitled',
    posterPath: item.poster_path,
    year: yearFromDate(item.release_date || item.first_air_date),
    overview: item.overview || '',
  }
}

function inferMediaType(item: TmdbMovie): MediaType | null {
  const type = item.media_type
  if (type === 'person') return null
  if (type === 'movie' || (type !== 'tv' && item.title)) return 'movie'
  const isAnime =
    item.original_language === 'ja' &&
    (item.origin_country?.includes('JP') || item.genre_ids?.includes(16))
  return isAnime ? 'anime' : 'tv'
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = import.meta.env.VITE_TMDB_API_KEY as string | undefined
  if (!key) throw new Error('Missing TMDB API key')

  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('api_key', key)
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value)
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function searchTitles(
  query: string,
  filter: SearchFilter,
): Promise<TmdbTitle[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  if (filter === 'movie') {
    const data = await tmdb<TmdbListResponse>('/search/movie', { query: trimmed })
    return data.results.map((item) => mapTitle(item, 'movie'))
  }

  if (filter === 'tv') {
    const data = await tmdb<TmdbListResponse>('/search/tv', { query: trimmed })
    return data.results.map((item) => mapTitle(item, 'tv'))
  }

  if (filter === 'anime') {
    const data = await tmdb<TmdbListResponse>('/search/tv', { query: trimmed })
    return data.results.map((item) => mapTitle(item, 'anime'))
  }

  const data = await tmdb<TmdbListResponse>('/search/multi', { query: trimmed })
  return data.results.flatMap((item) => {
    const mediaType = inferMediaType(item)
    if (!mediaType) return []
    return [mapTitle(item, mediaType)]
  })
}

export async function getTvDetails(tmdbId: number): Promise<TmdbFullDetails> {
  return tmdb<TmdbFullDetails>(`/tv/${tmdbId}`)
}

function pickTrailerKey(videos?: TmdbFullDetails['videos']): string | null {
  const youtube = (videos?.results || []).filter(
    (video) => video.site === 'YouTube' && video.key,
  )
  const official = youtube.find((video) => video.type === 'Trailer' && video.official)
  const trailer = youtube.find((video) => video.type === 'Trailer')
  const teaser = youtube.find((video) => video.type === 'Teaser')
  return official?.key || trailer?.key || teaser?.key || youtube[0]?.key || null
}

export async function getTitleDetails(
  mediaType: MediaType,
  tmdbId: number,
): Promise<TitleDetails> {
  const path = mediaType === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`
  const data = await tmdb<TmdbFullDetails>(path, { append_to_response: 'videos' })
  return {
    tmdbId: data.id,
    mediaType,
    title: data.title || data.name || 'Untitled',
    posterPath: data.poster_path,
    year: yearFromDate(data.release_date || data.first_air_date),
    overview: data.overview || '',
    tagline: data.tagline || '',
    genres: (data.genres || []).map((genre) => genre.name),
    genreIds: (data.genres || []).map((genre) => genre.id),
    runtime: data.runtime || data.episode_run_time?.[0] || null,
    totalEpisodes: data.number_of_episodes ?? null,
    backdropPath: data.backdrop_path,
    voteAverage: data.vote_average ?? 0,
    voteCount: data.vote_count ?? 0,
    nextEpisode: mediaType === 'movie' ? null : mapNextEpisode(data.next_episode_to_air),
    status: data.status || '',
    trailerKey: pickTrailerKey(data.videos),
  }
}

function uniqueMovies(items: TmdbMovie[]): TmdbMovie[] {
  const seen = new Set<number>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function isJapaneseAnime(item: TmdbMovie): boolean {
  const japanese = item.original_language === 'ja' || item.origin_country?.includes('JP')
  const kids = item.genre_ids?.includes(Number(KIDS_GENRE))
  return Boolean(japanese && !kids)
}

async function discoverRelatedAnime(excludeId: number, genreIds: number[]): Promise<TmdbMovie[]> {
  const extra = genreIds.filter((id) => id !== Number(ANIMATION_GENRE) && id !== Number(KIDS_GENRE))
  const queries: Record<string, string>[] = []

  if (extra[0]) {
    queries.push({
      with_genres: `${ANIMATION_GENRE},${extra[0]}`,
      with_origin_country: 'JP',
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
      without_genres: KIDS_GENRE,
    })
  }

  queries.push({
    with_genres: ANIMATION_GENRE,
    with_origin_country: 'JP',
    with_original_language: 'ja',
    sort_by: 'popularity.desc',
    without_genres: KIDS_GENRE,
  })

  const collected: TmdbMovie[] = []
  for (const params of queries) {
    const data = await tmdb<TmdbListResponse>('/discover/tv', params)
    collected.push(
      ...data.results.filter((item) => item.id !== excludeId && isJapaneseAnime(item)),
    )
    if (collected.length >= 16) break
  }
  return uniqueMovies(collected)
}

export async function getRecommendations(title: TmdbTitle): Promise<TmdbTitle[]> {
  const kind = title.mediaType === 'movie' ? 'movie' : 'tv'
  const [recs, similar] = await Promise.all([
    tmdb<TmdbListResponse>(`/${kind}/${title.tmdbId}/recommendations`).catch(
      () => ({ results: [] as TmdbMovie[] }),
    ),
    tmdb<TmdbListResponse>(`/${kind}/${title.tmdbId}/similar`).catch(
      () => ({ results: [] as TmdbMovie[] }),
    ),
  ])

  const merged = uniqueMovies([...recs.results, ...similar.results]).filter(
    (item) => item.id !== title.tmdbId,
  )

  if (title.mediaType === 'anime') {
    let genreIds: number[] = []
    try {
      const details = await getTvDetails(title.tmdbId)
      genreIds = (details.genres || []).map((genre) => genre.id)
    } catch {
      genreIds = []
    }

    let matches = merged.filter(isJapaneseAnime)
    if (matches.length < 12) {
      const extra = await discoverRelatedAnime(title.tmdbId, genreIds)
      matches = uniqueMovies([...matches, ...extra])
    }
    return matches.slice(0, 18).map((item) => mapTitle(item, 'anime'))
  }

  const mediaType = title.mediaType === 'movie' ? 'movie' : 'tv'
  return merged.slice(0, 18).map((item) => mapTitle(item, mediaType))
}

export async function getUpcomingMovies(): Promise<TmdbTitle[]> {
  const data = await tmdb<TmdbListResponse>('/movie/upcoming')
  return data.results.map((item) => mapTitle(item, 'movie'))
}

export async function getUpcomingSeries(): Promise<TmdbTitle[]> {
  const data = await tmdb<TmdbListResponse>('/discover/tv', {
    'first_air_date.gte': todayIso(),
    sort_by: 'popularity.desc',
  })
  return data.results.map((item) => mapTitle(item, 'tv'))
}

export async function getUpcomingAnime(): Promise<TmdbTitle[]> {
  const data = await tmdb<TmdbListResponse>('/discover/tv', {
    with_genres: ANIMATION_GENRE,
    with_origin_country: 'JP',
    with_original_language: 'ja',
    'first_air_date.gte': todayIso(),
    sort_by: 'popularity.desc',
  })
  return data.results.map((item) => mapTitle(item, 'anime'))
}

export type DiscoverWhen = 'hype' | 'rating' | 'upcoming'

const TMDB_PAGE_SIZE = 20

function minVotes(kind: MediaType): string {
  if (kind === 'movie') return '300'
  if (kind === 'anime') return '50'
  return '150'
}

async function pagedList(
  path: string,
  extraParams: Record<string, string>,
  mediaType: MediaType,
  page: number,
  perPage: number,
  filter?: (item: TmdbMovie) => boolean,
): Promise<{ items: TmdbTitle[]; page: number; totalPages: number }> {
  const start = (page - 1) * perPage
  const lastTmdbPage = filter
    ? Math.min(15, Math.max(3, Math.ceil((page * perPage) / 12)))
    : Math.floor((start + perPage - 1) / TMDB_PAGE_SIZE) + 1
  const firstTmdbPage = filter ? 1 : Math.floor(start / TMDB_PAGE_SIZE) + 1

  const responses = await Promise.all(
    Array.from({ length: lastTmdbPage - firstTmdbPage + 1 }, (_, index) =>
      tmdb<TmdbListResponse>(path, { ...extraParams, page: String(firstTmdbPage + index) }).catch(
        () => ({ results: [] as TmdbMovie[], page: firstTmdbPage + index, total_pages: 1 }),
      ),
    ),
  )

  const totalTmdbPages = responses[0]?.total_pages || 1
  let merged = uniqueMovies(responses.flatMap((entry) => entry.results || []))
  if (filter) merged = merged.filter(filter)

  const offset = filter ? start : start % TMDB_PAGE_SIZE
  const slice = merged.slice(offset, offset + perPage)

  return {
    items: slice.map((item) => mapTitle(item, mediaType)),
    page,
    totalPages: Math.min(20, Math.max(1, Math.ceil((totalTmdbPages * TMDB_PAGE_SIZE) / perPage))),
  }
}

export async function discoverTitles(options: {
  kind: MediaType
  providerId?: string
  region?: string
  genreId?: number
  when?: DiscoverWhen
  page?: number
  perPage?: number
}): Promise<{ items: TmdbTitle[]; page: number; totalPages: number }> {
  const page = Math.max(1, options.page ?? 1)
  const perPage = options.perPage ?? TMDB_PAGE_SIZE
  const when = options.when ?? 'hype'
  const hasFilters = Boolean(options.providerId || options.genreId)
  const mediaType: MediaType = options.kind === 'movie' ? 'movie' : options.kind

  if (when === 'hype' && !hasFilters && options.kind === 'movie') {
    return pagedList('/trending/movie/week', {}, 'movie', page, perPage)
  }

  if (when === 'hype' && !hasFilters && options.kind === 'tv') {
    return pagedList('/trending/tv/week', {}, 'tv', page, perPage, (item) => !isJapaneseAnime(item))
  }

  const path = options.kind === 'movie' ? '/discover/movie' : '/discover/tv'
  const params: Record<string, string> = {
    sort_by: when === 'rating' ? 'vote_average.desc' : 'popularity.desc',
  }

  if (when === 'rating') {
    params['vote_count.gte'] = minVotes(options.kind)
  }

  if (options.providerId && options.region) {
    params.with_watch_providers = options.providerId
    params.watch_region = options.region
    params.with_watch_monetization_types = 'flatrate'
  }

  if (when === 'upcoming') {
    if (options.kind === 'movie') {
      params['primary_release_date.gte'] = todayIso()
    } else {
      params['first_air_date.gte'] = todayIso()
    }
  }

  if (options.kind === 'anime') {
    params.with_origin_country = 'JP'
    params.with_original_language = 'ja'
    params.without_genres = KIDS_GENRE
    params.with_genres = options.genreId
      ? `${ANIMATION_GENRE},${options.genreId}`
      : ANIMATION_GENRE
  } else if (options.genreId) {
    params.with_genres = String(options.genreId)
  }

  return pagedList(path, params, mediaType, page, perPage)
}
