'use client';

import { useState } from 'react';

export default function HeroContent() {
  const [inputValue, setInputValue] = useState('');

  return (
    <main className="flex-1 flex flex-col items-center justify-start px-8 pt-40 pb-8 relative z-10">
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
      <div className="w-full max-w-2xl mb-2">
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

      {/* Things We Can Create */}
      <div className="w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="px-4 py-2 rounded-full border border-white/30 bg-white/20 backdrop-blur-md shadow-lg hover:bg-white/30 transition-all">
            <span className="text-xs font-bold text-neutral-700">Logo</span>
          </div>
          <div className="px-4 py-2 rounded-full border border-white/30 bg-white/20 backdrop-blur-md shadow-lg hover:bg-white/30 transition-all">
            <span className="text-xs font-bold text-neutral-700">Typography</span>
          </div>
          <div className="px-4 py-2 rounded-full border border-white/30 bg-white/20 backdrop-blur-md shadow-lg hover:bg-white/30 transition-all">
            <span className="text-xs font-bold text-neutral-700">Color Palette</span>
          </div>
          <div className="px-4 py-2 rounded-full border border-white/30 bg-white/20 backdrop-blur-md shadow-lg hover:bg-white/30 transition-all">
            <span className="text-xs font-bold text-neutral-700">Branded Content</span>
          </div>
          <div className="px-4 py-2 rounded-full border border-white/30 bg-white/20 backdrop-blur-md shadow-lg hover:bg-white/30 transition-all">
            <span className="text-xs font-bold text-neutral-700">Landing Page</span>
          </div>
        </div>
      </div>
    </main>
  );
}

