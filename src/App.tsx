import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Browse } from './pages/Browse'
import { Home } from './pages/Home'
import { Library } from './pages/Library'
import { Recommendations } from './pages/Recommendations'
import { TitlePage } from './pages/Title'
import { CollectionProvider } from './store/CollectionContext'

export default function App() {
  return (
    <CollectionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/library" element={<Library />} />
            <Route path="/title/:type/:id" element={<TitlePage />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CollectionProvider>
  )
}
