import type { ExternalRatings, TitleDetails } from '../types'

function yearNum(year: string): number | null {
  const value = Number(year)
  return Number.isFinite(value) && value > 0 ? value : null
}

function titlesMatch(left: string, right: string): boolean {
  const clean = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  const a = clean(left)
  const b = clean(right)
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)))
}

function yearClose(found: number | null | undefined, expected: number | null): boolean {
  if (!expected || !found) return true
  return Math.abs(found - expected) <= 1
}

async function fetchAniList(title: string, originalTitle: string, year: string): Promise<number | null> {
  const query = `
    query ($search: String) {
      Page(perPage: 8) {
        media(search: $search, type: ANIME) {
          averageScore
          startDate { year }
          title { romaji english native }
        }
      }
    }
  `
  const response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: { search: originalTitle || title } }),
  })
  if (!response.ok) return null
  const json = (await response.json()) as {
    data?: {
      Page?: {
        media?: {
          averageScore?: number | null
          startDate?: { year?: number | null }
          title?: { romaji?: string | null; english?: string | null; native?: string | null }
        }[]
      }
    }
  }
  const expected = yearNum(year)
  const hits = json.data?.Page?.media || []
  const match =
    hits.find((item) => {
      const names = [item.title?.english, item.title?.romaji, item.title?.native].filter(Boolean) as string[]
      const nameOk = names.some((name) => titlesMatch(name, title) || titlesMatch(name, originalTitle))
      return nameOk && yearClose(item.startDate?.year, expected)
    }) || hits.find((item) => yearClose(item.startDate?.year, expected)) || hits[0]
  const score = match?.averageScore
  return typeof score === 'number' && score > 0 ? score / 10 : null
}

async function fetchMal(title: string, originalTitle: string, year: string): Promise<number | null> {
  const query = encodeURIComponent(originalTitle || title)
  const response = await fetch(`https://api.jikan.moe/v4/anime?q=${query}&limit=8`)
  if (!response.ok) return null
  const json = (await response.json()) as {
    data?: {
      score?: number | null
      year?: number | null
      title?: string
      title_english?: string | null
      title_japanese?: string | null
    }[]
  }
  const expected = yearNum(year)
  const hits = json.data || []
  const match =
    hits.find((item) => {
      const names = [item.title, item.title_english, item.title_japanese].filter(Boolean) as string[]
      const nameOk = names.some((name) => titlesMatch(name, title) || titlesMatch(name, originalTitle))
      return nameOk && yearClose(item.year, expected)
    }) || hits.find((item) => yearClose(item.year, expected)) || hits[0]
  const score = match?.score
  return typeof score === 'number' && score > 0 ? score : null
}

async function fetchOmdb(imdbId: string): Promise<{ imdb: ExternalRatings['imdb']; rottenTomatoes: ExternalRatings['rottenTomatoes'] }> {
  const key = import.meta.env.VITE_OMDB_API_KEY as string | undefined
  if (!key) return { imdb: null, rottenTomatoes: null }
  const response = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(key)}`)
  if (!response.ok) return { imdb: null, rottenTomatoes: null }
  const json = (await response.json()) as {
    Response?: string
    imdbRating?: string
    imdbVotes?: string
    Ratings?: { Source?: string; Value?: string }[]
  }
  if (json.Response === 'False') return { imdb: null, rottenTomatoes: null }

  const imdbScore = Number(json.imdbRating)
  const imdb =
    Number.isFinite(imdbScore) && imdbScore > 0
      ? { score: imdbScore, votes: json.imdbVotes || '' }
      : null

  const tomato = json.Ratings?.find((item) => item.Source === 'Rotten Tomatoes')?.Value
  const percent = tomato ? Number(tomato.replace('%', '')) : NaN
  const rottenTomatoes = Number.isFinite(percent) ? { percent } : null

  return { imdb, rottenTomatoes }
}

export async function getExternalRatings(details: TitleDetails): Promise<ExternalRatings> {
  const ratings: ExternalRatings = {
    imdb: null,
    rottenTomatoes: null,
    mal: null,
    anilist: null,
  }

  const jobs: Promise<void>[] = []

  if (details.imdbId) {
    jobs.push(
      fetchOmdb(details.imdbId)
        .then((next) => {
          ratings.imdb = next.imdb
          ratings.rottenTomatoes = next.rottenTomatoes
        })
        .catch(() => undefined),
    )
  }

  if (details.mediaType === 'anime') {
    jobs.push(
      fetchAniList(details.title, details.originalTitle, details.year)
        .then((score) => {
          ratings.anilist = score ? { score } : null
        })
        .catch(() => undefined),
    )
    jobs.push(
      fetchMal(details.title, details.originalTitle, details.year)
        .then((score) => {
          ratings.mal = score ? { score } : null
        })
        .catch(() => undefined),
    )
  }

  await Promise.all(jobs)
  return ratings
}
