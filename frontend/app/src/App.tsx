import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import GameplayPage from './pages/GameplayPage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/play" element={<GameplayPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/history" element={<HistoryPage />} />
    </Routes>
  );
}

export default App;
