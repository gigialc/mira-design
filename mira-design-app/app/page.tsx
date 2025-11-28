'use client';

import { useState } from 'react';
import Header from './components/Header';
import HeroContent from './components/HeroContent';

export default function Home() {
  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>();
  const [selectedPromptText, setSelectedPromptText] = useState<string>('');
  const [isChatActive, setIsChatActive] = useState(false);

  const handleSelectConversation = (promptId: string, promptText: string) => {
    setSelectedPromptId(promptId);
    setSelectedPromptText(promptText);
  };

  const handleNavigateHome = () => {
    setSelectedPromptId(undefined);
    setSelectedPromptText('');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative overflow-hidden">
      {/* Glass Ribbon/Gradient Sculpture - Hidden when chat is active */}
      {!isChatActive && (
        <div className="fixed bottom-0 left-0 right-0 h-48 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-purple-200/30 via-pink-200/20 to-orange-200/30 backdrop-blur-2xl">
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 1200 400"
              preserveAspectRatio="none"
            >
              <path
                d="M0,400 Q150,350 300,380 T600,320 Q750,300 900,340 T1200,280 Q1200,200 1200,150 Q1200,100 1100,80 Q1000,60 900,100 Q800,140 700,120 Q600,100 500,130 Q400,160 300,140 Q200,120 100,150 Q0,180 0,220 Q0,260 0,300 Q0,340 0,400 Z"
                fill="url(#gradient)"
                className="opacity-40"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(168, 85, 247, 0.3)" />
                  <stop offset="50%" stopColor="rgba(236, 72, 153, 0.2)" />
                  <stop offset="100%" stopColor="rgba(251, 146, 60, 0.3)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      )}

      <Header 
        onSelectConversation={handleSelectConversation}
        onNavigateHome={handleNavigateHome}
      />
      <HeroContent
        selectedPromptId={selectedPromptId}
        selectedPromptText={selectedPromptText}
        onConversationSelected={() => {
          setSelectedPromptId(undefined);
          setSelectedPromptText('');
        }}
        onChatStateChange={setIsChatActive}
        shouldReset={selectedPromptId === undefined && selectedPromptText === ''}
      />
    </div>
  );
}
