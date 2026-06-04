// src/components/Navigation.tsx
import React from 'react';
import { useStore } from '../store/useStore';

const tabs = [
  {
    id: 'dashboard' as const,
    label: 'Partidos',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className={`w-6 h-6 transition-all ${active ? 'scale-110' : ''}`}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
          fill={active ? 'rgba(34,197,94,0.15)' : 'transparent'}
        />
        <path
          d="M8 12l2 2 4-4M12 7v1M12 16v1M7 12H6M18 12h-1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Soccer ball pattern */}
        <path d="M12 2v4M2 12h4M22 12h-4M12 22v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'leaderboard' as const,
    label: 'Ranking',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className={`w-6 h-6 transition-all ${active ? 'scale-110' : ''}`}>
        <path
          d="M3 3h4v14H3zM10 8h4v9h-4zM17 5h4v12h-4z"
          fill={active ? 'rgba(34,197,94,0.2)' : 'transparent'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'admin' as const,
    label: 'Admin',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className={`w-6 h-6 transition-all ${active ? 'scale-110' : ''}`}>
        <path
          d="M12 2L2 7v5c0 5.55 3.84 10.74 10 12 6.16-1.26 10-6.45 10-12V7L12 2z"
          fill={active ? 'rgba(251,191,36,0.2)' : 'transparent'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab } = useStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto px-4 pb-safe">
        <div
          className="flex items-center justify-around px-2 py-2 mb-3 rounded-2xl border border-white/10"
          style={{
            background: 'rgba(4,26,13,0.9)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 -4px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab flex-1 ${isActive ? 'active' : ''}`}
                aria-label={tab.label}
              >
                {tab.icon(isActive)}
                <span className={`text-xs font-semibold font-display transition-all duration-200 ${isActive ? 'text-verde-400' : 'text-white/40'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gradient safe area */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 -z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #020c06 0%, transparent 100%)' }}
      />
    </nav>
  );
};
