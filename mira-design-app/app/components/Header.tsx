'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AuthModal from './AuthModal';

export default function Header() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleStartClick = () => {
    // If user is not authenticated, show auth modal
    if (!user) {
      setShowAuthModal(true);
    } else {
      // If user is authenticated, you can redirect or do something else
      // For now, just close any open modal
      setShowAuthModal(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <nav className="w-full py-4 px-8 relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo on the left */}
          <div className="flex items-center">
            <a href="#" className="text-3xl font-bold text-neutral-900 tracking-tight">
              Mira
            </a>
          </div>
          
          {/* Links and profile icon on the right */}
          <div className="flex items-center gap-8">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="px-6 py-2.5 rounded-full text-sm font-normal text-neutral-700 bg-white/50 backdrop-blur-md border border-white/40">
                  <span>{user.email}</span>
                </div>
                <button 
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-neutral-600 hover:text-neutral-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSigningOut ? (
                    <>
                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Signing out...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button 
                onClick={handleStartClick}
                className="px-6 py-2.5 rounded-full text-sm font-bold text-neutral-900 bg-white/70 backdrop-blur-md border border-white/60 hover:bg-white/80 transition-all shadow-md"
              >
                Start
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}

