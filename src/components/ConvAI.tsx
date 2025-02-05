"use client"

// import { createClient } from '@/utils/supabase/server';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Conversation } from '@11labs/client';
import { Button } from '@/components/ui/AgentButton';
import { useConversation } from "@11labs/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/AgentCard';
import { cn } from '@/lib/utils';

interface ConvAIProps {
  userId: string | null;
  subscriptionTier: string;
}

// Add voice mapping interface
interface VoiceOption {
  name: string;
  id: string;
  language: string;
}

// Create a VoiceDropdown component similar to LanguageDropdown
interface VoiceDropdownProps {
  voice: string;
  setVoice: (voice: string) => void;
  disabled?: boolean;
}


// Add VoicePreviewButton component
function VoicePreviewButton({ voice }: { voice: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreview = async () => {
    try {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } else {
          await audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    } catch (error) {
      console.error('Error playing voice sample:', error);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    
    const handleEnded = () => {
      setIsPlaying(false);
    };

    if (audio) {
      audio.addEventListener('ended', handleEnded);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('ended', handleEnded);
      }
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handlePreview}
        className="ml-2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
        title="Preview voice"
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>
      <audio 
        ref={audioRef} 
        src={`https://voices.notebooklmpodcast.com/voice_preview_${encodeURIComponent(voice)}.mp3`} 
        preload="none" 
      />
    </>
  );
}

export function ConvAI({ userId, subscriptionTier }: ConvAIProps) {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const conversationCreatedAtRef = useRef<string | null>(null);

  function handleError(message: string) {
    console.error(message);
    alert(message);
    setHasError(true);
  }

  async function requestMicrophonePermission(): Promise<boolean> {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch {
      handleError('Microphone permission denied');
      return false;
    }
  }

  async function getSignedUrl(): Promise<string> {
    try {
        const response = await fetch(
            `/api/signed-url?userId=${userId}&subscriptionTier=${subscriptionTier}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const data = await response.json();
        
        if (!response.ok) {
            // 使用服务器返回的具体错误信息
            throw new Error(data.error || 'Failed to get signed url');
        }

        return data.signedUrl;
    } catch (error) {
        // 向上抛出具体的错误信息
        throw error;
    }
  }

  async function startConversation() {
    if (subscriptionTier === 'Hobby') {
      handleError('This feature is not available on the Hobby Plan. Please upgrade your subscription to use this feature.');
      return;
    }
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) return;

    try {
      const signedUrl = await getSignedUrl();
    
      const newConversation = await Conversation.startSession({
        signedUrl,
        overrides: {
          // agent: {
          //   language: "en",            
          //   firstMessage: "Hello! I'm your AI podcast host. Let's have a conversation.",
          // },
          // tts: {
          //   voiceId: "21m00Tcm4TlvDq8ikWAM", // Default voice ID
          // },
        },
        onConnect: ({ conversationId }) => {
          setConversationId(conversationId);
          conversationCreatedAtRef.current = new Date().toISOString();
          setIsConnected(true);
          setIsSpeaking(true);
        },
        onDisconnect: () => {
          setIsConnected(false);
          setIsSpeaking(false);
        },
        onModeChange: ({ mode }) => {
          setIsSpeaking(mode === 'speaking');
        },
        onError: (error) => {
          handleError(error || 'An error occurred during the conversation');
        },
      });
      setConversation(newConversation);
    } catch (error) {
      handleError(error instanceof Error ? error.message : String(error));
    }
  }

  async function endConversation() {
    if (!conversation) return;

    try {
      setIsEnding(true); // Start loading state
      
      // End the conversation first
      await conversation.endSession();
      setIsConnected(false);
      setIsSpeaking(false);

      // Wait a moment for ElevenLabs to process
      // 添加 3 秒延迟，非常重要，否则链接还没有生成，下面的fetch会报错
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Upload the conversation if we have an ID
      if (conversationId && conversationCreatedAtRef.current) {
        await uploadConversation(
          userId,
          conversationId,
          conversationCreatedAtRef.current,
          subscriptionTier
        );
      }

      setConversation(null);
      
    } catch (error) {
      handleError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsEnding(false); // End loading state
      
    }
  }

  async function uploadConversation(
    userId: string | null,
    convoId: string,
    createdAt: string,
    subscriptionTier: string
  ) {
    try {
      console.log('Starting upload for conversation:', { userId, convoId, createdAt });
      
      const response = await fetch('/api/upload-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, conversationId: convoId, createdAt, subscriptionTier }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload conversation');
      }

      console.log('Upload successful:', data);
      return data.conversationUrl;
    } catch (error) {
      console.error('Upload error:', error);
      handleError(
        error instanceof Error
          ? error.message
          : 'An error occurred while uploading the conversation'
      );
    }
  }

  return (
    <div className="flex justify-center items-center gap-x-4">
      <Card className="rounded-3xl">
        <CardContent>
          <CardHeader>
            <CardTitle className="text-center">
              {isConnected
                ? isSpeaking
                  ? 'AI host is speaking'
                  : 'AI host is listening'
                : 'Disconnected'}
            </CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-y-4 text-center">
            <div
              className={cn(
                'orb my-8 mx-12',
                isSpeaking ? 'animate-orb' : conversation && 'animate-orb-slow',
                isConnected ? 'orb-active' : 'orb-inactive'
              )}
            />
            <Button
              variant="outline"
              className="rounded-full"
              size="lg"
              disabled={conversation !== null && isConnected}
              onClick={startConversation}
            >
              Start conversation
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              size="lg"
              disabled={conversation === null || !isConnected || isEnding}
              onClick={endConversation}
            >
              {isEnding ? 'Ending...' : 'End conversation'}
            </Button>
            {/* {!isConnected && !isEnding && conversationId && (
              <Button
                variant="outline"
                className="rounded-full"
                size="lg"
                onClick={() => router.push(`/podcast/${conversationId}`)}
              >
                View Podcast Page
              </Button>
            )} */}
            <Button
              variant="outline"
              className="rounded-full"
              size="lg"
              onClick={() => router.push('/')}
            >
              Back to Home Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}