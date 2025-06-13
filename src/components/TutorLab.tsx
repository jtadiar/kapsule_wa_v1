import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Play, Pause, Loader2, ChevronLeft, X, MicIcon, Square, Download, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../store/playerStore';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  audioUrl?: string;
  timestamp: Date;
  isExpanded?: boolean;
  spotifyUrls?: string[];
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

interface VoiceConversationState {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  currentAudio: HTMLAudioElement | null;
}

interface ConversationPanelProps {
  conversation: Conversation;
  onClose: () => void;
  onSendMessage: (message: string, conversationId: string) => void;
  isLoading: boolean;
}

// Enhanced helper function to ensure content is always a string and remove asterisks
const ensureString = (content: any): string => {
  let result = '';

  if (typeof content === 'string') {
    result = content.trim();
  } else if (content == null) {
    result = "Sorry, I couldn't generate a proper response. Please try asking again.";
  } else if (typeof content === 'object') {
    // Handle { text: { content: "..." } }
    if (content.text && typeof content.text === 'object' && typeof content.text.content === 'string') {
      result = content.text.content.trim();
    } else if (content.text && typeof content.text === 'string') {
      result = content.text.trim();
    } else if (content.content && typeof content.content === 'string') {
      result = content.content.trim();
    } else if (content.message && typeof content.message === 'string') {
      result = content.message.trim();
    } else if (Array.isArray(content)) {
      const items = content.map(ensureString).filter(Boolean);
      result = items.join(' ').trim() || "Sorry, I couldn't generate a proper response. Please try asking again.";
    } else if (content.choices && Array.isArray(content.choices) && content.choices.length > 0) {
      result = ensureString(content.choices[0]);
    } else {
      console.error('Unable to extract string from object:', content);
      result = "Sorry, I couldn't generate a proper response. Please try asking again.";
    }
  } else {
    try {
      const str = String(content).trim();
      if (['[object Object]', 'undefined', 'null'].includes(str)) {
        result = "Sorry, I couldn't generate a proper response. Please try asking again.";
      } else {
        result = str;
      }
    } catch {
      result = "Sorry, I couldn't generate a proper response. Please try asking again.";
    }
  }

  // Remove markdown asterisks for bold formatting
  result = result.replace(/\*\*(.*?)\*\*/g, '$1');
  
  return result;
};

