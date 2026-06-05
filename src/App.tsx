import { useState, useEffect, useCallback } from 'react';
import { usePomodoro } from './hooks/usePomodoro';
import { useNotification } from './hooks/useNotification';
import { useTasks } from './hooks/useTasks';
import { useBackgroundMusic } from './hooks/useBackgroundMusic';
import { CircularProgress } from './components/CircularProgress';
import { SettingsPanel } from './components/SettingsPanel';
import { StatsPanel } from './components/StatsPanel';
import { TaskList } from './components/TaskList';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getModeLabel(mode: ReturnType<typeof usePomodoro>['mode']) {
  switch (mode) {
    case 'work': return '工作';
    case 'break': return '休息';
    case 'longBreak': return '长休息';
  }
}

function App() {
  const tasks = useTasks();
  const pomodoro = usePomodoro(
    useCallback(() => {
      if (tasks.activeTaskId) {
        tasks.incrementTaskPomodoro(tasks.activeTaskId);
      }
    }, [tasks.activeTaskId])
  );
  const notification = useNotification();
  const music = useBackgroundMusic();
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showMusicPanel, setShowMusicPanel] = useState(false);

  // Control background music based on timer state
  useEffect(() => {
    if (!music.settings.enabled) return;
    if (pomodoro.isRunning && !pomodoro.isPaused) {
      music.start(pomodoro.mode);
    } else {
      music.stop();
    }
  }, [pomodoro.isRunning, pomodoro.isPaused, music.settings.enabled]);

  // Update music mode when timer mode changes while playing
  useEffect(() => {
    if (music.isPlaying) {
      music.setMode(pomodoro.mode);
    }
  }, [pomodoro.mode, music.isPlaying]);

  // Send notification when timer completes
  useEffect(() => {
    if (!pomodoro.isRunning && pomodoro.timeLeft === 0) {
      let title: string;
      let body: string;
      if (pomodoro.mode === 'work') {
        title = '休息结束，开始工作！';
        body = '准备好进入下一个番茄钟了吗？';
      } else if (pomodoro.mode === 'break') {
        title = '短休息结束，开始工作！';
        body = '休息好了吗？继续专注吧！';
      } else {
        title = '长休息结束，开始工作！';
        body = '充好电了吗？新一轮番茄钟开始了！';
      }
      if (pomodoro.settings.notificationEnabled) {
        notification.sendNotification(title, { body });
      }
    }
  }, [pomodoro.isRunning, pomodoro.timeLeft, pomodoro.mode, pomodoro.settings.notificationEnabled]);

  // Request notification permission on first load
  useEffect(() => {
    if (notification.isSupported && notification.permission === 'default' && pomodoro.settings.notificationEnabled) {
      notification.requestPermission();
    }
  }, []);

  const { mode } = pomodoro;
  const isWork = mode === 'work';
  const isBreak = mode === 'break';
  const isLongBreak = mode === 'longBreak';

  const themeColor = isWork ? '#ff6b6b' : isBreak ? '#4ecdc4' : '#a78bfa';
  const themeBg = isWork ? 'bg-tomato' : isBreak ? 'bg-break' : 'bg-long-break';
  const themeHover = isWork ? 'hover:bg-tomato-dark' : isBreak ? 'hover:bg-break-dark' : 'hover:bg-long-break-dark';
  const themeText = isWork ? 'text-tomato' : isBreak ? 'text-break' : 'text-long-break';

  const modeLabel = getModeLabel(mode);
  const statusText = pomodoro.isRunning
    ? pomodoro.isPaused
      ? '已暂停'
      : isWork
      ? tasks.activeTask
        ? `专注: ${tasks.activeTask.name}`
        : '专注工作中...'
      : isBreak
      ? '休息中...'
      : '长休息中...'
    : `准备开始${modeLabel}`;

  // Session indicator dots
  const totalSessions = pomodoro.settings.sessionsBeforeLongBreak;
  const completedInCycle = pomodoro.sessionCount;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">番茄时钟</h1>
          <div className="flex gap-2">
            {/* Music Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowMusicPanel(!showMusicPanel)}
                className={`w-10 h-10 rounded-xl shadow-sm border border-border flex items-center justify-center transition-all ${
                  music.settings.enabled
                    ? music.isPlaying
                      ? 'bg-tomato text-white border-tomato'
                      : 'bg-tomato/10 text-tomato border-tomato/30'
                    : 'bg-white text-text-secondary hover:text-text-primary hover:shadow-md'
                }`}
                title={music.settings.enabled ? '背景音乐已开启' : '背景音乐已关闭'}
              >
                {music.isPlaying ? '🔊' : music.settings.enabled ? '🔇' : '🔈'}
              </button>
              {/* Music Volume Popover */}
              {showMusicPanel && (
                <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-xl border border-border p-4 z-50 animate-in fade-in zoom-in duration-150">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-text-primary">背景音乐</span>
                    <button
                      onClick={() => music.setEnabled(!music.settings.enabled)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                        music.settings.enabled
                          ? 'bg-tomato text-white'
                          : 'bg-surface-dark text-text-secondary'
                      }`}
                    >
                      {music.settings.enabled ? '开启' : '关闭'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">音量</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary">🔇</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(music.settings.volume * 100)}
                          onChange={(e) => music.setVolume(Number(e.target.value) / 100)}
                          className="flex-1 h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-tomato"
                        />
                        <span className="text-xs text-text-secondary">🔊</span>
                      </div>
                      <div className="text-right text-[10px] text-text-secondary mt-0.5">
                        {Math.round(music.settings.volume * 100)}%
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary/70 leading-relaxed">
                      {music.settings.enabled
                        ? music.isPlaying
                          ? '正在播放氛围音乐...'
                          : '计时器运行时将自动播放'
                        : '点击上方按钮开启背景音乐'}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowStats(true)}
              className="w-10 h-10 rounded-xl bg-white shadow-sm border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:shadow-md transition-all"
              title="统计"
            >
              📊
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-xl bg-white shadow-sm border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:shadow-md transition-all"
              title="设置"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-border">
          <button
            onClick={() => pomodoro.switchMode('work')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isWork
                ? 'bg-tomato text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            工作
          </button>
          <button
            onClick={() => pomodoro.switchMode('break')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isBreak
                ? 'bg-break text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            短休息
          </button>
          <button
            onClick={() => pomodoro.switchMode('longBreak')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isLongBreak
                ? 'bg-long-break text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            长休息
          </button>
        </div>

        {/* Session Progress Dots */}
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: totalSessions }, (_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < completedInCycle ? 'bg-tomato' : 'bg-border'
              }`}
              title={`第 ${i + 1} 个番茄钟${i < completedInCycle ? '（已完成）' : ''}`}
            />
          ))}
        </div>

        {/* Timer Display */}
        <div className="flex justify-center">
          <CircularProgress
            progress={pomodoro.progress}
            size={260}
            strokeWidth={10}
            color={themeColor}
          >
            <div className="text-center px-4">
              <div className={`text-5xl font-mono font-bold tracking-tight ${themeText}`}>
                {formatTime(pomodoro.timeLeft)}
              </div>
              <div className="text-sm text-text-secondary mt-2 truncate max-w-[200px]">
                {statusText}
              </div>
            </div>
          </CircularProgress>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-4">
          {!pomodoro.isRunning || pomodoro.isPaused ? (
            <button
              onClick={pomodoro.isPaused ? pomodoro.resume : pomodoro.start}
              className={`w-16 h-16 rounded-full ${themeBg} text-white shadow-lg ${themeHover} flex items-center justify-center text-2xl transition-all active:scale-95`}
            >
              ▶
            </button>
          ) : (
            <button
              onClick={pomodoro.pause}
              className={`w-16 h-16 rounded-full ${themeBg} text-white shadow-lg ${themeHover} flex items-center justify-center text-2xl transition-all active:scale-95`}
            >
              ⏸
            </button>
          )}
          <button
            onClick={pomodoro.reset}
            className="w-16 h-16 rounded-full bg-white text-text-secondary shadow-lg border border-border hover:bg-surface-dark hover:text-text-primary flex items-center justify-center text-xl transition-all active:scale-95"
          >
            ↺
          </button>
        </div>

        {/* Session Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">
              今日完成: <span className="font-semibold text-tomato">{pomodoro.stats.dailyStats[new Date().toISOString().split('T')[0]]?.work || 0}</span> 个番茄钟
            </span>
            <span className="text-text-secondary">
              总番茄钟: <span className="font-semibold text-text-primary">{pomodoro.stats.completedWorkSessions}</span>
            </span>
          </div>
        </div>

        {/* Task List */}
        <TaskList
          tasks={tasks.tasks}
          activeTaskId={tasks.activeTaskId}
          onAdd={tasks.addTask}
          onRemove={tasks.removeTask}
          onToggle={tasks.toggleTask}
          onSelect={tasks.setActiveTask}
          onUpdateName={tasks.updateTaskName}
          onUpdateTotal={tasks.updateTaskTotalPomodoros}
          onClearCompleted={tasks.clearCompleted}
        />

        {/* Notification Permission Hint */}
        {notification.isSupported && notification.permission !== 'granted' && pomodoro.settings.notificationEnabled && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center justify-between">
            <span>开启桌面通知，时间到了自动提醒</span>
            <button
              onClick={() => notification.requestPermission()}
              className="px-3 py-1 bg-amber-100 hover:bg-amber-200 rounded-lg text-amber-900 font-medium transition-colors"
            >
              开启
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showSettings && (
        <SettingsPanel
          settings={pomodoro.settings}
          onUpdate={pomodoro.setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showStats && (
        <StatsPanel
          stats={pomodoro.stats}
          tasks={tasks.tasks}
          onReset={() => {
            pomodoro.resetStats();
            tasks.resetAll();
          }}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  );
}

export default App;
