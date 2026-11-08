import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import TopBar from './components/TopBar.jsx';
import Footer from './components/Footer.jsx';
import AlertDrawer from './components/AlertDrawer.jsx';
import Overview from './pages/Overview.jsx';
import LiveMap from './pages/LiveMap.jsx';
import Trends from './pages/Trends.jsx';
import Compare from './pages/Compare.jsx';
import Health from './pages/Health.jsx';
import Forecast from './pages/Forecast.jsx';
import Assistant from './pages/Assistant.jsx';
import Methodology from './pages/Methodology.jsx';
import ImpactReport from './pages/ImpactReport.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="app-shell">
      <ScrollToTop />
      <TopBar />
      <main id="main" className="app-main">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/health" element={<Health />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/report" element={<ImpactReport />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <AlertDrawer />
    </div>
  );
}
