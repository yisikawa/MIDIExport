import React from 'react';
import { Music } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: '2rem 0', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
          <Music size={32} color="#8b5cf6" />
        </div>
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.05em', background: 'linear-gradient(135deg, #fff 30%, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MIDIExport
        </h1>
      </header>
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {children}
      </main>

      <footer style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.875rem' }}>
        <p>Powered by <a href="https://github.com/spotify/basic-pitch-ts" target="_blank" style={{color: 'var(--color-accent)', textDecoration:'none'}}>@spotify/basic-pitch</a></p>
      </footer>
    </div>
  );
};
