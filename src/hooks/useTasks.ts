import { useState, useCallback } from 'react';

export interface Task {
  id: string;
  name: string;
  completed: boolean;
  pomodorosCompleted: number;
  totalPomodoros: number;
  createdAt: string;
}

export interface TasksState {
  tasks: Task[];
  activeTaskId: string | null;
}

const STORAGE_KEY = 'pomodoro_tasks';

function loadTasks(): TasksState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        tasks: parsed.tasks || [],
        activeTaskId: parsed.activeTaskId || null,
      };
    }
  } catch {
    // ignore
  }
  return { tasks: [], activeTaskId: null };
}

function saveTasks(state: TasksState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function useTasks() {
  const [state, setState] = useState<TasksState>(loadTasks);

  const persist = useCallback((updater: (prev: TasksState) => TasksState) => {
    setState((prev) => {
      const next = updater(prev);
      saveTasks(next);
      return next;
    });
  }, []);

  const addTask = useCallback((name: string, totalPomodoros: number = 1) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => {
      const newTask: Task = {
        id: generateId(),
        name: trimmed,
        completed: false,
        pomodorosCompleted: 0,
        totalPomodoros: Math.max(1, totalPomodoros),
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        tasks: [...prev.tasks, newTask],
        activeTaskId: prev.activeTaskId || newTask.id,
      };
    });
  }, [persist]);

  const removeTask = useCallback((id: string) => {
    persist((prev) => {
      const filtered = prev.tasks.filter((t) => t.id !== id);
      return {
        ...prev,
        tasks: filtered,
        activeTaskId: prev.activeTaskId === id ? (filtered[0]?.id || null) : prev.activeTaskId,
      };
    });
  }, [persist]);

  const toggleTask = useCallback((id: string) => {
    persist((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    }));
  }, [persist]);

  const setActiveTask = useCallback((id: string | null) => {
    persist((prev) => ({
      ...prev,
      activeTaskId: id,
    }));
  }, [persist]);

  const incrementTaskPomodoro = useCallback((id: string) => {
    persist((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, pomodorosCompleted: t.pomodorosCompleted + 1 } : t
      ),
    }));
  }, [persist]);

  const updateTaskName = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, name: trimmed } : t
      ),
    }));
  }, [persist]);

  const updateTaskTotalPomodoros = useCallback((id: string, total: number) => {
    persist((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, totalPomodoros: Math.max(1, total) } : t
      ),
    }));
  }, [persist]);

  const clearCompleted = useCallback(() => {
    persist((prev) => {
      const remaining = prev.tasks.filter((t) => !t.completed);
      return {
        ...prev,
        tasks: remaining,
        activeTaskId: prev.activeTaskId && remaining.find((t) => t.id === prev.activeTaskId)
          ? prev.activeTaskId
          : remaining[0]?.id || null,
      };
    });
  }, [persist]);

  const resetAll = useCallback(() => {
    const empty: TasksState = { tasks: [], activeTaskId: null };
    setState(empty);
    saveTasks(empty);
  }, []);

  const activeTask = state.tasks.find((t) => t.id === state.activeTaskId) || null;
  const pendingTasks = state.tasks.filter((t) => !t.completed);
  const completedTasks = state.tasks.filter((t) => t.completed);

  return {
    tasks: state.tasks,
    activeTaskId: state.activeTaskId,
    activeTask,
    pendingTasks,
    completedTasks,
    addTask,
    removeTask,
    toggleTask,
    setActiveTask,
    incrementTaskPomodoro,
    updateTaskName,
    updateTaskTotalPomodoros,
    clearCompleted,
    resetAll,
  };
}
