import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ChevronLeft, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../store/playerStore';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

interface Voice {
  voice_id: string;
  name: string;
  category: string;
}

const CustomSlider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange }) => {
  return (
    <div className="bg-[#CECECE] rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <label className="text-white font-bold text-lg" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>{label}</label>
        <span className="text-white text-sm bg-black bg-opacity-30 px-2 py-1 rounded">
          {value.toFixed(1)}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-black rounded-full appearance-none cursor-pointer slider"
        />
      </div>
    </div>
  );
};

const VocalLab: React.FC = () => {
  const navigate = useNavigate();
  const { pauseForNavigation, resumeFromNavigation } = usePlayerStore();
  const [prompt, setPrompt] = useState('');
  const [fileName, setFileName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  // Slider states
  const [speed, setSpeed] = useState(1.0);
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.5);
  const [style, setStyle] = useState(0.5);
  const [volume, setVolume] = useState(0.75);

  // Pause main player audio when entering VocalLab
  useEffect(() => {
    pauseForNavigation();
    
    // Resume when leaving VocalLab
    return () => {
      resumeFromNavigation();
    };
  }, [pauseForNavigation, resumeFromNavigation]);

  // Fetch available voices on component mount
  useEffect(() => {
    fetchVoices();
  }, []);

  // Audio event listeners
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const handleEnded = () => setIsPlaying(false);
      const handlePause = () => setIsPlaying(false);
      const handlePlay = () => setIsPlaying(true);
      
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('play', handlePlay);
      
      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('play', handlePlay);
      };
    }
  }, [generatedAudio]);

  const fetchVoices = async () => {
    try {
      setIsLoadingVoices(true);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-voices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      setVoices(data.voices || []);
      
      // Set default voice if available
      if (data.voices && data.voices.length > 0) {
        setSelectedVoice(data.voices[0].voice_id);
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
      setError('Failed to load voices');
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (!selectedVoice) {
      setError('Please select a voice');
      return;
    }

    try {
      setIsGenerating(true);
      setError('');
      setGeneratedAudio(null);
      setIsPlaying(false);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-vocals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          voice_id: selectedVoice,
          voice_settings: {
            stability,
            similarity_boost: similarity,
            style
          },
          speed
        }),
      });

      if (!response.ok) {
        // Try to parse as JSON for error message, but handle if it's not JSON
        let errorMessage = 'Failed to generate vocals';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // The response is an audio blob, not JSON
      const blob = await response.blob();
      audioBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setGeneratedAudio(url);

      // Set up audio element
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.volume = volume;
        audioRef.current.load(); // Ensure the audio is loaded
      }
    } catch (error) {
      console.error('Error generating vocals:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate vocals');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !generatedAudio) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        setError('Failed to play audio');
      });
    }
  };

  const handleReset = () => {
    setSpeed(1.0);
    setStability(0.5);
    setSimilarity(0.5);
    setStyle(0.5);
    setVolume(0.75);
    setPrompt('');
    setFileName('');
    setGeneratedAudio(null);
    setIsPlaying(false);
    setError('');
    audioBlobRef.current = null;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  const handleSave = () => {
    if (!audioBlobRef.current) {
      setError('Please generate audio first');
      return;
    }

    if (!fileName.trim()) {
      setError('Please enter a filename');
      return;
    }

    const url = URL.createObjectURL(audioBlobRef.current);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Update audio volume when volume slider changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col overflow-hidden">
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

      {/* Logo positioned at the top center of the page */}
      <div className="text-center pt-12 pb-4">
        <img 
          src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/Lab%20Logos%20Red/Lab-Logos-(red)_0004_Vector.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvTGFiIExvZ29zIFJlZC9MYWItTG9nb3MtKHJlZClfMDAwNF9WZWN0b3IucG5nIiwiaWF0IjoxNzQ5Mjg3MzEwLCJleHAiOjIwNjQ2NDczMTB9.gIr8f39G50gv-MfEQnqRPmKoE5tFIVZnfyJFZ2WCFd8" 
          alt="VocalLab" 
          className="h-16 mx-auto"
        />
      </div>

      {/* Moved interface up by 30px and increased height for bottom padding */}
      <div className="flex-1 flex items-start justify-center p-4" style={{ marginTop: '-30px' }}>
        <div className="w-full max-w-[900px]">
          {/* Increased height to 750px for more bottom padding */}
          <div className="bg-[#DDDDDD] rounded-3xl p-6 shadow-lg" style={{ height: '750px', transform: 'scale(0.85)' }}>
            <div className="flex gap-6 h-full">
              
              {/* Left Column - Sliders */}
              <div className="w-[400px]">
                <CustomSlider
                  label="speed"
                  value={speed}
                  min={0.1}
                  max={4.0}
                  step={0.1}
                  onChange={setSpeed}
                />
                
                <CustomSlider
                  label="stability"
                  value={stability}
                  min={0.0}
                  max={1.0}
                  step={0.1}
                  onChange={setStability}
                />
                
                <CustomSlider
                  label="similarity"
                  value={similarity}
                  min={0.0}
                  max={1.0}
                  step={0.1}
                  onChange={setSimilarity}
                />
                
                <CustomSlider
                  label="style"
                  value={style}
                  min={0.0}
                  max={1.0}
                  step={0.1}
                  onChange={setStyle}
                />

                <CustomSlider
                  label="volume"
                  value={volume}
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  onChange={setVolume}
                />
              </div>

              {/* Right Column - Controls */}
              <div className="w-[380px] flex flex-col justify-between">
                <div className="space-y-5">
                  <div>
                    <label className="block text-white text-lg mb-3 font-bold" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                      Voice Selection
                    </label>
                    {isLoadingVoices ? (
                      <div className="w-full bg-[#FFFCFC] rounded-xl p-4 flex items-center justify-center">
                        <Loader2 className="animate-spin text-gray-600" size={20} />
                        <span className="text-gray-600 ml-2">Loading voices...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="w-full bg-[#FFFCFC] rounded-xl p-4 text-black focus:outline-none focus:ring-2 focus:ring-[#FF383A]"
                      >
                        <option value="">Select a voice</option>
                        {voices.map((voice) => (
                          <option key={voice.voice_id} value={voice.voice_id}>
                            {voice.name} ({voice.category})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-white text-lg mb-3 font-bold" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                      Input your text or lyrics
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Input your text or lyrics"
                      className="w-full h-28 bg-[#FFFCFC] rounded-xl p-4 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF383A] border border-gray-300"
                    />
                  </div>

                  {/* Increased width of generate button */}
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim() || !selectedVoice}
                    className="w-full bg-[#FF383A] hover:bg-[#E62D31] text-white py-4 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
                    style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>generate</span>
                      </>
                    ) : (
                      'generate'
                    )}
                  </button>

                  <div>
                    <label className="block text-white text-lg mb-3 font-bold" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                      file name
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="my_vocals"
                      className="w-full bg-[#FFFCFC] rounded-xl p-4 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF383A]"
                    />
                  </div>

                  {/* Pre-allocated space for generated vocal - always present but conditionally visible */}
                  <div 
                    className="transition-opacity duration-300"
                    style={{ 
                      opacity: generatedAudio ? 1 : 0,
                      height: '60px', // Fixed height to prevent layout shift
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {generatedAudio && (
                      <div className="bg-white rounded-xl p-3 flex items-center gap-3 w-full">
                        <button
                          onClick={handlePlayPause}
                          className="text-[#FF383A] hover:text-[#E62D31] transition-colors"
                        >
                          {isPlaying ? (
                            <Pause size={20} />
                          ) : (
                            <Play size={20} />
                          )}
                        </button>
                        <span className="text-gray-700 font-bold text-sm" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                          generated vocal
                        </span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <p className="text-[#FF383A] text-sm text-center">{error}</p>
                  )}
                </div>

                {/* Bottom section with bigger square buttons with rounded corners - moved up 15px */}
                <div className="flex gap-4 justify-center" style={{ marginTop: '-15px' }}>
                  <button
                    onClick={handleReset}
                    className="bg-[#FF383A] hover:bg-[#E62D31] text-white font-bold transition-colors"
                    style={{ 
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      width: '120px',
                      height: '120px',
                      borderRadius: '12px'
                    }}
                  >
                    reset
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!generatedAudio || !fileName.trim()}
                    className="bg-[#66E066] hover:bg-[#5ACC5A] disabled:opacity-50 disabled:hover:bg-[#66E066] text-white font-bold transition-colors"
                    style={{ 
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      width: '120px',
                      height: '120px',
                      borderRadius: '12px'
                    }}
                  >
                    save
                  </button>
                </div>

                {/* Audio element for playback */}
                <audio
                  ref={audioRef}
                  preload="auto"
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default VocalLab;