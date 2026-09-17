export interface WatchProvider {
  id: string
  name: string
}

export interface BrowseGenre {
  id: string
  name: string
  movie: number | null
  tv: number | null
}

export interface WatchRegion {
  id: string
  name: string
}

export const BROWSE_PAGE_SIZE = 24

export const WATCH_PROVIDERS: WatchProvider[] = [
  { id: '8', name: 'Netflix' },
  { id: '9', name: 'Prime Video' },
  { id: '337', name: 'Disney+' },
  { id: '350', name: 'Apple TV+' },
  { id: '1899|384', name: 'Max' },
  { id: '15', name: 'Hulu' },
  { id: '531', name: 'Paramount+' },
  { id: '386', name: 'Peacock' },
  { id: '283', name: 'Crunchyroll' },
]

export const WATCH_REGIONS: WatchRegion[] = [
  { id: 'US', name: 'United States' },
  { id: 'GB', name: 'United Kingdom' },
  { id: 'IL', name: 'Israel' },
  { id: 'CA', name: 'Canada' },
  { id: 'AU', name: 'Australia' },
  { id: 'DE', name: 'Germany' },
  { id: 'FR', name: 'France' },
  { id: 'JP', name: 'Japan' },
]

export const BROWSE_GENRES: BrowseGenre[] = [
  { id: 'action', name: 'Action', movie: 28, tv: 10759 },
  { id: 'adventure', name: 'Adventure', movie: 12, tv: 10759 },
  { id: 'comedy', name: 'Comedy', movie: 35, tv: 35 },
  { id: 'crime', name: 'Crime', movie: 80, tv: 80 },
  { id: 'documentary', name: 'Documentary', movie: 99, tv: 99 },
  { id: 'drama', name: 'Drama', movie: 18, tv: 18 },
  { id: 'family', name: 'Family', movie: 10751, tv: 10751 },
  { id: 'fantasy', name: 'Fantasy', movie: 14, tv: 10765 },
  { id: 'history', name: 'History', movie: 36, tv: null },
  { id: 'horror', name: 'Horror', movie: 27, tv: null },
  { id: 'mystery', name: 'Mystery', movie: 9648, tv: 9648 },
  { id: 'romance', name: 'Romance', movie: 10749, tv: 10749 },
  { id: 'scifi', name: 'Sci-Fi', movie: 878, tv: 10765 },
  { id: 'thriller', name: 'Thriller', movie: 53, tv: null },
  { id: 'war', name: 'War', movie: 10752, tv: 10768 },
  { id: 'western', name: 'Western', movie: 37, tv: 37 },
]

export function genreSlugFromIds(ids: number[], kind: 'movie' | 'tv' | 'anime'): string | null {
  const useMovie = kind === 'movie'
  for (const genre of BROWSE_GENRES) {
    const match = useMovie ? genre.movie : genre.tv ?? genre.movie
    if (match && ids.includes(match)) return genre.id
  }
  return null
}
