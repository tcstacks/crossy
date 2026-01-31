import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import GameplayPage from './pages/GameplayPage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage';
import ArchivePage from './pages/ArchivePage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import RoomLobbyPage from './pages/RoomLobbyPage';
import MultiplayerGamePage from './pages/MultiplayerGamePage';
import NotFoundPage from './pages/NotFoundPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/play" element={<GameplayPage />} />
      <Route path="/archive" element={<ArchivePage />} />

      {/* Protected routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/create"
        element={
          <ProtectedRoute>
            <CreateRoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/join"
        element={
          <ProtectedRoute>
            <JoinRoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:code"
        element={
          <ProtectedRoute>
            <RoomLobbyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:code/play"
        element={
          <ProtectedRoute>
            <MultiplayerGamePage />
          </ProtectedRoute>
        }
      />

      {/* 404 catch-all route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
