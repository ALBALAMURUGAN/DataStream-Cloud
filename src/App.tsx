import { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Console from './pages/Console';
import Pipeline from './pages/Pipeline';
import Datasets from './pages/Datasets';
import Anomalies from './pages/Anomalies';
import Architecture from './pages/Architecture';
import Pricing from './pages/Pricing';
import { engine } from './lib/engine';

function EngineBootstrap() {
  const { pathname } = useLocation();
  useEffect(() => { engine.start(); }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="min-h-[70vh] grid place-items-center bg-obsidian text-center px-6 pt-24">
      <div>
        <p className="font-mono text-[10px] tracking-[0.3em] text-gold">ERROR 404 · OFFSET OUT OF RANGE</p>
        <h1 className="font-display text-6xl font-bold text-white mt-4">404</h1>
        <p className="text-violet-mist/70 mt-2">This partition doesn't exist. The stream has moved on.</p>
        <a href="#/" className="inline-flex mt-6 h-12 px-6 items-center rounded-xl font-bold text-[#241a05] bg-gradient-to-r from-gold-soft to-gold-deep">← Return to the stream</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <EngineBootstrap />
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/console" element={<Console />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/datasets" element={<Datasets />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </HashRouter>
    </ToastProvider>
  );
}
