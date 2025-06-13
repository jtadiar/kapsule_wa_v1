import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../store/playerStore';
import JSZip from 'jszip';

interface Sound {
  id: number;
  url: string;
  name: string;
}

interface Pad {
  id: number;
  label: string;
  sound: string | null;
}

const defaultPads = [
  { id: 1, label: 'drums', sound: null },
  { id: 2, label: 'preset 1', sound: null },
  { id: 3, label: 'preset 2', sound: null },
  { id: 4, label: 'preset 3', sound: null },
  { id: 5, label: 'edit', sound: null },
  { id: 6, label: 'empty', sound: null },
  { id: 7, label: 'empty', sound: null },
  { id: 8, label: 'empty', sound: null },
  { id: 9, label: 'empty', sound: null },
  { id: 10, label: 'volume', sound: null },
  { id: 11, label: 'empty', sound: null },
  { id: 12, label: 'empty', sound: null },
  { id: 13, label: 'empty', sound: null },
  { id: 14, label: 'empty', sound: null },
  { id: 15, label: 'volume', sound: null },
  { id: 16, label: 'empty', sound: null },
  { id: 17, label: 'empty', sound: null },
  { id: 18, label: 'empty', sound: null },
  { id: 19, label: 'empty', sound: null },
  { id: 20, label: 'save', sound: null },
  { id: 21, label: 'empty', sound: null },
  { id: 22, label: 'empty', sound: null },
  { id: 23, label: 'empty', sound: null },
  { id: 24, label: 'empty', sound: null },
  { id: 25, label: 'reset', sound: null },
];

