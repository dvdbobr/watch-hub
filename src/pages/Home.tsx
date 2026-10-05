import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { discoverTitles, getUpcomingAnime, getUpcomingMovies, getUpcomingSeries, hasApiKey } from '../api/tmdb'
import { PosterRow } from '../components/PosterRow'
import type { MediaType, TmdbTitle } from '../types'

interface RowState {
  items: TmdbTitle[]
  loading: boolean
  error: string | null
}

function emptyRow(): RowState {
  return { items: [], loading: true, error: null }
}

function rowItems(kind: MediaType, when: 'hype' | 'rating'): Promise<TmdbTitle[]> {
  return discoverTitles({ kind, when }).then((result) => result.items)
}

export function Home() {
  const [hypeMovies, setHypeMovies] = useState<RowState>(emptyRow)
  const [ratedMovies, setRatedMovies] = useState<RowState>(emptyRow)
  const [hypeSeries, setHypeSeries] = useState<RowState>(emptyRow)
  const [ratedSeries, setRatedSeries] = useState<RowState>(emptyRow)
  const [hypeAnime, setHypeAnime] = useState<RowState>(emptyRow)
  const [ratedAnime, setRatedAnime] = useState<RowState>(emptyRow)
  const [upcomingMovies, setUpcomingMovies] = useState<RowState>(emptyRow)
  const [upcomingSeries, setUpcomingSeries] = useState<RowState>(emptyRow)
  const [upcomingAnime, setUpcomingAnime] = useState<RowState>(emptyRow)

  useEffect(() => {
    if (!hasApiKey()) {
      const idle = { items: [], loading: false, error: null }
      setHypeMovies(idle)
      setRatedMovies(idle)
      setHypeSeries(idle)
      setRatedSeries(idle)
      setHypeAnime(idle)
      setRatedAnime(idle)
      setUpcomingMovies(idle)
      setUpcomingSeries(idle)
      setUpcomingAnime(idle)
      return
    }

    function load(
      fetcher: () => Promise<TmdbTitle[]>,
      setter: Dispatch<SetStateAction<RowState>>,
    ) {
      fetcher()
        .then((items) => setter({ items, loading: false, error: null }))
        .catch((error: unknown) =>
          setter({
            items: [],
            loading: false,
            error: error instanceof Error ? error.message : 'Could not load titles',
          }),
        )
    }

    load(() => rowItems('movie', 'hype'), setHypeMovies)
    load(() => rowItems('movie', 'rating'), setRatedMovies)
    load(() => rowItems('tv', 'hype'), setHypeSeries)
    load(() => rowItems('tv', 'rating'), setRatedSeries)
    load(() => rowItems('anime', 'hype'), setHypeAnime)
    load(() => rowItems('anime', 'rating'), setRatedAnime)
    load(getUpcomingMovies, setUpcomingMovies)
    load(getUpcomingSeries, setUpcomingSeries)
    load(getUpcomingAnime, setUpcomingAnime)
  }, [])

  return (
    <div className="page">
      <PosterRow heading="Trending movies" browseTo="/browse?kind=movie&when=hype" {...hypeMovies} />
      <PosterRow heading="Top rated movies" browseTo="/browse?kind=movie&when=rating" {...ratedMovies} />
      <PosterRow heading="Trending series" browseTo="/browse?kind=tv&when=hype" {...hypeSeries} />
      <PosterRow heading="Top rated series" browseTo="/browse?kind=tv&when=rating" {...ratedSeries} />
      <PosterRow heading="Trending anime" browseTo="/browse?kind=anime&when=hype" {...hypeAnime} />
      <PosterRow heading="Top rated anime" browseTo="/browse?kind=anime&when=rating" {...ratedAnime} />
      <PosterRow
        heading="Upcoming movies"
        browseTo="/browse?kind=movie&when=upcoming"
        {...upcomingMovies}
      />
      <PosterRow
        heading="Upcoming series"
        browseTo="/browse?kind=tv&when=upcoming"
        {...upcomingSeries}
      />
      <PosterRow
        heading="Upcoming anime"
        browseTo="/browse?kind=anime&when=upcoming"
        {...upcomingAnime}
      />
    </div>
  )
}
