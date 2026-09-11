import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AppShell, Button } from './components'
import { ImportReview } from './screens/ImportReview/ImportReview'
import { Player } from './screens/Player/Player'
import { TrackLibrary } from './screens/TrackLibrary/TrackLibrary'

function BackToLibraryButton() {
  const navigate = useNavigate()
  return (
    <Button variant="ghost" icon="arrow_back" onClick={() => navigate('/')}>
      Biblioteca
    </Button>
  )
}

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppShell>
            <TrackLibrary />
          </AppShell>
        }
      />
      <Route
        path="/tracks/:trackId"
        element={
          <AppShell navEnd={<BackToLibraryButton />}>
            <Player />
          </AppShell>
        }
      />
      <Route
        path="/import/:importId"
        element={
          <AppShell navEnd={<BackToLibraryButton />}>
            <ImportReview />
          </AppShell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
