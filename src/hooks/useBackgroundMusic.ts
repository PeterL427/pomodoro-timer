import { useState, useCallback, useRef, useEffect } from 'react';

export type MusicMode = 'work' | 'break' | 'longBreak';

export interface MusicSettings {
  enabled: boolean;
  volume: number; // 0-1
}

const STORAGE_KEY = 'pomodoro_music_settings';

const DEFAULT_SETTINGS: MusicSettings = {
  enabled: false,
  volume: 0.2,
};

function loadSettings(): MusicSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: MusicSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const MUSIC_FILES: Record<MusicMode, string> = {
  work: '/music/work.mp3',
  break: '/music/break.mp3',
  longBreak: '/music/longbreak.mp3',
};

export function useBackgroundMusic() {
  const [settings, setSettingsState] = useState<MusicSettings>(loadSettings);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentModeRef = useRef<MusicMode>('work');

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = settings.volume;

    const onCanPlay = () => setIsReady(true);
    const onError = () => setIsReady(false);

    audio.addEventListener('canplaythrough', onCanPlay);
    audio.addEventListener('error', onError);

    audioRef.current = audio;

    return () => {
      audio.removeEventListener('canplaythrough', onCanPlay);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update volume when settings change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.volume;
    }
  }, [settings.volume]);

  const loadMode = useCallback((mode: MusicMode) => {
    const audio = audioRef.current;
    if (!audio) return;

    const src = MUSIC_FILES[mode];
    if (audio.src !== src && !audio.src.endsWith(src)) {
      audio.src = src;
      audio.load();
      setIsReady(false);
    }
    currentModeRef.current = mode;
  }, []);

  const start = useCallback((mode: MusicMode) => {
    if (!settings.enabled) return;
    const audio = audioRef.current;
    if (!audio) return;

    loadMode(mode);

    const playAudio = () => {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay blocked or other error
        setIsPlaying(false);
      });
    };

    if (audio.readyState >= 3) {
      playAudio();
    } else {
      const onReady = () => {
        playAudio();
        audio.removeEventListener('canplaythrough', onReady);
      };
      audio.addEventListener('canplaythrough', onReady);
    }
  }, [settings.enabled, loadMode]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const setMode = useCallback((mode: MusicMode) => {
    const audio = audioRef.current;
    if (!audio) return;

    const wasPlaying = !audio.paused;
    loadMode(mode);

    if (wasPlaying && settings.enabled) {
      const playAudio = () => {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      };

      if (audio.readyState >= 3) {
        playAudio();
      } else {
        const onReady = () => {
          playAudio();
          audio.removeEventListener('canplaythrough', onReady);
        };
        audio.addEventListener('canplaythrough', onReady);
      }
    }
  }, [loadMode, settings.enabled]);

  const setEnabled = useCallback((enabled: boolean) => {
    setSettingsState((prev) => {
      const next = { ...prev, enabled };
      saveSettings(next);
      return next;
    });
    if (!enabled) {
      stop();
    }
  }, [stop]);

  const setVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setSettingsState((prev) => {
      const next = { ...prev, volume: clamped };
      saveSettings(next);
      return next;
    });
  }, []);

  const toggle = useCallback(() => {
    setEnabled(!settings.enabled);
  }, [settings.enabled, setEnabled]);

  return {
    settings,
    isPlaying,
    isReady,
    start,
    stop,
    setMode,
    setEnabled,
    setVolume,
    toggle,
  };
}
