import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';
import { TrainingRunItem } from '../types/auth';

interface ModelPerformanceTrendChartProps {
  runs: TrainingRunItem[];
  selectedRunId?: string | null;
  onSelectRun: (run: TrainingRunItem) => void;
  onRebuildModelOnce?: () => void;
  projectName?: string;
}

export const ModelPerformanceTrendChart: React.FC<ModelPerformanceTrendChartProps> = ({
  runs,
  selectedRunId,
  onSelectRun,
  onRebuildModelOnce,
  projectName = 'Primary Workspace',
}) => {
  const [showAccuracy, setShowAccuracy] = useState(true);
  const [showF1, setShowF1] = useState(true);
  const [showDataLabels, setShowDataLabels] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Chronologically sort runs: earliest first, newest last (left to right on timeline)
  const chronologicalRuns = useMemo(() => {
    return [...runs].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;
      // Fallback version string comparison
      return (a.modelVersion || '').localeCompare(b.modelVersion || '', undefined, { numeric: true });
    });
  }, [runs]);

  // Derived metrics and stats
  const stats = useMemo(() => {
    if (chronologicalRuns.length === 0) return null;

    const validAccRuns = chronologicalRuns.filter((r) => r.testAccuracy !== null && r.testAccuracy !== undefined);
    const validF1Runs = chronologicalRuns.filter((r) => r.f1Score !== null && r.f1Score !== undefined);

    const firstRun = chronologicalRuns[0];
    const latestRun = chronologicalRuns[chronologicalRuns.length - 1];

    const firstAcc = (firstRun.testAccuracy ?? 0) * 100;
    const latestAcc = (latestRun.testAccuracy ?? 0) * 100;
    const accDelta = latestAcc - firstAcc;

    const firstF1 = (firstRun.f1Score ?? 0) * 100;
    const latestF1 = (latestRun.f1Score ?? 0) * 100;
    const f1Delta = latestF1 - firstF1;

    let peakRun = chronologicalRuns[0];
    let peakAcc = (peakRun.testAccuracy ?? 0) * 100;
    chronologicalRuns.forEach((r) => {
      const acc = (r.testAccuracy ?? 0) * 100;
      if (acc > peakAcc) {
        peakAcc = acc;
        peakRun = r;
      }
    });

    const avgF1 = validF1Runs.length > 0
      ? validF1Runs.reduce((acc, cur) => acc + ((cur.f1Score ?? 0) * 100), 0) / validF1Runs.length
      : 0;

    return {
      firstAcc,
      latestAcc,
      accDelta,
      firstF1,
      latestF1,
      f1Delta,
      peakAcc,
      peakRun,
      avgF1,
      totalRuns: chronologicalRuns.length,
    };
  }, [chronologicalRuns]);

  // Chart coordinate calculation
  const chartWidth = 860;
  const chartHeight = 260;
  const paddingLeft = 55;
  const paddingRight = 45;
  const paddingTop = 35;
  const paddingBottom = 45;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Compute Y domain (auto-scaled for optimal dynamic range)
  const { yMin, yMax, yTicks } = useMemo(() => {
    if (chronologicalRuns.length === 0) {
      return { yMin: 50, yMax: 100, yTicks: [50, 60, 70, 80, 90, 100] };
    }

    let minVal = 100;
    let maxVal = 0;

    chronologicalRuns.forEach((r) => {
      if (r.testAccuracy !== null && r.testAccuracy !== undefined) {
        const val = r.testAccuracy * 100;
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
      if (r.f1Score !== null && r.f1Score !== undefined) {
        const val = r.f1Score * 100;
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
    });

    // Floor minVal down to nearest 5 or 10, ceil maxVal to nearest 5 or 100
    const calculatedMin = Math.max(0, Math.floor((minVal - 5) / 10) * 10);
    const calculatedMax = Math.min(100, Math.ceil((maxVal + 4) / 10) * 10);

    const step = (calculatedMax - calculatedMin) / 4 || 10;
    const ticks: number[] = [];
    for (let t = calculatedMin; t <= calculatedMax; t += step) {
      ticks.push(Math.round(t));
    }

    return {
      yMin: calculatedMin,
      yMax: calculatedMax,
      yTicks: Array.from(new Set(ticks)).sort((a, b) => a - b),
    };
  }, [chronologicalRuns]);

  const getYCoord = (valPct: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, valPct));
    const ratio = (clamped - yMin) / (yMax - yMin || 1);
    return paddingTop + innerHeight - ratio * innerHeight;
  };

  const getXCoord = (index: number) => {
    if (chronologicalRuns.length <= 1) {
      return paddingLeft + innerWidth / 2;
    }
    return paddingLeft + (index / (chronologicalRuns.length - 1)) * innerWidth;
  };

  // Build SVG path points for lines and area polygons
  const points = useMemo(() => {
    return chronologicalRuns.map((r, i) => {
      const x = getXCoord(i);
      const acc = r.testAccuracy !== null && r.testAccuracy !== undefined ? r.testAccuracy * 100 : null;
      const f1 = r.f1Score !== null && r.f1Score !== undefined ? r.f1Score * 100 : null;

      const yAcc = acc !== null ? getYCoord(acc) : null;
      const yF1 = f1 !== null ? getYCoord(f1) : null;

      return {
        run: r,
        index: i,
        x,
        acc,
        f1,
        yAcc,
        yF1,
      };
    });
  }, [chronologicalRuns, yMin, yMax, innerWidth, innerHeight]);

  // Construct SVG paths
  const accuracyPathData = useMemo(() => {
    const validPoints = points.filter((p) => p.yAcc !== null);
    if (validPoints.length === 0) return '';
    return validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yAcc!.toFixed(1)}`).join(' ');
  }, [points]);

  const accuracyAreaPathData = useMemo(() => {
    const validPoints = points.filter((p) => p.yAcc !== null);
    if (validPoints.length <= 1) return '';
    const linePath = validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yAcc!.toFixed(1)}`).join(' ');
    const firstX = validPoints[0].x.toFixed(1);
    const lastX = validPoints[validPoints.length - 1].x.toFixed(1);
    const baseY = (paddingTop + innerHeight).toFixed(1);
    return `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [points, paddingTop, innerHeight]);

  const f1PathData = useMemo(() => {
    const validPoints = points.filter((p) => p.yF1 !== null);
    if (validPoints.length === 0) return '';
    return validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yF1!.toFixed(1)}`).join(' ');
  }, [points]);

  const f1AreaPathData = useMemo(() => {
    const validPoints = points.filter((p) => p.yF1 !== null);
    if (validPoints.length <= 1) return '';
    const linePath = validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yF1!.toFixed(1)}`).join(' ');
    const firstX = validPoints[0].x.toFixed(1);
    const lastX = validPoints[validPoints.length - 1].x.toFixed(1);
    const baseY = (paddingTop + innerHeight).toFixed(1);
    return `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [points, paddingTop, innerHeight]);

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 transition-colors">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Model Performance Trend Line
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Holdout Evaluation
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Trajectory of holdout accuracy and F1-score across all previous training runs in <strong className="text-slate-800 dark:text-slate-200">{projectName}</strong>.
            </p>
          </div>
        </div>

        {/* Metric Toggles & Legend */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setShowAccuracy((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all border ${
              showAccuracy
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-xs'
                : 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Accuracy Line</span>
          </button>

          <button
            type="button"
            onClick={() => setShowF1((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all border ${
              showF1
                ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-xs'
                : 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
            <span>F1-Score Line</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDataLabels((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl font-mono text-[11px] font-semibold border transition-all ${
              showDataLabels
                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                : 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500 border-slate-200 dark:border-slate-800'
            }`}
          >
            {showDataLabels ? 'Labels: ON' : 'Labels: OFF'}
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      {stats && stats.totalRuns > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Progression Delta</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {stats.accDelta >= 0 ? (
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center font-mono text-sm">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                  +{stats.accDelta.toFixed(2)}%
                </span>
              ) : (
                <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center font-mono text-sm">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
                  {stats.accDelta.toFixed(2)}%
                </span>
              )}
              <span className="text-[10px] text-slate-400">vs v1.0</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Latest Holdout Score</span>
            <div className="font-bold font-mono text-slate-800 dark:text-slate-200 text-sm mt-0.5">
              {stats.latestAcc.toFixed(1)}% <span className="text-slate-400 text-xs font-normal">Acc</span> · {stats.latestF1.toFixed(1)}% <span className="text-slate-400 text-xs font-normal">F1</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Peak Performance Run</span>
            <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>{stats.peakAcc.toFixed(1)}%</span>
              <span className="text-[10px] font-sans text-slate-400 font-normal">({stats.peakRun.modelVersion})</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Mean Project F1</span>
            <div className="font-bold font-mono text-blue-600 dark:text-blue-400 text-sm mt-0.5">
              {stats.avgF1.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Chart Canvas Area */}
      {runs.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
          <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="font-semibold text-slate-700 dark:text-slate-300">
            No Performance Trend Recorded
          </div>
          <p className="max-w-md mx-auto text-slate-500 dark:text-slate-400">
            Train your first model version to establish a baseline holdout benchmark. Future iterations will plot a comparative trajectory curve.
          </p>
          {onRebuildModelOnce && (
            <button
              type="button"
              onClick={onRebuildModelOnce}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
            >
              Train Model Version 1.0
            </button>
          )}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-2">
          {/* Informative banner if only 1 run exists */}
          {runs.length === 1 && (
            <div className="mb-2 p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  <strong>Baseline Established:</strong> Single model run recorded at {(runs[0].testAccuracy ? runs[0].testAccuracy * 100 : 88).toFixed(1)}% Accuracy. Click <strong>"Rebuild Model Once"</strong> above to produce subsequent versions and generate the progression curve.
                </span>
              </div>
            </div>
          )}

          {/* SVG Canvas */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto min-w-[620px] select-none"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Accuracy Gradient */}
                <linearGradient id="accGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                  <stop offset="90%" stopColor="#10b981" stopOpacity="0.01" />
                </linearGradient>

                {/* F1-Score Gradient */}
                <linearGradient id="f1Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                  <stop offset="90%" stopColor="#3b82f6" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines and Y-axis labels */}
              {yTicks.map((tick) => {
                const y = getYCoord(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 font-mono text-[10px]"
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              {/* X-axis base line */}
              <line
                x1={paddingLeft}
                y1={paddingTop + innerHeight}
                x2={chartWidth - paddingRight}
                y2={paddingTop + innerHeight}
                stroke="currentColor"
                className="text-slate-300 dark:text-slate-700"
                strokeWidth="1"
              />

              {/* Area Under Curves */}
              {showAccuracy && accuracyAreaPathData && (
                <path d={accuracyAreaPathData} fill="url(#accGradient)" />
              )}
              {showF1 && f1AreaPathData && (
                <path d={f1AreaPathData} fill="url(#f1Gradient)" />
              )}

              {/* Stroke Lines */}
              {showF1 && f1PathData && (
                <path
                  d={f1PathData}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all"
                />
              )}

              {showAccuracy && accuracyPathData && (
                <path
                  d={accuracyPathData}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all"
                />
              )}

              {/* Vertical Guide when hovering */}
              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={paddingTop}
                  x2={activePoint.x}
                  y2={paddingTop + innerHeight}
                  stroke="currentColor"
                  className="text-blue-500/60"
                  strokeDasharray="2 2"
                  strokeWidth="1.5"
                />
              )}

              {/* Data Points and Nodes */}
              {points.map((p) => {
                const isSelected = selectedRunId === p.run.id;
                const isHovered = hoveredIndex === p.index;

                return (
                  <g
                    key={p.run.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(p.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => onSelectRun(p.run)}
                  >
                    {/* Hover Target Invisible Wider Area */}
                    <rect
                      x={p.x - 18}
                      y={paddingTop}
                      width={36}
                      height={innerHeight}
                      fill="transparent"
                    />

                    {/* F1-Score Point */}
                    {showF1 && p.yF1 !== null && (
                      <g>
                        <circle
                          cx={p.x}
                          cy={p.yF1}
                          r={isHovered ? 6 : isSelected ? 5.5 : 4}
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all drop-shadow-xs"
                        />
                        {showDataLabels && (
                          <text
                            x={p.x}
                            y={p.yF1 + 14}
                            textAnchor="middle"
                            className="fill-blue-600 dark:fill-blue-400 font-mono text-[9px] font-bold"
                          >
                            {p.f1 !== null ? `${p.f1.toFixed(1)}%` : ''}
                          </text>
                        )}
                      </g>
                    )}

                    {/* Accuracy Point */}
                    {showAccuracy && p.yAcc !== null && (
                      <g>
                        {isSelected && (
                          <circle
                            cx={p.x}
                            cy={p.yAcc}
                            r={9}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeDasharray="3 2"
                            className="animate-pulse"
                          />
                        )}
                        <circle
                          cx={p.x}
                          cy={p.yAcc}
                          r={isHovered ? 6.5 : isSelected ? 5.5 : 4.5}
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all drop-shadow-xs"
                        />
                        {showDataLabels && (
                          <text
                            x={p.x}
                            y={p.yAcc - 8}
                            textAnchor="middle"
                            className="fill-emerald-600 dark:fill-emerald-400 font-mono text-[9px] font-bold"
                          >
                            {p.acc !== null ? `${p.acc.toFixed(1)}%` : ''}
                          </text>
                        )}
                      </g>
                    )}

                    {/* X-axis version label */}
                    <text
                      x={p.x}
                      y={paddingTop + innerHeight + 16}
                      textAnchor="middle"
                      className={`font-mono text-[10px] transition-colors ${
                        isSelected
                          ? 'fill-blue-600 dark:fill-blue-400 font-bold'
                          : isHovered
                          ? 'fill-slate-900 dark:fill-white font-bold'
                          : 'fill-slate-500 dark:fill-slate-400'
                      }`}
                    >
                      {p.run.modelVersion}
                    </text>

                    {/* Algorithm small subtitle */}
                    <text
                      x={p.x}
                      y={paddingTop + innerHeight + 28}
                      textAnchor="middle"
                      className="fill-slate-400 font-sans text-[8px] truncate"
                    >
                      {p.run.algorithmType?.replace('Classifier', '').slice(0, 8)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Floating Hover Tooltip Card */}
          {activePoint && (
            <div
              className="absolute z-20 top-3 pointer-events-none transition-all duration-150"
              style={{
                left: `${Math.min(
                  80,
                  Math.max(15, (activePoint.x / chartWidth) * 100)
                )}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-xl space-y-1.5 min-w-[200px] text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-bold font-sans text-slate-100 flex items-center gap-1">
                    <span>{activePoint.run.modelName}</span>
                    <span className="text-blue-400 font-mono font-bold">({activePoint.run.modelVersion})</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
                      activePoint.run.trainingStatus === 'OPTIMAL'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {activePoint.run.trainingStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Acc:
                    </span>
                    <strong className="text-white">
                      {activePoint.acc !== null ? `${activePoint.acc.toFixed(2)}%` : '—'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      F1:
                    </span>
                    <strong className="text-white">
                      {activePoint.f1 !== null ? `${activePoint.f1.toFixed(2)}%` : '—'}
                    </strong>
                  </div>
                </div>

                {/* Additional metrics */}
                <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-sans">
                  <span>Prec / Rec:</span>
                  <span className="font-mono text-slate-200">
                    {activePoint.run.precision ? (activePoint.run.precision * 100).toFixed(1) + '%' : '—'} /{' '}
                    {activePoint.run.recall ? (activePoint.run.recall * 100).toFixed(1) + '%' : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 font-sans">
                  <span>Dataset:</span>
                  <span className="font-mono text-slate-300 truncate max-w-[120px]">
                    {activePoint.run.datasetId}
                  </span>
                </div>

                <div className="text-[9px] text-slate-500 text-center pt-1 italic">
                  Click point to inspect full details in side panel
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
