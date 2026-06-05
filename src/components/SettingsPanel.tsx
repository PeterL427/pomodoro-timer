import React from 'react';
import type { PomodoroSettings } from '../hooks/usePomodoro';

interface SettingsPanelProps {
  settings: PomodoroSettings;
  onUpdate: (settings: Partial<PomodoroSettings>) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary">设置</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-dark flex items-center justify-center text-text-secondary transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              工作时长（分钟）
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={60}
                value={settings.workDuration}
                onChange={(e) => onUpdate({ workDuration: Number(e.target.value) })}
                className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-tomato"
              />
              <span className="w-12 text-center font-mono font-semibold text-text-primary">
                {settings.workDuration}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              短休息时长（分钟）
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={30}
                value={settings.breakDuration}
                onChange={(e) => onUpdate({ breakDuration: Number(e.target.value) })}
                className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-break"
              />
              <span className="w-12 text-center font-mono font-semibold text-text-primary">
                {settings.breakDuration}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              长休息时长（分钟）
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={60}
                value={settings.longBreakDuration}
                onChange={(e) => onUpdate({ longBreakDuration: Number(e.target.value) })}
                className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-long-break"
              />
              <span className="w-12 text-center font-mono font-semibold text-text-primary">
                {settings.longBreakDuration}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              几个番茄钟后长休息
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={2}
                max={8}
                value={settings.sessionsBeforeLongBreak}
                onChange={(e) => onUpdate({ sessionsBeforeLongBreak: Number(e.target.value) })}
                className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-tomato"
              />
              <span className="w-12 text-center font-mono font-semibold text-text-primary">
                {settings.sessionsBeforeLongBreak}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-primary">自动开始短休息</span>
              <input
                type="checkbox"
                checked={settings.autoStartBreak}
                onChange={(e) => onUpdate({ autoStartBreak: e.target.checked })}
                className="w-5 h-5 rounded accent-tomato cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-primary">自动开始长休息</span>
              <input
                type="checkbox"
                checked={settings.autoStartLongBreak}
                onChange={(e) => onUpdate({ autoStartLongBreak: e.target.checked })}
                className="w-5 h-5 rounded accent-tomato cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-primary">自动开始工作</span>
              <input
                type="checkbox"
                checked={settings.autoStartWork}
                onChange={(e) => onUpdate({ autoStartWork: e.target.checked })}
                className="w-5 h-5 rounded accent-tomato cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-primary">提示音</span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdate({ soundEnabled: e.target.checked })}
                className="w-5 h-5 rounded accent-tomato cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-text-primary">桌面通知</span>
              <input
                type="checkbox"
                checked={settings.notificationEnabled}
                onChange={(e) => onUpdate({ notificationEnabled: e.target.checked })}
                className="w-5 h-5 rounded accent-tomato cursor-pointer"
              />
            </label>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-tomato text-white rounded-xl font-medium hover:bg-tomato-dark transition-colors"
        >
          完成
        </button>
      </div>
    </div>
  );
};
