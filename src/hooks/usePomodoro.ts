import { useState, useEffect, useCallback, useRef } from 'react';

export type TimerMode = 'work' | 'break' | 'longBreak';

export interface PomodoroSettings {
  workDuration: number; // minutes
  breakDuration: number; // minutes
  longBreakDuration: number; // minutes
  sessionsBeforeLongBreak: number;
  autoStartBreak: boolean;
  autoStartLongBreak: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
  notificationEnabled: boolean;
}

export interface PomodoroStats {
  completedWorkSessions: number;
  completedBreakSessions: number;
  completedLongBreakSessions: number;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  totalLongBreakMinutes: number;
  dailyStats: Record<string, { work: number; break: number; longBreak: number }>;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreak: false,
  autoStartLongBreak: false,
  autoStartWork: false,
  soundEnabled: true,
  notificationEnabled: true,
};

const DEFAULT_STATS: PomodoroStats = {
  completedWorkSessions: 0,
  completedBreakSessions: 0,
  completedLongBreakSessions: 0,
  totalWorkMinutes: 0,
  totalBreakMinutes: 0,
  totalLongBreakMinutes: 0,
  dailyStats: {},
};

function loadSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem('pomodoro_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: PomodoroSettings) {
  localStorage.setItem('pomodoro_settings', JSON.stringify(settings));
}

function loadStats(): PomodoroStats {
  try {
    const raw = localStorage.getItem('pomodoro_stats');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STATS,
        ...parsed,
        dailyStats: parsed.dailyStats || {},
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_STATS };
}

function saveStats(stats: PomodoroStats) {
  localStorage.setItem('pomodoro_stats', JSON.stringify(stats));
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function usePomodoro(onWorkSessionComplete?: () => void) {
  const [settings, setSettingsState] = useState<PomodoroSettings>(loadSettings);
  const [stats, setStatsState] = useState<PomodoroStats>(loadStats);
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionCount, setSessionCount] = useState(0); // consecutive work sessions since last long break
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<{ play: () => void } | null>(null);

  // Initialize audio
  useEffect(() => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playBeep = () => {
      if (!settings.soundEnabled) return;
      try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
      } catch {
        // ignore audio errors
      }
    };

    audioRef.current = { play: playBeep };
  }, [settings.soundEnabled]);

  // Timer countdown
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  // Update document title
  useEffect(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const modeText = mode === 'work' ? '工作' : mode === 'break' ? '休息' : '长休息';
    document.title = `${timeStr} - ${modeText} | 番茄时钟`;
  }, [timeLeft, mode]);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);

    // Play sound
    if (audioRef.current) {
      audioRef.current.play();
    }

    // Update stats
    setStatsState((prev) => {
      const today = getTodayKey();
      const todayStats = prev.dailyStats[today] || { work: 0, break: 0, longBreak: 0 };
      const newStats = { ...prev };

      if (mode === 'work') {
        newStats.completedWorkSessions = prev.completedWorkSessions + 1;
        newStats.totalWorkMinutes = prev.totalWorkMinutes + settings.workDuration;
        todayStats.work = todayStats.work + 1;
        // Notify task completion
        onWorkSessionComplete?.();
      } else if (mode === 'break') {
        newStats.completedBreakSessions = prev.completedBreakSessions + 1;
        newStats.totalBreakMinutes = prev.totalBreakMinutes + settings.breakDuration;
        todayStats.break = todayStats.break + 1;
      } else {
        newStats.completedLongBreakSessions = prev.completedLongBreakSessions + 1;
        newStats.totalLongBreakMinutes = prev.totalLongBreakMinutes + settings.longBreakDuration;
        todayStats.longBreak = todayStats.longBreak + 1;
      }

      newStats.dailyStats = {
        ...prev.dailyStats,
        [today]: todayStats,
      };

      saveStats(newStats);
      return newStats;
    });

    // Determine next mode
    let nextMode: TimerMode;
    let nextDuration: number;

    if (mode === 'work') {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      if (newCount >= settings.sessionsBeforeLongBreak) {
        nextMode = 'longBreak';
        nextDuration = settings.longBreakDuration;
        setSessionCount(0);
      } else {
        nextMode = 'break';
        nextDuration = settings.breakDuration;
      }
    } else {
      nextMode = 'work';
      nextDuration = settings.workDuration;
    }

    setMode(nextMode);
    setTimeLeft(nextDuration * 60);

    // Auto-start next session if enabled
    const shouldAutoStart =
      (nextMode === 'break' && settings.autoStartBreak) ||
      (nextMode === 'longBreak' && settings.autoStartLongBreak) ||
      (nextMode === 'work' && settings.autoStartWork);

    if (shouldAutoStart) {
      setTimeout(() => {
        setIsRunning(true);
      }, 1000);
    }
  }, [mode, settings, sessionCount]);

  const start = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    const duration =
      mode === 'work'
        ? settings.workDuration
        : mode === 'break'
        ? settings.breakDuration
        : settings.longBreakDuration;
    setTimeLeft(duration * 60);
  }, [mode, settings]);

  const switchMode = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    setIsPaused(false);
    const duration =
      newMode === 'work'
        ? settings.workDuration
        : newMode === 'break'
        ? settings.breakDuration
        : settings.longBreakDuration;
    setTimeLeft(duration * 60);
  }, [settings]);

  const setSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const resetStats = useCallback(() => {
    const emptyStats = { ...DEFAULT_STATS };
    setStatsState(emptyStats);
    saveStats(emptyStats);
    setSessionCount(0);
  }, []);

  // Recalculate timeLeft when settings change while not running
  useEffect(() => {
    if (!isRunning) {
      const duration =
        mode === 'work'
          ? settings.workDuration
          : mode === 'break'
          ? settings.breakDuration
          : settings.longBreakDuration;
      setTimeLeft(duration * 60);
    }
  }, [settings.workDuration, settings.breakDuration, settings.longBreakDuration, mode, isRunning]);

  const totalTime =
    mode === 'work'
      ? settings.workDuration * 60
      : mode === 'break'
      ? settings.breakDuration * 60
      : settings.longBreakDuration * 60;
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  return {
    mode,
    timeLeft,
    isRunning,
    isPaused,
    progress,
    sessionCount,
    settings,
    stats,
    start,
    pause,
    resume,
    reset,
    switchMode,
    setSettings,
    resetStats,
  };
}
