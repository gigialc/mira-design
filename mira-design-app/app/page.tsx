'use client';

import { useState } from 'react';
import Header from './components/Header';

export default function Home() {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col relative overflow-hidden">
      {/* Glass Ribbon/Gradient Sculpture */}
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

      <Header />

      {/* Main Content - Vertically Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-8 relative z-10">
        {/* Logo/Brand Name */}
        <div className="mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 tracking-tight">
          Design your brand
          </h2>
        </div>
        <div className="mb-8">
          <p className="text-lg text-neutral-500">
            Never use generic AI designs again. 
          </p>
        </div>

        {/* Main Input Box */}
        <div className="w-full max-w-2xl mb-8">
          <div className="relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Describe what you're looking for..."
              rows={4}
              className="w-full px-8 pt-8 pb-10 pr-20 text-sm font-normal rounded-2xl border border-white/30 bg-white/20 backdrop-blur-md shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all placeholder:text-neutral-500 placeholder:font-normal text-neutral-900 resize-none"
            />
            {/* Elegant Submit Arrow */}
            <button
              type="submit"
              className="absolute right-6 bottom-6 text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
