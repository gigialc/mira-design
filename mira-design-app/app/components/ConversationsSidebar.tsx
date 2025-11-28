'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Conversation {
  id: string;
  prompt_id: string;
  prompt_text: string;
  created_at: string;
  updated_at: string;
}

interface ConversationsSidebarProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (promptId: string, promptText: string) => void;
}

export default function ConversationsSidebar({
  userId,
  isOpen,
  onClose,
  onSelectConversation,
}: ConversationsSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchConversations();
    }
  }, [isOpen, userId]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      // Fetch conversations with their prompts
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select('id, prompt_id, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        return;
      }

      // Fetch prompts for all conversations
      const promptIds = conversationsData
        .map((c) => c.prompt_id)
        .filter((id): id is string => id !== null);

      if (promptIds.length === 0) {
        setConversations([]);
        return;
      }

      const { data: promptsData, error: promptsError } = await supabase
        .from('user_prompts')
        .select('id, prompt')
        .in('id', promptIds)
        .eq('user_id', userId);

      if (promptsError) throw promptsError;

      // Map conversations with their prompts
      const promptsMap = new Map(
        (promptsData || []).map((p) => [p.id, p.prompt])
      );

      const formattedConversations: Conversation[] = conversationsData.map(
        (conv) => ({
          id: conv.id,
          prompt_id: conv.prompt_id || '',
          prompt_text: conv.prompt_id
            ? promptsMap.get(conv.prompt_id) || 'Untitled'
            : 'Untitled',
          created_at: conv.created_at,
          updated_at: conv.updated_at,
        })
      );

      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationClick = (promptId: string, promptText: string) => {
    onSelectConversation(promptId, promptText);
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-80 bg-white/90 backdrop-blur-md border-r border-white/30 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/30">
            <h2 className="text-xl font-bold text-neutral-900">My Projects</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <svg
                className="w-5 h-5 text-neutral-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-neutral-500">Loading...</div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-neutral-500 mb-2">No conversations yet</p>
                <p className="text-sm text-neutral-400">Start a new project to see it here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() =>
                      handleConversationClick(conversation.prompt_id, conversation.prompt_text)
                    }
                    className="w-full text-left p-4 rounded-lg bg-white/50 hover:bg-white/70 border border-white/30 transition-all group"
                  >
                    <p className="text-sm font-medium text-neutral-900 mb-1 line-clamp-2 group-hover:text-neutral-700">
                      {conversation.prompt_text}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDate(conversation.updated_at)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

