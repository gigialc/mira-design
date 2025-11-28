'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate inputs
    if (!email || !password) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        console.log('Attempting sign up for:', email);
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        console.log('Sign up response:', { 
          hasUser: !!data?.user, 
          hasSession: !!data?.session,
          emailConfirmed: data?.user?.email_confirmed_at,
          error: signUpError?.message 
        });

        if (signUpError) {
          // Check if user already exists
          const errorMsg = signUpError.message.toLowerCase();
          if (errorMsg.includes('already registered') || 
              errorMsg.includes('already exists') || 
              errorMsg.includes('user already registered')) {
            setError('An account with this email already exists. Please sign in instead.');
            setIsSignUp(false);
            setLoading(false);
            return;
          }
          throw signUpError;
        }

        // Sign up was successful
        if (data.user) {
          // Check if this user already exists and is confirmed
          // If email is already confirmed, this is an existing user trying to sign up again
          if (data.user.email_confirmed_at !== null) {
            setError('An account with this email already exists. Please sign in instead.');
            setIsSignUp(false);
            setLoading(false);
            return;
          }

          // Check if email confirmation is required (new signup, email not confirmed)
          // If session is null, it means email confirmation is required
          if (!data.session && data.user.email_confirmed_at === null) {
            // Check if this is a new signup or an existing unconfirmed user
            // by checking the created_at timestamp - if it's very recent (within last 30 seconds), it's likely new
            const userCreatedAt = new Date(data.user.created_at);
            const now = new Date();
            const secondsDiff = (now.getTime() - userCreatedAt.getTime()) / 1000;
            
            // If user was created more than 30 seconds ago, they likely already exist
            if (secondsDiff > 30) {
              setError('An account with this email already exists but is not confirmed. Please check your email for the confirmation link, or try signing in.');
              setIsSignUp(false);
              setLoading(false);
              return;
            }
            
            // New signup (created within last 30 seconds) - show confirmation message
            // Prompts will be saved by HeroContent's onAuthStateChange listener
            setShowEmailConfirmation(true);
            setLoading(false);
            return;
          }
          
          // If we have a session, user is signed in (email confirmation not required or already confirmed)
          if (data.session) {
            // Prompts will be saved by HeroContent's onAuthStateChange listener
            onSuccess();
          } else {
            // Edge case: user created but no session and email not confirmed
            // Prompts will be saved by HeroContent's onAuthStateChange listener when email is confirmed
            setShowEmailConfirmation(true);
            setLoading(false);
          }
        } else {
          // No user data returned - this is unexpected
          setError('Sign up failed. Please try again.');
          setLoading(false);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          // Check if user needs to confirm email
          const errorMsg = signInError.message.toLowerCase();
          if (errorMsg.includes('email not confirmed') || 
              errorMsg.includes('email_not_confirmed') ||
              errorMsg.includes('confirm your email')) {
            setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
            setLoading(false);
            return;
          }
          throw signInError;
        }

        if (data.user && data.session) {
          // Prompts will be saved by HeroContent's onAuthStateChange listener
          onSuccess();
        } else {
          setError('Sign in failed. Please try again.');
          setLoading(false);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (googleError) throw googleError;

      // The OAuth flow will redirect, so we don't need to handle success here
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="rounded-2xl border border-white/30 bg-white/90 backdrop-blur-md shadow-2xl p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-2xl font-bold text-neutral-900 mb-6">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </h2>

          {showEmailConfirmation ? (
            <div className="space-y-4">
              <div className="text-sm text-neutral-700 bg-blue-50 p-4 rounded-lg">
                <p className="font-bold mb-2">Confirm your email</p>
                <p>We&apos;ve sent a confirmation email to <strong>{email}</strong>. Please check your inbox and click the confirmation link to complete your sign up.</p>
              </div>
              <button
                onClick={() => {
                  setShowEmailConfirmation(false);
                  setEmail('');
                  setPassword('');
                  // Call onSuccess since prompt has been saved
                  onSuccess();
                }}
                className="w-full px-6 py-3 rounded-full text-sm font-bold text-neutral-900 bg-white/70 backdrop-blur-md border border-white/60 hover:bg-white/80 transition-all shadow-md"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full px-6 py-3 rounded-full text-sm font-bold text-neutral-900 bg-white/70 backdrop-blur-md border border-white/60 hover:bg-white/80 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mb-4 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white/90 text-neutral-500">or</span>
                </div>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-normal text-neutral-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent transition-all text-neutral-900"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-normal text-neutral-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent transition-all text-neutral-900"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full px-6 py-3 rounded-full text-sm font-bold text-neutral-900 bg-white/70 backdrop-blur-md border border-white/60 hover:bg-white/80 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
            </>
          )}

          {!showEmailConfirmation && (
            <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