const ConversationPanel: React.FC<ConversationPanelProps> = ({ 
  conversation, 
  onClose, 
  onSendMessage,
  isLoading 
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  useEffect(() => {
    // Initialize speech recognition only if available
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const results = Array.from(event.results);
        const finalResults = results.filter(result => result.isFinal);
        
        if (finalResults.length > 0) {
          const transcript = finalResults[finalResults.length - 1][0].transcript.trim();
          if (transcript) {
            setNewMessage(transcript);
            setIsListening(false);
          }
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        // Only show error messages for critical errors, not for 'no-speech'
        if (event.error !== 'no-speech') {
          const errorMessage = getErrorMessage(event.error);
          // Note: setError is not available in this scope, would need to be passed as prop
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const getErrorMessage = (errorType: string): string => {
    switch (errorType) {
      case 'not-allowed':
        return 'Microphone access denied. Please allow microphone permissions and try again.';
      case 'no-speech':
        return 'No speech detected. Please try speaking again.';
      case 'audio-capture':
        return 'Microphone not available. Please check your microphone connection.';
      case 'network':
        return 'Network error occurred. Please check your internet connection.';
      case 'not-supported':
        return 'Speech recognition is not supported in this browser.';
      case 'service-not-allowed':
        return 'Speech recognition service is not allowed. Please check your browser settings.';
      default:
        return `Speech recognition error: ${errorType}. Please try again.`;
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;
    
    onSendMessage(newMessage, conversation.id);
    setNewMessage('');
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  const handlePlayAudio = (messageId: string, audioUrl: string) => {
    // Stop any currently playing audio
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    if (playingMessageId === messageId) {
      setPlayingMessageId(null);
      return;
    }

    if (!audioRefs.current[messageId]) {
      audioRefs.current[messageId] = new Audio(audioUrl);
      audioRefs.current[messageId].onended = () => setPlayingMessageId(null);
    }

    audioRefs.current[messageId].play();
    setPlayingMessageId(messageId);
  };

  const exportTranscript = () => {
    const transcript = conversation.messages
      .map(msg => `[${msg.timestamp.toLocaleTimeString()}] ${msg.type.toUpperCase()}: ${ensureString(msg.content)}`)
      .join('\n\n');
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversation.title.slice(0, 30)}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMessageContent = (content: any, type: 'user' | 'ai') => {
    const textContent = ensureString(content);
    
    // Always render as plain text, no markdown processing
    return (
      <p className="text-sm mb-2 text-gray-200 leading-relaxed whitespace-pre-wrap">
        {textContent}
      </p>
    );
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <div>
          <h2 className="text-xl font-semibold text-white">{conversation.title}</h2>
          <p className="text-gray-400 text-sm">{conversation.messages.length} messages</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportTranscript}
            className="text-gray-400 hover:text-white transition-colors"
            title="Export transcript"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                message.type === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-gray-800 text-white'
              }`}
            >
              {renderMessageContent(message.content, message.type)}
              
              {/* Spotify Links */}
              {message.type === 'ai' && message.spotifyUrls && message.spotifyUrls.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Recommended tracks:</p>
                  <div className="space-y-1">
                    {message.spotifyUrls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-green-400 hover:text-green-300 underline"
                      >
                        Listen on Spotify
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {message.type === 'ai' && message.audioUrl && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-700">
                  <button
                    onClick={() => handlePlayAudio(message.id, message.audioUrl!)}
                    className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white hover:bg-primary-hover transition-colors"
                  >
                    {playingMessageId === message.id ? (
                      <Pause size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                  </button>
                </div>
              )}
              
              <div className="text-xs text-gray-400 mt-2">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl p-4 flex items-center gap-3">
              <Loader2 className="animate-spin text-primary" size={20} />
              <span className="text-gray-300">Abel is thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-800">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="w-full bg-gray-800 rounded-2xl p-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
          
          <button
            type="button"
            onClick={handleVoiceInput}
            disabled={isLoading}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors ${
              isListening 
                ? 'bg-red-500 animate-pulse' 
                : 'bg-primary hover:bg-primary-hover'
            } disabled:opacity-50`}
          >
            <MicIcon size={20} />
          </button>
        </form>
      </div>
    </motion.div>
  );
};

const TutorLab: React.FC = () => {
  const navigate = useNavigate();
  const { pauseForNavigation, resumeFromNavigation } = usePlayerStore();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceConversationState>({
    isActive: false,
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    currentAudio: null
  });
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState<Message[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceStateRef = useRef<VoiceConversationState>(voiceState);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const responseStartTime = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);

  // Keep voiceStateRef in sync with voiceState
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  // Pause main player audio when entering TutorLab
  useEffect(() => {
    pauseForNavigation();
    
    // Resume when leaving TutorLab
    return () => {
      resumeFromNavigation();
    };
  }, [pauseForNavigation, resumeFromNavigation]);

  const getErrorMessage = (errorType: string): string => {
    switch (errorType) {
      case 'not-allowed':
        return 'Microphone access denied. Please allow microphone permissions and try again.';
      case 'no-speech':
        return 'No speech detected. Please try speaking again.';
      case 'audio-capture':
        return 'Microphone not available. Please check your microphone connection.';
      case 'network':
        return 'Network error occurred. Please check your internet connection.';
      case 'not-supported':
        return 'Speech recognition is not supported in this browser.';
      case 'service-not-allowed':
        return 'Speech recognition service is not allowed. Please check your browser settings.';
      default:
        return `Speech recognition error: ${errorType}. Please try again.`;
    }
  };

  // Initialize audio analysis for voice activity detection
  const initializeAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;
      microphoneRef.current.connect(analyserRef.current);
      
      // Start audio level monitoring
      startAudioLevelMonitoring();
      
      return true;
    } catch (error) {
      console.error('Error initializing audio analysis:', error);
      setError('Could not access microphone. Please check permissions.');
      return false;
    }
  };

  // Monitor audio levels for visual feedback
  const startAudioLevelMonitoring = () => {
    if (!analyserRef.current) return;

    const updateAudioLevel = () => {
      if (!analyserRef.current || !voiceStateRef.current.isActive) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate RMS (Root Mean Square) for better audio level detection
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const normalizedLevel = Math.min(rms / 128, 1); // Normalize to 0-1
      
      setAudioLevel(normalizedLevel);
      
      // Detect speech activity
      if (normalizedLevel > 0.1 && !voiceStateRef.current.isSpeaking && !voiceStateRef.current.isProcessing) {
        lastSpeechTimeRef.current = Date.now();
        
        // Clear any existing timeout
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
        
        // Set timeout to process speech after silence
        speechTimeoutRef.current = setTimeout(() => {
          if (Date.now() - lastSpeechTimeRef.current > 1500) { // 1.5 seconds of silence
            // Process any accumulated speech
            if (recognitionRef.current && voiceStateRef.current.isListening) {
              // The speech recognition will handle the final result
            }
          }
        }, 1500);
      }
      
      if (voiceStateRef.current.isActive) {
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      }
    };
    
    updateAudioLevel();
  };

  useEffect(() => {
    // Load conversations from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tutorlab-conversations');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const conversationsWithDates = parsed.map((conv: any) => ({
            ...conv,
            lastUpdated: new Date(conv.lastUpdated),
            messages: conv.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
              content: ensureString(msg.content)
            }))
          }));
          setConversations(conversationsWithDates);
        } catch (error) {
          console.error('Error loading conversations:', error);
        }
      }
    }

    // Initialize speech recognition only if available
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Changed to false for better control
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setVoiceState(prev => ({ ...prev, isListening: true }));
      };

      recognitionRef.current.onresult = (event) => {
        const results = Array.from(event.results);
        let finalText = '';

        for (let i = event.resultIndex; i < results.length; i++) {
          const transcript = results[i][0].transcript;
          if (results[i].isFinal) {
            finalText += transcript;
          }
        }

        if (finalText.trim() && voiceStateRef.current.isActive) {
          console.log('Final transcript:', finalText.trim());
          handleVoiceInput(finalText.trim());
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          const errorMessage = getErrorMessage(event.error);
          setError(errorMessage);
        }
        setVoiceState(prev => ({ ...prev, isListening: false }));
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setVoiceState(prev => ({ ...prev, isListening: false }));
        
        // Restart listening if still in active conversation and not processing
        if (voiceStateRef.current.isActive && !voiceStateRef.current.isSpeaking && !voiceStateRef.current.isProcessing) {
          scheduleListeningRestart();
        }
      };
    }

    return () => {
      stopVoiceConversation();
    };
  }, []);

  const scheduleListeningRestart = useCallback(() => {
    // Clear any existing timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }

    // Schedule restart after a short delay
    restartTimeoutRef.current = setTimeout(() => {
      const currentState = voiceStateRef.current;
      if (currentState.isActive && !currentState.isSpeaking && !currentState.isProcessing && !currentState.isListening) {
        startListening();
      }
    }, 1000);
  }, []);

  const startListening = () => {
    if (!recognitionRef.current || voiceStateRef.current.isListening || voiceStateRef.current.isSpeaking || voiceStateRef.current.isProcessing) {
      return;
    }

    try {
      console.log('Starting speech recognition...');
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Failed to start speech recognition. Please try again.');
      setVoiceState(prev => ({ ...prev, isListening: false }));
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  };

  const saveConversations = (updatedConversations: Conversation[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tutorlab-conversations', JSON.stringify(updatedConversations));
    }
    setConversations(updatedConversations);
  };

  const generateResponse = async (userMessage: string, conversationHistory?: Message[]): Promise<{ content: string; audioUrl: string; spotifyUrls?: string[] }> => {
    responseStartTime.current = Date.now();
    console.log('🚀 Starting response generation at:', responseStartTime.current);
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ 
        prompt: userMessage,
        conversationHistory: conversationHistory || []
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate response');
    }

    const data = await response.json();
    const textReceiveTime = Date.now();
    console.log('📝 Text received at:', textReceiveTime, 'Latency:', textReceiveTime - responseStartTime.current, 'ms');
    
    // Enhanced response extraction with better error handling
    let textContent = ensureString(data.content || data.text || data);
    
    // Validate that we got actual text content
    if (!textContent || 
        textContent === 'Unable to display content' || 
        textContent.includes('[object Object]') ||
        textContent === "Sorry, I couldn't generate a proper response. Please try asking again.") {
      console.error('Invalid text content detected:', textContent);
      console.error('Original data:', data);
      throw new Error('Invalid response format from API');
    }
    
    // Convert base64 audio to data URI with improved error handling
    let audioUrl = '';
    if (data && data.audio && typeof data.audio === 'string' && data.audio.length > 0) {
      try {
        console.log('🎵 Converting audio from base64, length:', data.audio.length);
        
        // Create a proper data URI for the base64 audio
        audioUrl = `data:audio/mpeg;base64,${data.audio}`;
        
        const audioReadyTime = Date.now();
        console.log('🎵 Audio ready at:', audioReadyTime, 'Total latency:', audioReadyTime - responseStartTime.current, 'ms');
      } catch (error) {
        console.error('Error processing audio:', error);
      }
    } else {
      console.log('No audio data received or audio data is empty');
    }

    // Extract Spotify URLs
    let spotifyUrls: string[] = [];
    if (data.spotifyUrls && Array.isArray(data.spotifyUrls)) {
      spotifyUrls = data.spotifyUrls;
    } else if (data.spotify) {
      if (Array.isArray(data.spotify)) {
        spotifyUrls = data.spotify;
      } else if (typeof data.spotify === 'string') {
        spotifyUrls = [data.spotify];
      }
    }
    
    return { content: ensureString(textContent), audioUrl, spotifyUrls };
  };

  const handleVoiceInput = async (transcript: string) => {
    if (!transcript.trim() || !voiceStateRef.current.isActive) return;

    console.log('🎤 Processing voice input:', transcript);

    // Stop listening and start processing
    setVoiceState(prev => ({ 
      ...prev, 
      isListening: false, 
      isProcessing: true 
    }));

    // Clear any restart timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: ensureString(transcript),
      timestamp: new Date()
    };

    setCurrentTranscript(prev => [...prev, userMessage]);

    try {
      // Pass conversation history to the API
      const { content, audioUrl, spotifyUrls } = await generateResponse(transcript, currentTranscript);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: ensureString(content),
        audioUrl,
        spotifyUrls,
        timestamp: new Date()
      };

      setCurrentTranscript(prev => [...prev, aiMessage]);

      // Play AI response and wait for it to finish
      if (audioUrl) {
        await playAIResponse(audioUrl);
      } else {
        console.log('No audio data received, restarting listening');
        scheduleListeningRestart();
      }

      // After AI finishes speaking, automatically restart listening
      if (voiceStateRef.current.isActive) {
        scheduleListeningRestart();
      }

    } catch (error) {
      console.error('Error generating response:', error);
      setError('Failed to generate response');
      
      // Reset state on error and restart listening
      setVoiceState(prev => ({ 
        ...prev, 
        isProcessing: false 
      }));
      
      if (voiceStateRef.current.isActive) {
        scheduleListeningRestart();
      }
    }
  };

  const playAIResponse = (audioUrl: string): Promise<void> => {
    return new Promise((resolve) => {
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      setVoiceState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        isSpeaking: true, 
        currentAudio: audio 
      }));

      audio.onended = () => {
        const playbackEndTime = Date.now();
        console.log('🔊 Audio playback ended at:', playbackEndTime, 'Total response time:', playbackEndTime - responseStartTime.current, 'ms');
        
        setVoiceState(prev => ({ 
          ...prev, 
          isSpeaking: false, 
          currentAudio: null 
        }));
        currentAudioRef.current = null;
        resolve();
      };

      audio.onerror = () => {
        console.error('Audio playback error');
        setVoiceState(prev => ({ 
          ...prev, 
          isSpeaking: false, 
          currentAudio: null 
        }));
        currentAudioRef.current = null;
        resolve();
      };

      // Preload and start playing immediately
      audio.preload = 'auto';
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        setVoiceState(prev => ({ 
          ...prev, 
          isSpeaking: false, 
          currentAudio: null 
        }));
        currentAudioRef.current = null;
        resolve();
      });
    });
  };

  const startVoiceConversation = async () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    // Initialize audio analysis for voice activity detection
    const audioInitialized = await initializeAudioAnalysis();
    if (!audioInitialized) {
      return; // Error already set in initializeAudioAnalysis
    }

    setShowVoiceModal(true);
    setCurrentTranscript([]);
    setError('');
    setAudioLevel(0);
    
    setVoiceState({
      isActive: true,
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      currentAudio: null
    });
  };

  const stopVoiceConversation = () => {
    // Clear all timeouts
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Stop speech recognition
    stopListening();

    // Stop audio playback
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Clean up audio analysis
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    microphoneRef.current = null;

    // Reset voice state
    setVoiceState({
      isActive: false,
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      currentAudio: null
    });

    setAudioLevel(0);

    // Save conversation if there are messages
    if (currentTranscript.length > 0) {
      const conversation: Conversation = {
        id: Date.now().toString(),
        title: ensureString(currentTranscript[0]?.content).slice(0, 50) + '...' || 'Voice Conversation',
        messages: currentTranscript,
        lastUpdated: new Date()
      };

      const updatedConversations = [conversation, ...conversations];
      saveConversations(updatedConversations);
    }

    setShowVoiceModal(false);
    setCurrentTranscript([]);
  };

  const handleSubmit = async (submittedPrompt: string, conversationId?: string) => {
    if (!submittedPrompt.trim()) return;

    try {
      setIsLoading(true);
      setError('');

      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: ensureString(submittedPrompt),
        timestamp: new Date()
      };

      let targetConversation: Conversation;

      if (conversationId) {
        // Adding to existing conversation
        targetConversation = conversations.find(c => c.id === conversationId)!;
        targetConversation.messages.push(userMessage);
      } else {
        // Creating new conversation
        targetConversation = {
          id: Date.now().toString(),
          title: submittedPrompt.slice(0, 50) + (submittedPrompt.length > 50 ? '...' : ''),
          messages: [userMessage],
          lastUpdated: new Date()
        };
        setActiveConversation(targetConversation);
      }

      // Update conversations immediately with user message
      const updatedConversations = conversationId 
        ? conversations.map(c => c.id === conversationId ? targetConversation : c)
        : [targetConversation, ...conversations];
      
      saveConversations(updatedConversations);

      // Generate AI response with conversation history
      const { content, audioUrl, spotifyUrls } = await generateResponse(submittedPrompt, targetConversation.messages);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: ensureString(content),
        audioUrl,
        spotifyUrls,
        timestamp: new Date()
      };

      targetConversation.messages.push(aiMessage);
      targetConversation.lastUpdated = new Date();

      const finalConversations = conversationId 
        ? conversations.map(c => c.id === conversationId ? targetConversation : c)
        : [targetConversation, ...conversations.slice(1)];

      saveConversations(finalConversations);

      if (activeConversation) {
        setActiveConversation(targetConversation);
      }

    } catch (error) {
      console.error('Error generating response:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(prompt);
    setPrompt('');
  };

  const handleVoiceInputButton = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.onresult = (event) => {
          const results = Array.from(event.results);
          const finalResults = results.filter(result => result.isFinal);
          
          if (finalResults.length > 0) {
            const transcript = finalResults[finalResults.length - 1][0].transcript;
            setPrompt(transcript);
            setIsListening(false);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          // Only show error messages for critical errors, not for 'no-speech'
          if (event.error !== 'no-speech') {
            const errorMessage = getErrorMessage(event.error);
            setError(errorMessage);
          }
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current.start();
        setIsListening(true);
        setError('');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setError('Failed to start speech recognition. Please try again.');
        setIsListening(false);
      }
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    setActiveConversation(conversation);
  };

  const handleDeleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    saveConversations(updatedConversations);
    
    // Close active conversation if it was deleted
    if (activeConversation?.id === conversationId) {
      setActiveConversation(null);
    }
  };

  const exportCurrentTranscript = () => {
    if (currentTranscript.length === 0) return;

    const transcript = currentTranscript
      .map(msg => `[${msg.timestamp.toLocaleTimeString()}] ${msg.type.toUpperCase()}: ${ensureString(msg.content)}`)
      .join('\n\n');
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-conversation-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMessageContent = (content: any, type: 'user' | 'ai') => {
    const textContent = ensureString(content);
    
    // Always render as plain text, no markdown processing
    return (
      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
        {textContent}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      {/* Back button positioned at the top left corner */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={() => navigate('/creator-tools')}
          className="text-primary hover:text-primary-hover transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={24} />
          <span>Back</span>
        </button>
      </div>

      {/* Logo positioned at the top center of the page, moved down slightly */}
      <div className="text-center pt-16 pb-8">
        <img 
          src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/Lab%20Logos%20Red/Lab-Logos-(red)_0002_Vector.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvTGFiIExvZ29zIFJlZC9MYWItTG9nb3MtKHJlZClfMDAwMl9WZWN0b3IucG5nIiwiaWF0IjoxNzQ5Mjg0MTAzLCJleHAiOjIwNjQ2NDQxMDN9.MDiT1wUafjma8lSB-LWGPXssoTgTZb3WrIDMCyQJC-c" 
          alt="TutorLab" 
          className="h-20 mx-auto"
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[800px] bg-[#DDDDDD] rounded-3xl p-8 shadow-lg">
          <div className="space-y-6">
            {/* Voice Conversation Button */}
            <div className="text-center">
              <button
                onClick={startVoiceConversation}
                className="bg-[#FF383A] hover:bg-[#E62D31] text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-all transform hover:scale-105 mb-4"
              >
                <Mic size={24} />
              </button>
              <p className="text-[#4E4E4E] text-sm">
                Have a natural conversation with your AI music tutor
              </p>
            </div>

            {/* Main Input Row */}
            <form onSubmit={handleTextSubmit} className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask me about music production or request track recommendations"
                  className="w-full bg-[#FFFCFC] rounded-2xl p-4 pr-12 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF383A] border border-gray-300"
                />
                <button
                  type="submit"
                  disabled={!prompt.trim() || isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>

            {/* Recent Conversations */}
            {conversations.length > 0 && (
              <div>
                <h3 className="text-[#4E4E4E] text-sm font-medium mb-3">Recent conversations</h3>
                <div className="space-y-2">
                  {conversations.slice(0, 5).map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => handleConversationClick(conversation)}
                      className="w-full text-left bg-white hover:bg-gray-50 rounded-xl p-3 transition-colors group border border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-700 text-sm font-medium truncate">
                            {conversation.title}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            {conversation.messages.length} messages • {conversation.lastUpdated.toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteConversation(conversation.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                          title="Delete conversation"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Example Questions */}
            <div>
              <h3 className="text-[#4E4E4E] text-sm font-medium mb-3">Example questions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "How do I mix vocals to sit well in a dense arrangement?",
                  "What's the best way to create punchy drums?",
                  "How can I make my bassline more interesting?",
                  "What are some creative ways to use reverb?"
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(example)}
                    className="text-left bg-white hover:bg-gray-50 rounded-xl p-3 text-gray-700 text-sm transition-colors border border-gray-200"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-300 rounded-xl p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Voice Conversation Modal */}
      <AnimatePresence>
        {showVoiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#F7F7F7] z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#DDDDDD] rounded-3xl w-[600px] h-[600px] relative flex flex-col items-center justify-center"
            >
              {/* Stop Button */}
              <button
                onClick={stopVoiceConversation}
                className="absolute top-6 right-6 w-10 h-10 bg-[#FF383A] rounded-full flex items-center justify-center text-white hover:bg-[#E62D31] transition-colors"
              >
                <Square size={16} />
              </button>

              {/* Listening Orb - Centered and Bigger */}
              <div className="mb-20">
                <div 
                  className={`w-64 h-64 rounded-full border-4 border-white flex items-center justify-center transition-all duration-300 ${
                    voiceState.isSpeaking 
                      ? 'bg-[#FF383A] animate-pulse' 
                      : voiceState.isProcessing
                      ? 'bg-[#FF383A] animate-pulse'
                      : voiceState.isListening
                      ? 'bg-[#FF383A]'
                      : 'bg-gray-400'
                  }`}
                  style={{
                    transform: voiceState.isListening ? `scale(${1 + audioLevel * 0.1})` : 'scale(1)',
                  }}
                >
                  <span className="text-white font-bold text-3xl" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                    {voiceState.isSpeaking 
                      ? 'speaking' 
                      : voiceState.isProcessing
                      ? 'processing'
                      : voiceState.isListening
                      ? 'listening'
                      : 'ready'
                    }
                  </span>
                </div>
              </div>

              {/* Mic Button - Bottom Center */}
              {!voiceState.isListening && !voiceState.isProcessing && !voiceState.isSpeaking && (
                <div className="absolute bottom-16">
                  <button
                    onClick={startListening}
                    className="w-16 h-16 bg-[#FF383A] rounded-full flex items-center justify-center text-white hover:bg-[#E62D31] transition-colors"
                  >
                    <Mic size={24} />
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation Panel */}
      <AnimatePresence>
        {activeConversation && (
          <ConversationPanel
            conversation={activeConversation}
            onClose={() => setActiveConversation(null)}
            onSendMessage={handleSubmit}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TutorLab;