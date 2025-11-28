'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import AuthModal from './AuthModal';
import ConversationsSidebar from './ConversationsSidebar';
import Image from 'next/image';

interface HeaderProps {
  onSelectConversation?: (promptId: string, promptText: string) => void;
  onNavigateHome?: () => void;
}

interface User {
  id: string;
  email?: string;
  avatar_url?: string;
}

export default function Header({ onSelectConversation, onNavigateHome }: HeaderProps) {
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Get avatar from Google auth provider metadata
        // Check user_metadata first, then identities for provider-specific fields
        let avatarUrl = 
          session.user.user_metadata?.avatar_url || 
          session.user.user_metadata?.picture ||
          null;
        
        // If not found in user_metadata, check identities for Google provider
        if (!avatarUrl && session.user.identities) {
          const googleIdentity = session.user.identities.find(
            (identity: { provider: string; identity_data?: { avatar_url?: string; picture?: string } }) => identity.provider === 'google'
          );
          if (googleIdentity?.identity_data?.avatar_url) {
            avatarUrl = googleIdentity.identity_data.avatar_url;
          } else if (googleIdentity?.identity_data?.picture) {
            avatarUrl = googleIdentity.identity_data.picture;
          }
        }
        
        setUser({
          id: session.user.id,
          email: session.user.email,
          avatar_url: avatarUrl,
        });
        setAvatarError(false);
      } else {
        setUser(null);
        setAvatarError(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Get avatar from Google auth provider metadata
        // Check user_metadata first (avatar_url or picture)
        let avatarUrl = 
          session.user.user_metadata?.avatar_url || 
          session.user.user_metadata?.picture ||
          null;
        
        // If not found in user_metadata, check identities for Google provider
        if (!avatarUrl && session.user.identities) {
          const googleIdentity = session.user.identities.find(
            (identity: { provider: string; identity_data?: { avatar_url?: string; picture?: string } }) => identity.provider === 'google'
          );
          if (googleIdentity?.identity_data?.avatar_url) {
            avatarUrl = googleIdentity.identity_data.avatar_url;
          } else if (googleIdentity?.identity_data?.picture) {
            avatarUrl = googleIdentity.identity_data.picture;
          }
        }
        
        console.log('Auth state change - Avatar URL:', avatarUrl);
        
        setUser({
          id: session.user.id,
          email: session.user.email,
          avatar_url: avatarUrl,
        });
        setAvatarError(false); // Reset error state on auth change
      } else {
        setUser(null);
        setAvatarError(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

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
          {/* Logo and My Projects on the left */}
          <div className="flex items-center gap-6">
            <button
              onClick={handleLogoClick}
              className="text-3xl font-bold text-neutral-900 tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
            >
              Mira
            </button>
            {user && (
              <button
                onClick={() => setShowSidebar(true)}
                className="px-4 py-2 rounded-full text-sm font-medium text-neutral-700 transition-all"
              >
                My Projects
              </button>
            )}
          </div>
          
          {/* Links and profile icon on the right */}
          <div className="flex items-center gap-8">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 focus:outline-none"
                >
                  {user.avatar_url && !avatarError ? (
                    <Image    
                      width={40}
                      height={40}
                      src={user.avatar_url}
                      alt={user.email || 'Profile'}
                      className="w-10 h-10 rounded-full border-2 border-white/40 hover:border-white/60 transition-all object-cover"
                      unoptimized
                      onError={() => {
                        console.error('Failed to load avatar image:', user.avatar_url);
                        setAvatarError(true);
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center flex-shrink-0 border-2 border-white/40 hover:border-white/60 transition-all">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white/90 backdrop-blur-md border border-white/30 shadow-xl overflow-hidden z-50">
                    <div className="py-1">
                      {user.email && (
                        <div className="px-4 py-2 text-sm text-neutral-700 border-b border-white/20">
                          {user.email}
                        </div>
                      )}
                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-white/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSigningOut ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Signing out...</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Sign Out</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
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

      {/* Conversations Sidebar */}
      {user && (
        <ConversationsSidebar
          userId={user.id}
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          onSelectConversation={(promptId, promptText) => {
            if (onSelectConversation) {
              onSelectConversation(promptId, promptText);
            }
            setShowSidebar(false);
          }}
        />
      )}
    </>
  );
}

