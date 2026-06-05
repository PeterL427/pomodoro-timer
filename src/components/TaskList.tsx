import React, { useState } from 'react';
import type { Task } from '../hooks/useTasks';

interface TaskListProps {
  tasks: Task[];
  activeTaskId: string | null;
  onAdd: (name: string, totalPomodoros: number) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onSelect: (id: string | null) => void;
  onUpdateName: (id: string, name: string) => void;
  onUpdateTotal: (id: string, total: number) => void;
  onClearCompleted: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  activeTaskId,
  onAdd,
  onRemove,
  onToggle,
  onSelect,
  onUpdateName,
  onUpdateTotal,
  onClearCompleted,
}) => {
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskPomodoros, setNewTaskPomodoros] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTotal, setEditTotal] = useState(1);

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const handleAdd = () => {
    if (!newTaskName.trim()) return;
    onAdd(newTaskName.trim(), newTaskPomodoros);
    setNewTaskName('');
    setNewTaskPomodoros(1);
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditName(task.name);
    setEditTotal(task.totalPomodoros);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      onUpdateName(id, editName.trim());
      onUpdateTotal(id, editTotal);
    }
    setEditingId(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">任务列表</h3>
        {completedTasks.length > 0 && (
          <button
            onClick={onClearCompleted}
            className="text-xs text-text-secondary hover:text-tomato transition-colors"
          >
            清除已完成
          </button>
        )}
      </div>

      {/* Add Task */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="添加新任务..."
          className="flex-1 px-3 py-2 bg-surface-dark rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 border border-transparent focus:border-tomato focus:outline-none transition-colors"
        />
        <div className="flex items-center gap-1 bg-surface-dark rounded-lg px-2">
          <span className="text-xs text-text-secondary">🍅</span>
          <input
            type="number"
            min={1}
            max={20}
            value={newTaskPomodoros}
            onChange={(e) => setNewTaskPomodoros(Math.max(1, Math.min(20, Number(e.target.value))))}
            className="w-10 bg-transparent text-sm text-text-primary text-center focus:outline-none"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!newTaskName.trim()}
          className="px-3 py-2 bg-tomato text-white rounded-lg text-sm font-medium hover:bg-tomato-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          添加
        </button>
      </div>

      {/* Active Task Indicator */}
      {activeTaskId && (
        <div className="mb-3 px-3 py-2 bg-tomato/10 rounded-lg border border-tomato/20">
          <div className="text-xs text-tomato font-medium">
            当前专注: {tasks.find((t) => t.id === activeTaskId)?.name}
          </div>
        </div>
      )}

      {/* Pending Tasks */}
      <div className="space-y-2 mb-3">
        {pendingTasks.length === 0 && (
          <div className="text-center py-6 text-sm text-text-secondary/60">
            暂无任务，添加一个开始专注吧
          </div>
        )}
        {pendingTasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onSelect(task.id === activeTaskId ? null : task.id)}
            className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
              task.id === activeTaskId
                ? 'bg-tomato/10 border border-tomato/30'
                : 'bg-surface-dark border border-transparent hover:border-border'
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(task.id);
              }}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                task.id === activeTaskId
                  ? 'border-tomato text-tomato'
                  : 'border-text-secondary/30 hover:border-tomato'
              }`}
            >
              {task.id === activeTaskId && <span className="w-2 h-2 rounded-full bg-tomato" />}
            </button>

            <div className="flex-1 min-w-0">
              {editingId === task.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(task.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="flex-1 px-2 py-1 bg-white rounded text-sm text-text-primary border border-tomato focus:outline-none"
                  />
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editTotal}
                    onChange={(e) => setEditTotal(Math.max(1, Math.min(20, Number(e.target.value))))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-12 px-1 py-1 bg-white rounded text-sm text-text-primary text-center border border-border focus:outline-none"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveEdit(task.id);
                    }}
                    className="text-xs text-tomato font-medium"
                  >
                    保存
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm truncate ${
                      task.id === activeTaskId ? 'text-text-primary font-medium' : 'text-text-secondary'
                    }`}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEdit(task);
                    }}
                  >
                    {task.name}
                  </span>
                </div>
              )}
            </div>

            {/* Pomodoro progress */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs font-mono text-tomato">{task.pomodorosCompleted}</span>
              <span className="text-xs text-text-secondary">/</span>
              <span className="text-xs font-mono text-text-secondary">{task.totalPomodoros}</span>
            </div>

            {/* Progress bar */}
            <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden shrink-0">
              <div
                className="h-full bg-tomato rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (task.pomodorosCompleted / task.totalPomodoros) * 100)}%`,
                }}
              />
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(task.id);
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center text-text-secondary/50 hover:text-tomato hover:bg-tomato/10 opacity-0 group-hover:opacity-100 transition-all"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="border-t border-border pt-3">
          <div className="text-xs text-text-secondary/60 mb-2">已完成 ({completedTasks.length})</div>
          <div className="space-y-1">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 p-2 rounded-lg opacity-60"
              >
                <button
                  onClick={() => onToggle(task.id)}
                  className="w-5 h-5 rounded-full border-2 border-tomato bg-tomato flex items-center justify-center text-white text-xs"
                >
                  ✓
                </button>
                <span className="flex-1 text-sm text-text-secondary line-through truncate">
                  {task.name}
                </span>
                <span className="text-xs font-mono text-text-secondary">
                  {task.pomodorosCompleted}/{task.totalPomodoros}
                </span>
                <button
                  onClick={() => onRemove(task.id)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-text-secondary/50 hover:text-tomato"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