const SoundLab: React.FC = () => {
  const navigate = useNavigate();
  const { pauseForNavigation, resumeFromNavigation } = usePlayerStore();
  const [activePreset, setActivePreset] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPad, setSelectedPad] = useState<Pad | null>(null);
  const [volume, setVolume] = useState(0.75);
  const [prompt, setPrompt] = useState('');
  const [soundName, setSoundName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSounds, setGeneratedSounds] = useState<Sound[]>([]);
  const [error, setError] = useState('');
  const [pads, setPads] = useState<Pad[]>(defaultPads);
  const [editingPreset, setEditingPreset] = useState<number | null>(null);
  const [presetEditValue, setPresetEditValue] = useState('');
  
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Pause main player audio when entering SoundLab
  useEffect(() => {
    pauseForNavigation();
    
    // Resume when leaving SoundLab
    return () => {
      resumeFromNavigation();
    };
  }, [pauseForNavigation, resumeFromNavigation]);

  useEffect(() => {
    pads.forEach(pad => {
      if (pad.sound && !audioRefs.current[pad.id]) {
        const audio = new Audio(pad.sound);
        audio.volume = volume;
        audioRefs.current[pad.id] = audio;
      }
    });

    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [pads]);

  useEffect(() => {
    if (selectedPad) {
      setSoundName(selectedPad.label === 'empty' ? '' : selectedPad.label);
    }
  }, [selectedPad]);

  const handlePadClick = (pad: Pad) => {
    if (pad.id <= 5) {
      if (pad.id === 5) {
        setIsEditMode(!isEditMode);
        setSelectedPad(null);
      } else {
        setActivePreset(pad.id);
      }
      return;
    }

    if (pad.label === 'reset') {
      handleReset();
      return;
    }

    if (pad.label === 'save') {
      handleSavePreset();
      return;
    }

    if (isEditMode && !pad.label.includes('volume')) {
      setSelectedPad(pad);
      return;
    }

    const audio = audioRefs.current[pad.id];
    if (audio && !isEditMode) {
      audio.currentTime = 0;
      audio.play().catch(console.error);
    }
  };

  const handlePresetDoubleClick = (pad: Pad) => {
    if (pad.id <= 4) { // Only allow editing of the first 4 preset tabs
      setEditingPreset(pad.id);
      setPresetEditValue(pad.label);
    }
  };

  const handlePresetEditSubmit = (padId: number) => {
    if (presetEditValue.trim()) {
      setPads(currentPads => 
        currentPads.map(pad => 
          pad.id === padId 
            ? { ...pad, label: presetEditValue.trim() }
            : pad
        )
      );
    }
    setEditingPreset(null);
    setPresetEditValue('');
  };

  const handlePresetEditKeyDown = (e: React.KeyboardEvent, padId: number) => {
    if (e.key === 'Enter') {
      handlePresetEditSubmit(padId);
    } else if (e.key === 'Escape') {
      setEditingPreset(null);
      setPresetEditValue('');
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    Object.values(audioRefs.current).forEach(audio => {
      audio.volume = newVolume;
    });
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = newVolume;
    }
  };

  const handleGenerateSound = async () => {
    if (!prompt.trim() || !selectedPad) return;

    try {
      setIsGenerating(true);
      setError('');
      setGeneratedSounds([]);

      const sounds: Sound[] = [];
      for (let i = 0; i < 4; i++) {
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-soundfx`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ prompt }),
          });

          if (!response.ok) {
            // Try to parse as JSON for error message, but handle if it's not JSON
            let errorMessage = 'Failed to generate sound';
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
          const url = URL.createObjectURL(blob);
          const sound = { 
            id: i + 1, 
            url,
            name: `${soundName || selectedPad.label} ${i + 1}`
          };
          sounds.push(sound);
          setGeneratedSounds(current => [...current, sound]);
        } catch (error) {
          console.error(`Error generating sound ${i + 1}:`, error);
        }
      }
    } catch (error) {
      console.error('Error generating sounds:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate sounds');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewSound = (url: string) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }

    previewAudioRef.current = new Audio(url);
    previewAudioRef.current.volume = volume;
    previewAudioRef.current.play().catch(console.error);
  };

  const handleAddSound = (sound: Sound) => {
    if (!selectedPad) return;

    setPads(currentPads => 
      currentPads.map(pad => 
        pad.id === selectedPad.id 
          ? { ...pad, sound: sound.url, label: soundName || sound.name }
          : pad
      )
    );

    if (audioRefs.current[selectedPad.id]) {
      audioRefs.current[selectedPad.id].src = sound.url;
    } else {
      const audio = new Audio(sound.url);
      audio.volume = volume;
      audioRefs.current[selectedPad.id] = audio;
    }

    setSelectedPad(null);
    setGeneratedSounds([]);
    setPrompt('');
    setSoundName('');
  };

  const handleSavePreset = async () => {
    const soundPads = pads.filter(pad => 
      pad.id >= 6 && pad.id <= 24 && 
      !['volume', 'save', 'reset'].includes(pad.label) &&
      pad.sound !== null
    );

    if (soundPads.length === 0) {
      setError('No sounds to save in this preset');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const zip = new JSZip();

      const fetchPromises = soundPads.map(async (pad) => {
        if (pad.sound) {
          try {
            const response = await fetch(pad.sound);
            const blob = await response.blob();
            zip.file(`${pad.label}.mp3`, blob);
          } catch (error) {
            console.error(`Error fetching sound for ${pad.label}:`, error);
          }
        }
      });

      await Promise.all(fetchPromises);

      const content = await zip.generateAsync({ type: 'blob' });
      
      const downloadUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `preset-${activePreset}-sounds.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error saving preset:', error);
      setError('Failed to save preset');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleReset = () => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioRefs.current = {};
    setPads(defaultPads);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
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
          src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Website%20Images/Lab%20Logos%20Red/Lab-Logos-(red)_0005_Vector.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvV2Vic2l0ZSBJbWFnZXMvTGFiIExvZ29zIFJlZC9MYWItTG9nb3MtKHJlZClfMDAwNV9WZWN0b3IucG5nIiwiaWF0IjoxNzQ5Mjg1NTk5LCJleHAiOjIwNjQ2NDU1OTl9.vQwSx6lYLGhXs7EKcNBiwMsKPhMh99Kc7IXa-ksvWFg" 
          alt="SoundLab" 
          className="h-16 mx-auto"
        />
      </div>

      <div className="flex-1 flex items-start justify-center p-4 pt-2">
        <div className="bg-[#DDDDDD] rounded-3xl p-6 flex">
          <div className="w-[700px] bg-[#DDDDDD] rounded-3xl p-6">
            <div className="grid grid-cols-5" style={{ gap: '12px' }}>
              {pads.map((pad) => {
                const isPresetTab = pad.id <= 5;
                const isSpecialButton = ['edit', 'save', 'reset'].includes(pad.label);
                const isVolumeSlider = pad.label === 'volume';
                const isSelected = isPresetTab && pad.id === activePreset;
                const isEditModeActive = pad.label === 'edit' && isEditMode;
                const isEditModeButton = pad.label === 'edit';
                const isSavePresetButton = pad.label === 'save';
                const isResetButton = pad.label === 'reset';

                if (isVolumeSlider && pad.id === 10) {
                  return (
                    <div
                      key={pad.id}
                      className="row-span-2 bg-[#C3C3C3] rounded-2xl flex items-center justify-center relative"
                    >
                      <div className="h-44 w-2 bg-gray-500 rounded-full relative">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="absolute w-44 h-2 -rotate-90 top-1/2 -translate-y-1/2 -translate-x-[88px] appearance-none bg-transparent [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gray-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                        />
                      </div>
                      <span className="absolute bottom-3 text-white text-base font-bold" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>volume</span>
                    </div>
                  );
                }

                if (isVolumeSlider) return null;

                return (
                  <button
                    key={pad.id}
                    onClick={() => handlePadClick(pad)}
                    onDoubleClick={() => handlePresetDoubleClick(pad)}
                    className={`aspect-square rounded-2xl p-3 flex items-center justify-center transition-all ${
                      isEditModeButton
                        ? isEditModeActive
                          ? 'bg-[#FF383A]'
                          : 'bg-[#A2A2A2]'
                        : isSavePresetButton
                        ? 'bg-[#66E066]'
                        : isResetButton
                        ? 'bg-[#FF383A]'
                        : isSelected || selectedPad?.id === pad.id
                        ? 'bg-[#FF383A]'
                        : isPresetTab
                        ? 'bg-[#A2A2A2]'
                        : pad.sound
                        ? 'bg-[#CECECE]'
                        : 'bg-[#CECECE]'
                    }`}
                    style={{ minHeight: '80px', minWidth: '80px' }}
                  >
                    {editingPreset === pad.id ? (
                      <input
                        type="text"
                        value={presetEditValue}
                        onChange={(e) => setPresetEditValue(e.target.value)}
                        onBlur={() => handlePresetEditSubmit(pad.id)}
                        onKeyDown={(e) => handlePresetEditKeyDown(e, pad.id)}
                        className="w-full bg-transparent text-white font-bold text-center outline-none text-base"
                        style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
                        autoFocus
                      />
                    ) : (
                      <span className="text-white font-bold text-base" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                        {pad.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {isEditMode && selectedPad && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 260, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ 
                  type: 'tween',
                  duration: 0.3,
                  ease: 'easeInOut'
                }}
                className="bg-[#DDDDDD] rounded-3xl overflow-hidden ml-6"
              >
                <div className="w-[260px] h-full p-6" style={{ marginTop: '60px' }}>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-white text-lg mb-2 font-bold" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                        describe your sound
                      </label>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="808 kick drum"
                        className="w-full h-28 bg-[#FFFCFC] rounded-xl p-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#FF383A] border border-gray-300"
                      />
                    </div>

                    <button
                      onClick={handleGenerateSound}
                      disabled={isGenerating || !prompt.trim()}
                      className="w-full bg-[#FF383A] hover:bg-[#E62D31] text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="animate-spin\" size={18} />
                          <span>Generating {generatedSounds.length + 1}/4...</span>
                        </>
                      ) : (
                        'generate'
                      )}
                    </button>

                    {error && (
                      <p className="text-red-500 text-sm text-center">{error}</p>
                    )}

                    {generatedSounds.length > 0 && (
                      <div className="space-y-4">
                        <div className="mb-3">
                          <label className="block text-white text-lg mb-2 font-bold" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                            sound name
                          </label>
                          <input
                            type="text"
                            value={soundName}
                            onChange={(e) => setSoundName(e.target.value)}
                            className="w-full bg-[#FFFCFC] rounded-xl p-3 text-gray-700 focus:outline-none border border-gray-300"
                          />
                        </div>

                        <div className="bg-white rounded-xl p-3 space-y-2">
                          {generatedSounds.map((sound) => (
                            <div
                              key={sound.id}
                              className="flex items-center justify-between"
                            >
                              <button
                                onClick={() => handlePreviewSound(sound.url)}
                                className="flex items-center gap-2 text-gray-700 font-bold" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF383A" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                                <span>generation {sound.id}</span>
                              </button>
                              <button
                                onClick={() => handleAddSound(sound)}
                                className="bg-[#FF383A] text-white px-3 py-1 rounded-full text-sm font-bold"
                              >
                                add
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SoundLab;