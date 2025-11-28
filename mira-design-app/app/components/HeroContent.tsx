'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import AuthModal from './AuthModal';
import ChatInterface from './ChatInterface';

interface HeroContentProps {
  selectedPromptId?: string;
  selectedPromptText?: string;
  onConversationSelected?: () => void;
  onChatStateChange?: (isActive: boolean) => void;
  shouldReset?: boolean;
}

export default function HeroContent({
  selectedPromptId,
  selectedPromptText,
  onConversationSelected,
  onChatStateChange,
  shouldReset,
}: HeroContentProps) {
  const [inputValue, setInputValue] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [savedPrompt, setSavedPrompt] = useState('');
  const [savedPromptId, setSavedPromptId] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const previousUserRef = useRef<{ id: string } | null>(null);

  // Reset chat interface when navigating home
  useEffect(() => {
    if (shouldReset && showChatInterface) {
      // Use requestAnimationFrame to defer state updates
      requestAnimationFrame(() => {
        setShowChatInterface(false);
        setSavedPrompt('');
        setSavedPromptId(undefined);
        sessionStorage.removeItem('activeConversation');
      });
    }
  }, [shouldReset, showChatInterface]);

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
        // Show chat interface with the first prompt
        if (firstPrompt) {
          setSavedPrompt(firstPrompt);
          // Get the prompt ID from the database
          const { data: promptData } = await supabase
            .from('user_prompts')
            .select('id')
            .eq('user_id', userId)
            .eq('prompt', firstPrompt)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (promptData?.id) {
            setSavedPromptId(promptData.id);
            // Save active conversation to sessionStorage for persistence
            sessionStorage.setItem('activeConversation', JSON.stringify({
              promptId: promptData.id,
              prompt: firstPrompt,
            }));
          }
          setShowChatInterface(true);
        }
      }
    } catch (err) {
      console.error('Error processing pending prompts:', err);
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      previousUserRef.current = currentUser;
      setUser(currentUser);
      
      if (currentUser) {
        // Note: Conversation selection from sidebar is handled in separate useEffect below
        // This useEffect only handles initial load and sessionStorage restoration
        
        // Check if there's an active conversation in sessionStorage
        const activeConversation = sessionStorage.getItem('activeConversation');
        if (activeConversation) {
          try {
            const { promptId } = JSON.parse(activeConversation);
            // Verify the conversation still exists and belongs to this user
            const { data: promptData } = await supabase
              .from('user_prompts')
              .select('id, prompt')
              .eq('id', promptId)
              .eq('user_id', currentUser.id)
              .single();
            
            if (promptData) {
              // Restore the conversation
              setSavedPrompt(promptData.prompt);
              setSavedPromptId(promptData.id);
              setShowChatInterface(true);
              return; // Don't process pending prompts if restoring conversation
            } else {
              // Conversation doesn't exist, clear sessionStorage
              sessionStorage.removeItem('activeConversation');
            }
          } catch (err) {
            console.error('Error restoring conversation:', err);
            sessionStorage.removeItem('activeConversation');
          }
        }
        
        // If user is already logged in on page load, save pending prompts
        savePendingPrompts(currentUser.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      const previousUser = previousUserRef.current;
      const wasLoggedOut = previousUser === null && currentUser !== null;
      const wasLoggedIn = previousUser !== null && currentUser === null;
      
      previousUserRef.current = currentUser;
      setUser(currentUser);
      
      // Reset chat interface state when user signs out
      if (wasLoggedIn) {
        setShowChatInterface(false);
        setSavedPrompt('');
        setSavedPromptId(undefined);
        sessionStorage.removeItem('activeConversation');
      }
      
      if (wasLoggedOut && currentUser) {
        savePendingPrompts(currentUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [selectedPromptId, selectedPromptText, onConversationSelected]);

  useEffect(() => {
    if (user && selectedPromptId && selectedPromptText) {
      console.log('Opening conversation:', selectedPromptId, selectedPromptText);
      // Use requestAnimationFrame to defer state updates
      requestAnimationFrame(() => {
        setSavedPrompt(selectedPromptText);
        setSavedPromptId(selectedPromptId);
        setShowChatInterface(true);
        // Save to sessionStorage for persistence
        sessionStorage.setItem('activeConversation', JSON.stringify({
          promptId: selectedPromptId,
          prompt: selectedPromptText,
        }));
      });
    }
  }, [selectedPromptId, selectedPromptText, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;

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

    await savePrompt(inputValue, user.id);
    setInputValue('');
  };

  const savePrompt = async (promptText: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_prompts')
        .insert([
          {
            user_id: userId,
            prompt: promptText,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error saving prompt:', error);
        // If table doesn't exist, show a helpful message
        if (error.code === '42P01') {
          alert('Please create the user_prompts table in your Supabase database first. See the SQL migration in the comments.');
        }
      } else {
        // Success - show chat interface with prompt ID
        console.log('Prompt saved successfully');
        setSavedPrompt(promptText);
        setSavedPromptId(data?.id);
        
        // Save active conversation to sessionStorage for persistence
        if (data?.id) {
          sessionStorage.setItem('activeConversation', JSON.stringify({
            promptId: data.id,
            prompt: promptText,
          }));
        }
        
        setShowChatInterface(true);
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

  useEffect(() => {
    if (onChatStateChange) {
      onChatStateChange(showChatInterface);
    }
  }, [showChatInterface, onChatStateChange]);

  if (showChatInterface && user) {
    return (
      <ChatInterface
        initialPrompt={savedPrompt}
        userId={user.id}
        promptId={savedPromptId}
      />
    );
  }

  return (
    <main className={`flex-1 flex flex-col items-center justify-start px-8 ${showChatInterface ? 'pt-8' : 'pt-40'} pb-8 relative z-10`}>
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

      <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-2">
        <div className="relative">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="What do you want to create?"
            rows={4}
            className="w-full px-8 pt-8 pb-10 pr-20 text-sm font-normal rounded-2xl border border-gray-300 bg-white/20 backdrop-blur-md shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-gray-400 transition-all placeholder:text-neutral-500 placeholder:font-normal text-neutral-900 resize-none"
          />

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

