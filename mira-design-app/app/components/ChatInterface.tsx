'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import LoadingIndicator from './LoadingIndicator';

interface ChatInterfaceProps {
  initialPrompt: string;
  userId: string;
  promptId?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatInterface({ initialPrompt, userId, promptId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getClaudeResponse = useCallback(async (currentMessages: Message[], convId: string) => {
    try {
      setIsLoading(true);

      // Get the last user message to check if we already have a response
      const lastUserMessage = currentMessages.filter((msg) => msg.role === 'user').pop();
      
      if (lastUserMessage) {
        // Check if there's already an assistant message after this user message
        const { data: lastUserMsgInDb } = await supabase
          .from('messages')
          .select('created_at')
          .eq('conversation_id', convId)
          .eq('role', 'user')
          .eq('content', lastUserMessage.content)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastUserMsgInDb) {
          // Check if assistant message exists after this user message
          const { data: existingAssistantMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .eq('role', 'assistant')
            .gt('created_at', lastUserMsgInDb.created_at)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (existingAssistantMsg) {
            // Assistant response already exists - reload all messages to ensure sync
            const { data: allMessages } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', convId)
              .order('created_at', { ascending: true });

            if (allMessages && allMessages.length > 0) {
              const loadedMessages: Message[] = allMessages.map((msg) => ({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: new Date(msg.created_at),
              }));
              setMessages(loadedMessages);
            }
            setIsLoading(false);
            return;
          }
        }
      }

      // Prepare messages for Claude API
      const messagesForAPI = currentMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call Claude API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesForAPI,
          conversationId: convId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Claude');
      }

      const data = await response.json();
      
      // Before saving, check if this exact message already exists
      const { data: existingMsg } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .eq('role', 'assistant')
        .eq('content', data.message)
        .maybeSingle();

      if (existingMsg) {
        // Message already exists - reload all messages to ensure sync
        const { data: allMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true });

        if (allMessages && allMessages.length > 0) {
          const loadedMessages: Message[] = allMessages.map((msg) => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at),
          }));
          setMessages(loadedMessages);
        }
        setIsLoading(false);
        return;
      }

      // Save assistant message to database
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: convId,
            role: 'assistant',
            content: data.message,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        // If duplicate (race condition), reload all messages
        if (error.code === '23505' || error.message.includes('duplicate')) {
          const { data: allMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });
          
