import React, { useState, useMemo } from 'react';
import type { PomodoroStats } from '../hooks/usePomodoro';
import type { Task } from '../hooks/useTasks';

interface StatsPanelProps {
  stats: PomodoroStats;
  tasks: Task[];
  onReset: () => void;
  onClose: () => void;
}

type TabKey = 'overview' | 'trend' | 'distribution' | 'tasks';
type RangeKey = 7 | 14 | 30;

function formatDateLabel(dateStr: string, range: RangeKey): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  if (range === 7) {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return weekdays[d.getDay()];
  }
  return `${month}/${day}`;
}

function getDateRange(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();
}

function getMonthDates(year: number, month: number): string[] {
  const dates: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/* ==================== 环形图 ==================== */
const DonutChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  size?: number;
}> = ({ data, size = 160 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e4e8ec" strokeWidth={20} />
        ) : (
          data.map((d, i) => {
            const pct = d.value / total;
            const dash = pct * 2 * Math.PI * radius;
            const gap = 2 * Math.PI * radius - dash;
            const offset = -acc * 2 * Math.PI * radius;
            acc += pct;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={20}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'all 0.5s ease' }}
              />
            );
          })
        )}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-text-primary" style={{ fontSize: 20, fontWeight: 700 }}>
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-text-secondary" style={{ fontSize: 11 }}>
          总分钟
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: d.color }} />
            <span className="text-text-secondary">{d.label}</span>
            <span className="font-semibold text-text-primary ml-auto">{d.value} 分钟</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ==================== 折线图 ==================== */
