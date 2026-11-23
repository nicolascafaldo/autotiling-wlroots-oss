import { useMemo, useState } from 'react';
import {
  Copy,
  Check,
  Plus,
  X,
  RotateCcw,
  Maximize2,
  Layers,
  Move,
  Terminal,
  Pause,
  Play,
  Monitor,
} from 'lucide-react';
import {
  MONITOR_PRESETS,
  SimConfig,
  TreeNode,
  ProtocolLogEntry,
  createInitialTree,
  computeWindowRects,
  evaluateSplit,
  spawnWindowAtFocus,
  closeWindowById,
  mutateFocusedWindow,
} from '../utils/tilingSim';

interface SimulatorWorkbenchProps {
  config: SimConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimConfig>>;
  onResetConfig: () => void;
}

function formatTime(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

export function SimulatorWorkbench({
  config,
  setConfig,
  onResetConfig,
}: SimulatorWorkbenchProps) {
  const [tree, setTree] = useState<TreeNode>(() => createInitialTree());
  const [focusedId, setFocusedId] = useState<string>('win-4');
  const [nextSeq, setNextSeq] = useState<number>(5);
  const [monitorId, setMonitorId] = useState<string>('qhd');
  const [workspaceNum, setWorkspaceNum] = useState<number>(1);
  const [driverMode, setDriverMode] = useState<'sway' | 'river' | 'wlroots'>('sway');
  const [copiedCmd, setCopiedCmd] = useState(false);

  const monitor = useMemo(
    () => MONITOR_PRESETS.find((m) => m.id === monitorId) ?? MONITOR_PRESETS[1],
    [monitorId]
  );

  const windows = useMemo(
    () => computeWindowRects(tree, { width: monitor.width, height: monitor.height }),
    [tree, monitor]
  );

  const evaluation = useMemo(
    () => evaluateSplit(windows, focusedId, config, monitor, workspaceNum),
    [windows, focusedId, config, monitor, workspaceNum]
  );

  const focusedWindow = useMemo(
    () => windows.find((w) => w.id === focusedId) ?? null,
    [windows, focusedId]
  );

  const [logs, setLogs] = useState<ProtocolLogEntry[]>([
    {
      id: 'init-1',
      timestamp: '23:33:01',
      channel: 'wayland',
      message: 'bound ext_workspace_manager_v1, zwlr_foreign_toplevel_manager_v1, river_layout_manager_v3',
    },
    {
      id: 'init-2',
      timestamp: '23:33:01',
      channel: 'systemd',
      message: 'sd_notify READY=1 STATUS="Active (Sway IPC + Wayland dwindle)"',
    },
    {
      id: 'init-3',
      timestamp: '23:33:02',
      channel: 'autotile',
      message: 'focus win-4 (625x702 depth=3) -> RUN_COMMAND splitv (dwindle)',
    },
  ]);

  function appendLog(channel: ProtocolLogEntry['channel'], message: string) {
    setLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, timestamp: formatTime(), channel, message },
      ...prev.slice(0, 29),
    ]);
  }

  function handleSelectWindow(id: string) {
    setFocusedId(id);
    const nextEval = evaluateSplit(windows, id, config, monitor, workspaceNum);
    const win = windows.find((w) => w.id === id);

    if (driverMode === 'river') {
      appendLog(
        'river',
        `river_layout_v3.layout_demand views=${windows.length} ${monitor.width}x${monitor.height}`
      );
    } else if (driverMode === 'wlroots') {
      appendLog(
        'wayland',
        `zwlr_foreign_toplevel_handle_v1.state(activated) app_id=${win?.appId ?? 'unknown'}`
      );
    } else {
      appendLog('sway-ipc', `event window::focus -> GET_TREE (${win?.appId ?? id})`);
    }

    appendLog(
      'autotile',
      nextEval.decision === 'skip'
        ? `skip: ${nextEval.skipReason}`
        : `RUN_COMMAND ${nextEval.decision} (${win?.rect.width}x${win?.rect.height}, depth=${nextEval.depth})`
    );
  }

  function handleSpawnWindow() {
    const { nextTree, newWindowId, autoFloated } = spawnWindowAtFocus(
      tree,
      focusedId,
      evaluation,
      nextSeq,
      config.floatRules
    );
    setTree(nextTree);
    setFocusedId(newWindowId);
    setNextSeq((s) => s + 1);

    const nextWindows = computeWindowRects(nextTree, {
      width: monitor.width,
      height: monitor.height,
    });
    const spawned = nextWindows.find((w) => w.id === newWindowId);
    const nextEval = evaluateSplit(nextWindows, newWindowId, config, monitor, workspaceNum);

    appendLog(
      'wayland',
      `ext_foreign_toplevel_list_v1.toplevel app_id=${spawned?.appId ?? 'foot'}`
    );

    if (autoFloated) {
      appendLog(
        'autotile',
        `matched float rule (${autoFloated.field}:${autoFloated.pattern}) -> RUN_COMMAND floating enable`
      );
      return;
    }

    appendLog(
      'autotile',
      nextEval.decision === 'skip'
        ? `spawned ${newWindowId} (${spawned?.rect.width}x${spawned?.rect.height}) -> skip: ${nextEval.skipReason}`
        : `spawned ${newWindowId} -> next ${nextEval.decision}`
    );
  }

  function handleCloseFocused() {
    if (windows.length <= 1) {
      appendLog('autotile', 'skip close: keeping minimum 1 window in workspace preview');
      return;
    }
    const closingId = focusedId;
    const { nextTree, nextFocusedId } = closeWindowById(tree, closingId);
    setTree(nextTree);
    if (nextFocusedId) {
      setFocusedId(nextFocusedId);
      const nextWindows = computeWindowRects(nextTree, {
        width: monitor.width,
        height: monitor.height,
      });
      const nextEval = evaluateSplit(
        nextWindows,
        nextFocusedId,
        config,
        monitor,
        workspaceNum
      );
      appendLog('wayland', `zwlr_foreign_toplevel_handle_v1.closed (${closingId})`);
      appendLog(
        'autotile',
        nextEval.decision === 'skip'
          ? `focus ${nextFocusedId} -> skip: ${nextEval.skipReason}`
          : `focus ${nextFocusedId} -> RUN_COMMAND ${nextEval.decision}`
      );
    }
  }

  function handleToggleFloating() {
    const nextTree = mutateFocusedWindow(tree, focusedId, (win) => {
      win.floating = !win.floating;
    });
    setTree(nextTree);
    appendLog('sway-ipc', `window::floating toggled on ${focusedId}`);
  }

  function handleToggleFullscreen() {
    const nextTree = mutateFocusedWindow(tree, focusedId, (win) => {
      win.fullscreen = !win.fullscreen;
    });
    setTree(nextTree);
    appendLog('sway-ipc', `window::fullscreen_mode toggled on ${focusedId}`);
  }

  function handleToggleParentTabbed() {
    const nextTree = mutateFocusedWindow(tree, focusedId, (_win, parent) => {
      parent.layout = parent.layout === 'tabbed' ? 'splitv' : 'tabbed';
    });
    setTree(nextTree);
    appendLog('sway-ipc', `parent container layout toggled (tabbed guard check)`);
  }

  function handleTogglePause() {
    const nextPaused = !config.paused;
    setConfig((c) => ({ ...c, paused: nextPaused }));
    appendLog(
      'systemd',
      `SIGUSR1 -> STATUS="${nextPaused ? 'Paused (SIGUSR1)' : 'Active (dwindle)'}"`
    );
  }

  function handleSimulateHotplug() {
    const idx = MONITOR_PRESETS.findIndex((m) => m.id === monitorId);
    const nextPreset = MONITOR_PRESETS[(idx + 1) % MONITOR_PRESETS.length];
    setMonitorId(nextPreset.id);
    appendLog(
      'wayland',
      `wl_output hotplug -> ${nextPreset.outputName} (${nextPreset.width}x${nextPreset.height})`
    );
    if (driverMode === 'river') {
      appendLog(
        'river',
        `river_layout_manager_v3.get_layout attached to ${nextPreset.outputName}`
      );
    }
  }

  function handleResetLayout() {
    const fresh = createInitialTree();
    setTree(fresh);
    setFocusedId('win-4');
    setNextSeq(5);
    appendLog('autotile', 'workspace layout reset to 4-pane dwindle spiral');
  }

  function toggleArrayFilter(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  const generatedCli = useMemo(() => {
    const parts = ['autotiling-wl'];
    if (config.debug) parts.push('-d');
    if (config.limit > 0) parts.push(`-l ${config.limit}`);
    if (config.dynamicOrientationRatio) {
      if (config.splitRatioLandscape !== 1.0) {
        parts.push(`-sr ${config.splitRatioLandscape.toFixed(2)}`);
      }
      parts.push(`--splitratio-portrait ${config.splitRatioPortrait.toFixed(2)}`);
    } else if (config.splitRatio !== 1.0) {
      parts.push(`-sr ${config.splitRatio.toFixed(2)}`);
    }
    if (config.splitWidth > 0) parts.push(`-sw ${config.splitWidth}`);
    if (config.splitHeight > 0) parts.push(`-sh ${config.splitHeight}`);
    if (config.tabbedOnMin) parts.push('--tabbed-on-min');
    if (config.outputsFilter.length > 0) parts.push(`-o ${config.outputsFilter.join(' ')}`);
    if (config.workspacesFilter.length > 0) parts.push(`-w ${config.workspacesFilter.join(' ')}`);
    Object.entries(config.workspaceModes).forEach(([ws, mode]) => {
      if (mode !== 'dwindle') {
        parts.push(`--ws-layout ${ws}:${mode}`);
      }
    });
    if (driverMode !== 'sway') {
      parts.push(`--backend ${driverMode}`);
    }
    return parts.join(' ');
  }, [config, driverMode]);

  function handleCopyCli() {
    navigator.clipboard.writeText(generatedCli);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 1600);
  }

  const aspectPadding = (monitor.height / monitor.width) * 100;

  return (
    <section id="simulator" className="py-10 border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Hero Intro */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-200">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-3">
              <span>Fedora Linux 45</span>
              <span aria-hidden="true">·</span>
              <span>Sway, River &amp; wlroots 0.19</span>
              <span aria-hidden="true">·</span>
              <span>Dwindle Default + systemd sd_notify</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              Wayland-native dwindle &amp; autotiling daemon for Sway and wlroots
            </h1>
            <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-2xl">
              Rebuilt in C17 and Meson with recursive dwindle by default, River <code className="font-mono text-sm">river-layout-v3</code> support, auto-float rules, per-workspace modes, and <code className="font-mono text-sm">SIGUSR1</code> pause control.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setDriverMode('sway')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  driverMode === 'sway'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sway IPC
              </button>
              <button
                type="button"
                onClick={() => setDriverMode('river')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  driverMode === 'river'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                River v3
              </button>
              <button
                type="button"
                onClick={() => setDriverMode('wlroots')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  driverMode === 'wlroots'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Generic wlroots
              </button>
            </div>
          </div>
        </div>

        {/* Main Simulator Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols: Interactive Display Viewport + Controls */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Monitor & Window Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="monitor-preset" className="sr-only">
                  Monitor preset
                </label>
                <select
                  id="monitor-preset"
                  value={monitorId}
                  onChange={(e) => setMonitorId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  {MONITOR_PRESETS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.outputName} — {m.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleSimulateHotplug}
                  title="Simulate wl_output hotplug event"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Hotplug
                </button>

                <div className="inline-flex items-center p-0.5 bg-white border border-slate-200 rounded-md">
                  {[1, 2, 3, 4].map((ws) => (
                    <button
                      key={ws}
                      type="button"
                      onClick={() => {
                        setWorkspaceNum(ws);
                        appendLog('wayland', `ext_workspace_handle_v1.state(active) ws=${ws}`);
                      }}
                      className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded transition-colors whitespace-nowrap shrink-0 ${
                        workspaceNum === ws
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      WS {ws}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSpawnWindow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Spawn Window
                </button>
                <button
                  type="button"
                  onClick={handleCloseFocused}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    config.paused
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {config.paused ? (
                    <Play className="w-3.5 h-3.5" />
                  ) : (
                    <Pause className="w-3.5 h-3.5" />
                  )}
                  {config.paused ? 'Resume' : 'Pause (SIGUSR1)'}
                </button>
                <button
                  type="button"
                  onClick={handleToggleFloating}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    focusedWindow?.floating
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Move className="w-3.5 h-3.5" />
                  Float
                </button>
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    focusedWindow?.fullscreen
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Fullscreen
                </button>
                <button
                  type="button"
                  onClick={handleToggleParentTabbed}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    focusedWindow?.parentLayout === 'tabbed'
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Tabbed
                </button>
                <button
                  type="button"
                  onClick={handleResetLayout}
                  aria-label="Reset workspace layout"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            {/* Simulated Wayland Display Viewport */}
            <div className="border border-slate-200 rounded-lg bg-slate-900 p-3">
              {/* Top Swaybar simulation */}
              <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-950 rounded text-xs font-mono text-slate-300 tabular-nums">
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold">WS {workspaceNum}</span>
                  <span className="text-slate-500">|</span>
                  <span>{monitor.outputName}</span>
                  <span className="text-slate-500">
                    {monitor.width}×{monitor.height}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300">{evaluation.effectiveMode}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>
                    next:{' '}
                    <strong
                      className={
                        evaluation.decision === 'skip' || evaluation.decision === 'floating'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {evaluation.decision === 'skip'
                        ? config.paused
                          ? 'paused'
                          : 'skip (sibling)'
                        : evaluation.decision}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Aspect-ratio Monitor Surface */}
              <div
                className="relative w-full bg-slate-950 rounded border border-slate-800 overflow-hidden"
                style={{
                  paddingBottom: `${Math.min(aspectPadding, 72)}%`,
                }}
              >
                {windows.map((win) => {
                  const isFocused = win.id === focusedId;
                  const leftPct = (win.rect.x / monitor.width) * 100;
                  const topPct = (win.rect.y / monitor.height) * 100;
                  const widthPct = (win.rect.width / monitor.width) * 100;
                  const heightPct = (win.rect.height / monitor.height) * 100;

                  return (
                    <button
                      key={win.id}
                      type="button"
                      onClick={() => handleSelectWindow(win.id)}
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`,
                        zIndex: win.fullscreen ? 30 : win.floating ? 20 : 10,
                      }}
                      className={`absolute text-left p-2.5 rounded-sm transition-colors flex flex-col justify-between overflow-hidden cursor-pointer ${
                        isFocused
                          ? 'bg-slate-800 border-2 border-blue-500 text-white'
                          : 'bg-slate-900/95 border border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="text-xs font-mono font-semibold truncate">
                          {win.appId}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                          d{win.depth}
                        </span>
                      </div>

                      {isFocused &&
                        (evaluation.decision === 'splith' ||
                          evaluation.decision === 'splitv') && (
                          <div
                            aria-hidden="true"
                            className={`pointer-events-none absolute border-dashed border-blue-400/60 ${
                              evaluation.decision === 'splith'
                                ? 'inset-y-2 left-1/2 border-l'
                                : 'inset-x-2 top-1/2 border-t'
                            }`}
                          />
                        )}

                      <div className="flex items-end justify-between gap-2 w-full mt-auto">
                        <span className="text-[11px] text-slate-400 truncate">
                          {win.floating
                            ? 'floating'
                            : win.fullscreen
                              ? 'fullscreen'
                              : `parent: ${win.parentLayout}`}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-300 shrink-0">
                          {win.rect.width}×{win.rect.height}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Decision Readout Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-white p-3.5">
                <div className="text-xs text-slate-500">Evaluated Action</div>
                <div className="mt-1 text-sm font-mono font-semibold text-slate-900">
                  {evaluation.decision === 'skip'
                    ? config.paused
                      ? 'Paused (SIGUSR1)'
                      : 'Skip split'
                    : evaluation.decision === 'tabbed'
                      ? 'RUN_COMMAND layout tabbed'
                      : evaluation.decision === 'floating'
                        ? 'RUN_COMMAND floating enable'
                        : `RUN_COMMAND ${evaluation.decision}`}
                </div>
                <div className="mt-0.5 text-xs text-slate-600 truncate">
                  {evaluation.skipReason ?? 'Width/height ratio triggers dwindle split'}
                </div>
              </div>

              <div className="bg-white p-3.5">
                <div className="text-xs text-slate-500">Aspect Calculation</div>
                <div className="mt-1 text-sm font-mono tabular-nums font-semibold text-slate-900 truncate">
                  {evaluation.ratioMetric}
                </div>
                <div className="mt-0.5 text-xs text-slate-600">
                  {config.dynamicOrientationRatio
                    ? monitor.height > monitor.width
                      ? `Portrait ratio (${config.splitRatioPortrait.toFixed(2)})`
                      : `Landscape ratio (${config.splitRatioLandscape.toFixed(2)})`
                    : 'splitv if height > width / splitratio'}
                </div>
              </div>

              <div className="bg-white p-3.5">
                <div className="text-xs text-slate-500">Container Context</div>
                <div className="mt-1 text-sm font-mono tabular-nums font-semibold text-slate-900">
                  depth {evaluation.depth}
                  {config.limit > 0 ? ` / limit ${config.limit}` : ` (${evaluation.effectiveMode})`}
                </div>
                <div className="mt-0.5 text-xs text-slate-600">
                  Parent: {evaluation.parentLayout ?? 'none'} · Output: {monitor.outputName}
                </div>
              </div>
            </div>
          </div>

          {/* Right 4 Cols: CLI Flag Controls + Live Generated Command + Event Log */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="border border-slate-200 rounded-lg bg-white p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Runtime CLI Flags
                </h2>
                <button
                  type="button"
                  onClick={onResetConfig}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Defaults
                </button>
              </div>

              {/* --limit */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="flag-limit" className="font-mono text-slate-700">
                    -l, --limit
                  </label>
                  <span className="font-mono tabular-nums text-slate-900 font-medium">
                    {config.limit === 0 ? '0 (dwindle)' : config.limit}
                  </span>
                </div>
                <input
                  id="flag-limit"
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={config.limit}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, limit: Number(e.target.value) }))
                  }
                  className="w-full accent-blue-600"
                />
              </div>

              {/* Dynamic Orientation Ratio toggle + sliders */}
              <div className="space-y-2.5 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label htmlFor="flag-dyn-ratio" className="text-xs font-medium text-slate-700">
                    Dynamic orientation splitratio
                  </label>
                  <input
                    id="flag-dyn-ratio"
                    type="checkbox"
                    checked={config.dynamicOrientationRatio}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, dynamicOrientationRatio: e.target.checked }))
                    }
                    className="h-4 w-4 accent-blue-600 rounded"
                  />
                </div>

                {!config.dynamicOrientationRatio ? (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <label htmlFor="flag-ratio" className="font-mono text-slate-700">
                        -sr, --splitratio
                      </label>
                      <span className="font-mono tabular-nums text-slate-900 font-medium">
                        {config.splitRatio.toFixed(2)}
                      </span>
                    </div>
                    <input
                      id="flag-ratio"
                      type="range"
                      min={0.5}
                      max={2.5}
                      step={0.05}
                      value={config.splitRatio}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, splitRatio: Number(e.target.value) }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <label htmlFor="flag-ratio-l" className="font-mono text-slate-700">
                          Landscape
                        </label>
                        <span className="font-mono tabular-nums text-slate-900">
                          {config.splitRatioLandscape.toFixed(2)}
                        </span>
                      </div>
                      <input
                        id="flag-ratio-l"
                        type="range"
                        min={0.5}
                        max={2.5}
                        step={0.05}
                        value={config.splitRatioLandscape}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            splitRatioLandscape: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-600"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <label htmlFor="flag-ratio-p" className="font-mono text-slate-700">
                          Portrait
                        </label>
                        <span className="font-mono tabular-nums text-slate-900">
                          {config.splitRatioPortrait.toFixed(2)}
                        </span>
                      </div>
                      <input
                        id="flag-ratio-p"
                        type="range"
                        min={0.5}
                        max={2.5}
                        step={0.05}
                        value={config.splitRatioPortrait}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            splitRatioPortrait: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* --splitwidth & --splitheight + tabbed fallback */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="flag-sw" className="block text-xs font-mono text-slate-700 mb-1">
                      -sw, --splitwidth
                    </label>
                    <input
                      id="flag-sw"
                      type="number"
                      min={0}
                      max={2000}
                      step={50}
                      value={config.splitWidth}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, splitWidth: Math.max(0, Number(e.target.value)) }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-200 rounded-md focus-visible:outline-2 focus-visible:outline-blue-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="flag-sh" className="block text-xs font-mono text-slate-700 mb-1">
                      -sh, --splitheight
                    </label>
                    <input
                      id="flag-sh"
                      type="number"
                      min={0}
                      max={2000}
                      step={50}
                      value={config.splitHeight}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, splitHeight: Math.max(0, Number(e.target.value)) }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-200 rounded-md focus-visible:outline-2 focus-visible:outline-blue-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="flag-tabbed-min" className="text-xs font-mono text-slate-700">
                    --tabbed-on-min fallback
                  </label>
                  <input
                    id="flag-tabbed-min"
                    type="checkbox"
                    checked={config.tabbedOnMin}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, tabbedOnMin: e.target.checked }))
                    }
                    className="h-4 w-4 accent-blue-600 rounded"
                  />
                </div>
              </div>

              {/* --outputs */}
              <div>
                <div className="text-xs font-mono text-slate-700 mb-1.5">
                  -o, --outputs (empty = all)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['DP-1', 'eDP-1', 'HDMI-A-1'].map((out) => {
                    const active = config.outputsFilter.includes(out);
                    return (
                      <button
                        key={out}
                        type="button"
                        onClick={() =>
                          setConfig((c) => ({
                            ...c,
                            outputsFilter: toggleArrayFilter(c.outputsFilter, out),
                          }))
                        }
                        className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {out}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* --workspaces */}
              <div>
                <div className="text-xs font-mono text-slate-700 mb-1.5">
                  -w, --workspaces (empty = all)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['1', '2', '3', '4'].map((ws) => {
                    const active = config.workspacesFilter.includes(ws);
                    return (
                      <button
                        key={ws}
                        type="button"
                        onClick={() =>
                          setConfig((c) => ({
                            ...c,
                            workspacesFilter: toggleArrayFilter(c.workspacesFilter, ws),
                          }))
                        }
                        className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded border transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {ws}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* --debug */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <label htmlFor="flag-debug" className="text-xs font-mono text-slate-700">
                  -d, --debug stderr logs
                </label>
                <input
                  id="flag-debug"
                  type="checkbox"
                  checked={config.debug}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, debug: e.target.checked }))
                  }
                  className="h-4 w-4 accent-blue-600 rounded"
                />
              </div>
            </div>

            {/* Generated Command */}
            <div className="border border-slate-200 rounded-lg bg-slate-900 p-3.5 text-slate-100">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <Terminal className="w-3.5 h-3.5" />
                  CLI invocation
                </span>
                <button
                  type="button"
                  onClick={handleCopyCli}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCmd ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre-wrap break-all">
                {generatedCli}
              </pre>
            </div>

            {/* Live Protocol Event Stream */}
            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 bg-slate-50">
                <span className="text-xs font-semibold text-slate-800">
                  Protocol, Signal &amp; IPC Trace
                </span>
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Clear
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500 text-center">
                    Interact with windows or hotplug controls to inspect Wayland, River, systemd, and Sway IPC events.
                  </div>
                ) : (
                  logs.map((entry) => (
                    <div key={entry.id} className="px-3.5 py-2 text-xs font-mono leading-snug">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 tabular-nums">
                        <span>{entry.timestamp}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            entry.channel === 'autotile'
                              ? 'text-blue-700 font-medium'
                              : entry.channel === 'wayland' || entry.channel === 'river'
                                ? 'text-emerald-700 font-medium'
                                : entry.channel === 'systemd'
                                  ? 'text-amber-700 font-medium'
                                  : 'text-slate-700 font-medium'
                          }
                        >
                          {entry.channel}
                        </span>
                      </div>
                      <div className="mt-0.5 text-slate-800 break-words">{entry.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