          if (allMessages && allMessages.length > 0) {
            const loadedMessages: Message[] = allMessages.map((msg) => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at),
            }));
            setMessages(loadedMessages);
          }
          setIsLoading(false);
          return;
        }
        throw error;
      }

      // Successfully saved - reload all messages to ensure we have the latest from DB
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (allMessages && allMessages.length > 0) {
        const loadedMessages: Message[] = allMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error getting Claude response:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble responding right now. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => {
        // Check if error message already exists
        if (prev.some((msg) => msg.content === errorMessage.content && msg.role === 'assistant')) {
          return prev;
        }
        return [...prev, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize conversation and load messages - session-based
  useEffect(() => {
    // Prevent duplicate initialization
    if (hasInitializedRef.current) return;
    
    const initializeConversation = async () => {
      // Set flag immediately to prevent duplicate calls
      hasInitializedRef.current = true;
      
      try {
        let convId: string | null = null;

        // STEP 1: Check if conversation already exists for this prompt/user
        // This ensures one conversation per prompt per user (session-based)
        if (promptId) {
          const { data: existingConv, error: convLookupError } = await supabase
            .from('conversations')
            .select('id')
            .eq('prompt_id', promptId)
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (convLookupError && convLookupError.code !== 'PGRST116') {
            throw convLookupError;
          }

          if (existingConv) {
            convId = existingConv.id;
            setConversationId(convId);
            
            // Load ALL existing messages from this conversation
            const { data: existingMessages, error: msgError } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', convId)
              .order('created_at', { ascending: true });

            if (msgError) throw msgError;

            if (existingMessages && existingMessages.length > 0) {
              // Conversation exists with messages - load them all
              const loadedMessages: Message[] = existingMessages.map((msg) => ({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: new Date(msg.created_at),
              }));
              setMessages(loadedMessages);
              setIsInitializing(false);
              return; // Exit early - conversation already exists with messages
            }
            // Conversation exists but no messages yet - continue to create initial message
          }
        }

        // STEP 2: Create new conversation ONLY if it doesn't exist
        if (!convId) {
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert([
              {
                user_id: userId,
                prompt_id: promptId || null,
                created_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (convError) {
            // If duplicate (race condition), fetch the existing one
            if (convError.code === '23505' || convError.message.includes('duplicate') || convError.code === 'PGRST116') {
              if (promptId) {
                const { data: existingConv } = await supabase
                  .from('conversations')
                  .select('id')
                  .eq('prompt_id', promptId)
                  .eq('user_id', userId)
                  .order('created_at', { ascending: true })
                  .limit(1)
                  .maybeSingle();
                
                if (existingConv) {
                  convId = existingConv.id;
                  setConversationId(convId);
                  
                  // Load all messages from existing conversation
                  const { data: allMessages } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', convId)
                    .order('created_at', { ascending: true });
                  
                  if (allMessages && allMessages.length > 0) {
                    const loadedMessages: Message[] = allMessages.map((msg) => ({
                      id: msg.id,
                      role: msg.role as 'user' | 'assistant',
                      content: msg.content,
                      timestamp: new Date(msg.created_at),
                    }));
                    setMessages(loadedMessages);
                    setIsInitializing(false);
                    return;
                  }
                }
              }
            } else {
              throw convError;
            }
          } else {
            convId = newConv.id;
            setConversationId(convId);
          }
        }

        // STEP 3: Check if initial message already exists in this conversation
        if (convId) {
          const { data: existingInitialMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .eq('content', initialPrompt)
            .eq('role', 'user')
            .maybeSingle();

          if (existingInitialMessage) {
            // Initial message exists - load ALL messages from conversation
            const { data: allMessages } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', convId)
              .order('created_at', { ascending: true });
            
            if (allMessages && allMessages.length > 0) {
              const loadedMessages: Message[] = allMessages.map((msg) => ({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: new Date(msg.created_at),
              }));
              setMessages(loadedMessages);
              setIsInitializing(false);
              return;
            }
          } else {
            // Initial message doesn't exist - create it ONCE
            const { error: msgError } = await supabase
              .from('messages')
              .insert([
                {
                  conversation_id: convId,
                  role: 'user',
                  content: initialPrompt,
                  created_at: new Date().toISOString(),
                },
              ]);

            if (msgError) {
              // If duplicate (race condition), reload all messages
              if (msgError.code === '23505' || msgError.message.includes('duplicate')) {
                const { data: allMessages } = await supabase
                  .from('messages')
                  .select('*')
                  .eq('conversation_id', convId)
                  .order('created_at', { ascending: true });
                
                if (allMessages && allMessages.length > 0) {
                  const loadedMessages: Message[] = allMessages.map((msg) => ({
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                    timestamp: new Date(msg.created_at),
                  }));
                  setMessages(loadedMessages);
                  setIsInitializing(false);
                  return;
                }
              }
              throw msgError;
            }

            // Successfully created initial message - add to UI and get Claude response
            const initialUserMessage: Message = {
              id: Date.now().toString(),
              role: 'user',
              content: initialPrompt,
              timestamp: new Date(),
            };
            setMessages([initialUserMessage]);
            
            // Get initial assistant response from Claude
            await getClaudeResponse([initialUserMessage], convId);
          }
        }

        setIsInitializing(false);
      } catch (error) {
        console.error('Error initializing conversation:', error);
        setIsInitializing(false);
        // Reset flag on error so user can retry
        hasInitializedRef.current = false;
      }
    };

    if (userId && initialPrompt && !hasInitializedRef.current) {
      initializeConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, initialPrompt, promptId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !conversationId) return;

    const messageContent = inputValue.trim();
    
    // Check if this exact message already exists in the database
    const { data: existingMsg } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .eq('content', messageContent)
      .maybeSingle();

    if (existingMsg) {
      // Message already exists - reload all messages to show current state
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (allMessages && allMessages.length > 0) {
        const loadedMessages: Message[] = allMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(loadedMessages);
      }
      setInputValue('');
      return;
    }

    // Save user message to database
    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            role: 'user',
            content: messageContent,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        // If duplicate (race condition), reload all messages
        if (error.code === '23505' || error.message.includes('duplicate')) {
          const { data: allMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

          if (allMessages && allMessages.length > 0) {
            const loadedMessages: Message[] = allMessages.map((msg) => ({
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at),
            }));
            setMessages(loadedMessages);
          }
          setInputValue('');
          return;
        }
        throw error;
      }

      // Successfully saved - reload all messages to ensure sync with DB
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (allMessages && allMessages.length > 0) {
        const loadedMessages: Message[] = allMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(loadedMessages);
        
        // Get Claude response with the updated messages
        await getClaudeResponse(loadedMessages, conversationId);
      }

      setInputValue('');
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-neutral-600">Loading conversation...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full relative">
      {/* Chat Container */}
      <div className="flex-1 flex flex-col w-full h-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto py-6">
          <div className="max-w-2xl mx-auto px-4 space-y-6">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}

            {isLoading && <LoadingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