const LineChart: React.FC<{
  dates: string[];
  values: number[];
  color: string;
  height?: number;
}> = ({ dates, values, color, height = 140 }) => {
  const maxVal = Math.max(1, ...values);
  const padding = { top: 10, right: 10, bottom: 24, left: 28 };
  const chartW = 340 - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const stepX = chartW / (dates.length - 1 || 1);

  const points = values.map((v, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + chartH - (v / maxVal) * chartH,
  }));

  const pathD = points.length > 0
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`
    : '';

  const yTicks = [0, maxVal / 2, maxVal].map((v) => Math.round(v));

  return (
    <svg width="100%" height={height} viewBox={`0 0 340 ${height}`} preserveAspectRatio="none">
      {/* Grid lines */}
      {yTicks.map((t, i) => {
        const y = padding.top + chartH - (t / maxVal) * chartH;
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={340 - padding.right} y2={y} stroke="#f0f0f0" strokeWidth={1} />
            <text x={padding.left - 6} y={y + 4} textAnchor="end" className="fill-text-secondary" style={{ fontSize: 10 }}>
              {t}
            </text>
          </g>
        );
      })}

      {/* Area */}
      {areaD && (
        <path d={areaD} fill={color} opacity={0.1} />
      )}

      {/* Line */}
      {pathD && (
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}

      {/* X labels */}
      {dates.map((d, i) => {
        if (dates.length > 14 && i % 3 !== 0 && i !== dates.length - 1) return null;
        const x = padding.left + i * stepX;
        return (
          <text key={i} x={x} y={height - 6} textAnchor="middle" className="fill-text-secondary" style={{ fontSize: 9 }}>
            {formatDateLabel(d, dates.length as RangeKey)}
          </text>
        );
      })}
    </svg>
  );
};

/* ==================== 热力图 ==================== */
const Heatmap: React.FC<{
  stats: PomodoroStats;
}> = ({ stats }) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dates = getMonthDates(year, month);
  const monthName = now.toLocaleString('zh-CN', { month: 'long' });

  const maxWork = Math.max(1, ...dates.map((d) => stats.dailyStats[d]?.work || 0));

  const getIntensity = (date: string) => {
    const w = stats.dailyStats[date]?.work || 0;
    if (w === 0) return 'bg-surface-dark';
    if (w >= maxWork * 0.75) return 'bg-tomato';
    if (w >= maxWork * 0.5) return 'bg-tomato-light';
    if (w >= maxWork * 0.25) return 'bg-tomato/40';
    return 'bg-tomato/20';
  };

  const firstDayWeekday = new Date(dates[0]).getDay();
  const blanks = Array.from({ length: firstDayWeekday }, (_, i) => i);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-text-secondary">{year}年 {monthName} 番茄钟热力图</h4>
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <span>少</span>
          <span className="w-3 h-3 rounded bg-surface-dark inline-block" />
          <span className="w-3 h-3 rounded bg-tomato/20 inline-block" />
          <span className="w-3 h-3 rounded bg-tomato/40 inline-block" />
          <span className="w-3 h-3 rounded bg-tomato-light inline-block" />
          <span className="w-3 h-3 rounded bg-tomato inline-block" />
          <span>多</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <div key={d} className="text-center text-[10px] text-text-secondary py-1">{d}</div>
        ))}
        {blanks.map((i) => (
          <div key={`blank-${i}`} />
        ))}
        {dates.map((date) => {
          const w = stats.dailyStats[date]?.work || 0;
          const isToday = date === new Date().toISOString().split('T')[0];
          return (
            <div
              key={date}
              className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-colors ${getIntensity(date)} ${
                isToday ? 'ring-2 ring-tomato ring-offset-1' : ''
              } ${w > 0 ? 'text-white' : 'text-text-secondary'}`}
              title={`${date}: ${w} 个番茄钟`}
            >
              {new Date(date).getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ==================== 主面板 ==================== */
export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, tasks, onReset, onClose }) => {
  const [tab, setTab] = useState<TabKey>('overview');
  const [range, setRange] = useState<RangeKey>(7);
  const today = new Date().toISOString().split('T')[0];

  const dates = useMemo(() => getDateRange(range), [range]);

  const workValues = useMemo(() => dates.map((d) => stats.dailyStats[d]?.work || 0), [dates, stats]);
  const breakValues = useMemo(() => dates.map((d) => stats.dailyStats[d]?.break || 0), [dates, stats]);
  const longBreakValues = useMemo(() => dates.map((d) => stats.dailyStats[d]?.longBreak || 0), [dates, stats]);

  const totalWork = stats.totalWorkMinutes;
  const totalBreak = stats.totalBreakMinutes;
  const totalLongBreak = stats.totalLongBreakMinutes;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: '概览' },
    { key: 'trend', label: '趋势' },
    { key: 'distribution', label: '分布' },
    { key: 'tasks', label: '任务' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">统计</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-dark flex items-center justify-center text-text-secondary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <div className="bg-surface-dark rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-tomato">{stats.completedWorkSessions}</div>
            <div className="text-[10px] text-text-secondary mt-0.5">番茄钟</div>
          </div>
          <div className="bg-surface-dark rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-break">{stats.completedBreakSessions}</div>
            <div className="text-[10px] text-text-secondary mt-0.5">短休息</div>
          </div>
          <div className="bg-surface-dark rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-long-break">{stats.completedLongBreakSessions}</div>
            <div className="text-[10px] text-text-secondary mt-0.5">长休息</div>
          </div>
          <div className="bg-surface-dark rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-text-primary">
              {Math.round((totalWork + totalBreak + totalLongBreak) / 60 * 10) / 10}
            </div>
            <div className="text-[10px] text-text-secondary mt-0.5">总小时</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-dark rounded-lg p-0.5 mb-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t.key ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ====== 概览 Tab ====== */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* Range Toggle */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-secondary">每日完成量</h3>
              <div className="flex bg-surface-dark rounded-lg p-0.5">
                {[7, 14, 30].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r as RangeKey)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      range === r ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
                    }`}
                  >
                    {r}天
                  </button>
                ))}
              </div>
            </div>

            {/* Stacked Bar Chart */}
            <div className="flex items-end gap-1.5 h-40">
              {dates.map((date) => {
                const dayStats = stats.dailyStats[date] || { work: 0, break: 0, longBreak: 0 };
                const total = dayStats.work + dayStats.break + dayStats.longBreak;
                const maxVal = Math.max(1, ...dates.map((d) => {
                  const s = stats.dailyStats[d] || { work: 0, break: 0, longBreak: 0 };
                  return s.work + s.break + s.longBreak;
                }));
                const barHeight = total > 0 ? (total / maxVal) * 100 : 0;
                const isToday = date === today;

                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full flex flex-col justify-end rounded-t-md overflow-hidden" style={{ height: `${Math.max(barHeight, 4)}%` }}>
                      {dayStats.work > 0 && (
                        <div className="w-full bg-tomato" style={{ height: `${(dayStats.work / total) * 100}%` }} />
                      )}
                      {dayStats.break > 0 && (
                        <div className="w-full bg-break" style={{ height: `${(dayStats.break / total) * 100}%` }} />
                      )}
                      {dayStats.longBreak > 0 && (
                        <div className="w-full bg-long-break" style={{ height: `${(dayStats.longBreak / total) * 100}%` }} />
                      )}
                    </div>
                    <span className={`text-[9px] ${isToday ? 'font-bold text-tomato' : 'text-text-secondary'}`}>
                      {formatDateLabel(date, range)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-tomato inline-block" />工作</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-break inline-block" />短休息</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-long-break inline-block" />长休息</span>
            </div>

            {/* Heatmap */}
            <Heatmap stats={stats} />
          </div>
        )}

        {/* ====== 趋势 Tab ====== */}
        {tab === 'trend' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-secondary">番茄钟数量趋势</h3>
              <div className="flex bg-surface-dark rounded-lg p-0.5">
                {[7, 14, 30].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r as RangeKey)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      range === r ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
                    }`}
                  >
                    {r}天
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-dark rounded-xl p-3">
              <LineChart dates={dates} values={workValues} color="#ff6b6b" />
            </div>

            <div className="bg-surface-dark rounded-xl p-3">
              <h4 className="text-xs text-text-secondary mb-1">短休息数量趋势</h4>
              <LineChart dates={dates} values={breakValues} color="#4ecdc4" />
            </div>

            <div className="bg-surface-dark rounded-xl p-3">
              <h4 className="text-xs text-text-secondary mb-1">长休息数量趋势</h4>
              <LineChart dates={dates} values={longBreakValues} color="#a78bfa" />
            </div>
          </div>
        )}

        {/* ====== 分布 Tab ====== */}
        {tab === 'distribution' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-3">时间分配</h3>
              <div className="bg-surface-dark rounded-xl p-4 flex justify-center">
                <DonutChart
                  data={[
                    { label: '工作', value: totalWork, color: '#ff6b6b' },
                    { label: '短休息', value: totalBreak, color: '#4ecdc4' },
                    { label: '长休息', value: totalLongBreak, color: '#a78bfa' },
                  ]}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-3">会话次数分布</h3>
              <div className="bg-surface-dark rounded-xl p-4 flex justify-center">
                <DonutChart
                  data={[
                    { label: '工作', value: stats.completedWorkSessions, color: '#ff6b6b' },
                    { label: '短休息', value: stats.completedBreakSessions, color: '#4ecdc4' },
                    { label: '长休息', value: stats.completedLongBreakSessions, color: '#a78bfa' },
                  ]}
                />
              </div>
            </div>

            {/* Best Day */}
            {(() => {
              const entries = Object.entries(stats.dailyStats);
              if (entries.length === 0) return null;
              const best = entries.reduce((a, b) => (a[1].work > b[1].work ? a : b));
              return (
                <div className="bg-surface-dark rounded-xl p-4">
                  <h4 className="text-sm font-medium text-text-secondary mb-2">最佳表现日</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-text-primary font-medium">{best[0]}</span>
                    <span className="text-tomato font-bold">{best[1].work} 个番茄钟</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ====== 任务 Tab ====== */}
        {tab === 'tasks' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface-dark rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-text-primary">{tasks.length}</div>
                <div className="text-[10px] text-text-secondary mt-0.5">总任务</div>
              </div>
              <div className="bg-surface-dark rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-tomato">
                  {tasks.filter((t) => !t.completed).length}
                </div>
                <div className="text-[10px] text-text-secondary mt-0.5">进行中</div>
              </div>
              <div className="bg-surface-dark rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-break">
                  {tasks.filter((t) => t.completed).length}
                </div>
                <div className="text-[10px] text-text-secondary mt-0.5">已完成</div>
              </div>
            </div>

            {/* Task Pomodoro Distribution */}
            {tasks.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-3">任务番茄钟分布</h3>
                <div className="bg-surface-dark rounded-xl p-4 space-y-3">
                  {tasks
                    .filter((t) => t.pomodorosCompleted > 0)
                    .sort((a, b) => b.pomodorosCompleted - a.pomodorosCompleted)
                    .map((task) => {
                      const maxPomodoros = Math.max(
                        1,
                        ...tasks.filter((t) => t.pomodorosCompleted > 0).map((t) => t.pomodorosCompleted)
                      );
                      return (
                        <div key={task.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm truncate max-w-[200px] ${task.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                              {task.name}
                            </span>
                            <span className="text-xs font-mono text-tomato">
                              {task.pomodorosCompleted} 🍅
                            </span>
                          </div>
                          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-tomato rounded-full transition-all"
                              style={{ width: `${(task.pomodorosCompleted / maxPomodoros) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  {tasks.filter((t) => t.pomodorosCompleted > 0).length === 0 && (
                    <div className="text-center py-4 text-sm text-text-secondary/60">
                      还没有任务完成番茄钟，开始工作吧！
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Task Completion Rate */}
            {tasks.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-3">任务完成进度</h3>
                <div className="bg-surface-dark rounded-xl p-4 space-y-3">
                  {tasks
                    .filter((t) => !t.completed)
                    .sort((a, b) => (b.pomodorosCompleted / b.totalPomodoros) - (a.pomodorosCompleted / a.totalPomodoros))
                    .map((task) => {
                      const pct = Math.min(100, (task.pomodorosCompleted / task.totalPomodoros) * 100);
                      return (
                        <div key={task.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-text-primary truncate max-w-[200px]">{task.name}</span>
                            <span className="text-xs text-text-secondary">
                              {task.pomodorosCompleted}/{task.totalPomodoros}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct >= 100 ? '#4ecdc4' : '#ff6b6b',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  {tasks.filter((t) => !t.completed).length === 0 && (
                    <div className="text-center py-4 text-sm text-text-secondary/60">
                      所有任务都已完成！🎉
                    </div>
                  )}
                </div>
              </div>
            )}

            {tasks.length === 0 && (
              <div className="text-center py-8 text-sm text-text-secondary/60">
                暂无任务数据，在主界面添加任务后查看统计
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onReset}
            className="flex-1 py-2.5 border border-border text-text-secondary rounded-xl font-medium hover:bg-surface-dark transition-colors"
          >
            重置数据
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-tomato text-white rounded-xl font-medium hover:bg-tomato-dark transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
