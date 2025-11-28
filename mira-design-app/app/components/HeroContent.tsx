'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import AuthModal from './AuthModal';
import SwipeDesigns from './SwipeDesigns';

export default function HeroContent() {
  const [inputValue, setInputValue] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSwipeScreen, setShowSwipeScreen] = useState(false);
  const [savedPrompt, setSavedPrompt] = useState('');
  const [user, setUser] = useState<{ id: string } | null>(null);
  const previousUserRef = useRef<{ id: string } | null>(null);

  const savePendingPrompts = async (userId: string) => {
    try {
      const savedPrompts = JSON.parse(localStorage.getItem('pendingPrompts') || '[]');
      if (savedPrompts.length === 0) return;

      // Get the first prompt for the swipe screen
      const firstPrompt = savedPrompts[0]?.prompt || '';

      // Clear localStorage immediately to prevent duplicate saves
      localStorage.removeItem('pendingPrompts');

      // Save all pending prompts to database
      const promptsToSave = savedPrompts.map((item: { prompt: string; timestamp: string }) => ({
        user_id: userId,
        prompt: item.prompt,
        created_at: item.timestamp || new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('user_prompts')
        .insert(promptsToSave);

      if (error) {
        console.error('Error saving pending prompts:', error);
        // Restore to localStorage if save failed
        localStorage.setItem('pendingPrompts', JSON.stringify(savedPrompts));
      } else {
        console.log(`Saved ${promptsToSave.length} pending prompt(s) to database`);
        // Show swipe screen with the first prompt
        if (firstPrompt) {
          setSavedPrompt(firstPrompt);
          setShowSwipeScreen(true);
        }
      }
    } catch (err) {
      console.error('Error processing pending prompts:', err);
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      previousUserRef.current = currentUser;
      setUser(currentUser);
      // If user is already logged in on page load, save pending prompts
      if (currentUser) {
        savePendingPrompts(currentUser.id);
      }
    });

    // Listen for auth changes - this is the ONLY place we save pending prompts after login
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      const previousUser = previousUserRef.current;
      const wasLoggedOut = previousUser === null && currentUser !== null;
      
      previousUserRef.current = currentUser;
      setUser(currentUser);
      
      // Only save pending prompts when user transitions from logged out to logged in
      // This prevents saving multiple times
      if (wasLoggedOut && currentUser) {
        savePendingPrompts(currentUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;

    // If user is not authenticated, save to localStorage and show auth modal
    if (!user) {
      // Save prompt to localStorage temporarily
      const savedPrompts = JSON.parse(localStorage.getItem('pendingPrompts') || '[]');
      savedPrompts.push({
        prompt: inputValue.trim(),
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('pendingPrompts', JSON.stringify(savedPrompts));
      
      setShowAuthModal(true);
      setInputValue('');
      return;
    }

    // If user is authenticated, save prompt directly
    await savePrompt(inputValue, user.id);
    setInputValue('');
  };

  const savePrompt = async (promptText: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('user_prompts')
        .insert([
          {
            user_id: userId,
            prompt: promptText,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.error('Error saving prompt:', error);
        // If table doesn't exist, show a helpful message
        if (error.code === '42P01') {
          alert('Please create the user_prompts table in your Supabase database first. See the SQL migration in the comments.');
        }
      } else {
        // Success - show swipe screen
        console.log('Prompt saved successfully');
        setSavedPrompt(promptText);
        setShowSwipeScreen(true);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setInputValue('');
    // Check if there are pending prompts that were just saved
    // The savePendingPrompts function will handle showing the swipe screen
  };

  if (showSwipeScreen) {
    return (
      <SwipeDesigns
        prompt={savedPrompt}
      />
    );
  }

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
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-2">
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
      </form>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
        }}
        onSuccess={handleAuthSuccess}
      />

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
            <span className="text-xs font-bold text-neutral-700">Landing Page</span>
          </div>
          <div className="px-4 py-2 rounded-full border border-white/30 bg-white/20 backdrop-blur-md shadow-lg hover:bg-white/30 transition-all relative">
            <span className="text-xs font-bold text-neutral-700">Branded Content</span>
            <span className="absolute -top-1 -right-1 text-[8px] font-normal text-neutral-500 bg-white/60 px-1 rounded">coming soon</span>
          </div>
        </div>
      </div>
    </main>
  );
}

