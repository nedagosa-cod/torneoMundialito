// src/App.tsx
import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminPage } from './pages/AdminPage';
import { Navigation } from './components/Navigation';

function AppContent() {
  const { user, activeTab, loadMatches, loadPredictions, loadLeaderboard } = useStore();

  // Cuando el usuario ya está logueado (por persistencia), recargar datos
  useEffect(() => {
    if (user) {
      loadMatches();
      loadPredictions();
      loadLeaderboard();
    }
  }, [user?.userId]);

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'admin':
        return <AdminPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="page-enter">
      {renderPage()}
      <Navigation />
    </div>
  );
}

function App() {
  const { user } = useStore();

  if (!user) {
    return <LoginPage />;
  }

  return <AppContent />;
}

export default App;
