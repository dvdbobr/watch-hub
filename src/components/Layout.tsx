import { NavLink, Outlet } from 'react-router-dom'
import { hasApiKey } from '../api/tmdb'
import { SearchBar } from './SearchBar'

export function Layout() {
  const ready = hasApiKey()

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <div className="brand">
            <span className="brand-mark">WH</span>
            <div className="brand-text">
              <p className="brand-name">Watch Hub</p>
              <p className="brand-tag">Movies · Series · Anime</p>
            </div>
          </div>
          <nav className="site-nav">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/browse">Browse</NavLink>
            <NavLink to="/library">Library</NavLink>
            <NavLink to="/recommendations">For you</NavLink>
          </nav>
          {ready ? <SearchBar /> : <div className="search-bar-spacer" />}
        </div>
      </header>
      {!ready ? (
        <div className="setup-banner">
          Add a free TMDB API key to <code>.env</code> as <code>VITE_TMDB_API_KEY</code>, then
          restart the dev server. Get a key at themoviedb.org/settings/api
        </div>
      ) : null}
      <main className="site-main">
        <Outlet />
      </main>
    </div>
  )
}
