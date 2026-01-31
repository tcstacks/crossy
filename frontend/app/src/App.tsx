import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import GameplayPage from './pages/GameplayPage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage';
import ArchivePage from './pages/ArchivePage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/play" element={<GameplayPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/archive" element={<ArchivePage />} />
      <Route path="/create-room" element={<CreateRoomPage />} />
      <Route path="/join-room" element={<JoinRoomPage />} />
    </Routes>
  );
}

export default App;
