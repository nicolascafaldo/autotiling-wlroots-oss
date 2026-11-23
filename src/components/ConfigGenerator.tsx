import { useMemo, useState } from 'react';
import { Check, Copy, Download, Plus, Trash2 } from 'lucide-react';
import {
  FloatRule,
  SimConfig,
  WorkspaceMode,
  matchesFloatRule,
} from '../utils/tilingSim';
import { triggerDownload } from '../utils/tarExport';

interface ConfigGeneratorProps {
  config: SimConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimConfig>>;
}

export function ConfigGenerator({ config, setConfig }: ConfigGeneratorProps) {
  const [newField, setNewField] = useState<FloatRule['field']>('app_id');
  const [newPattern, setNewPattern] = useState('');
  const [testAppId, setTestAppId] = useState('pavucontrol');
  const [testTitle, setTestTitle] = useState('Volume Control');
  const [copied, setCopied] = useState(false);

  const testMatch = useMemo(
    () => matchesFloatRule(testAppId, testTitle, config.floatRules),
    [testAppId, testTitle, config.floatRules]
  );

  const generatedIni = useMemo(() => {
    const lines: string[] = [
      '# ~/.config/autotiling-wl/config',
      '# Base template installed at /usr/share/autotiling-wl/config',
      '# Initialize with: autotiling-wl --init-config',
      '',
      '[general]',
      `limit = ${config.limit}`,
      `debug = ${config.debug ? 'true' : 'false'}`,
      `split_ratio = ${config.splitRatio.toFixed(2)}`,
      `split_ratio_landscape = ${(config.dynamicOrientationRatio ? config.splitRatioLandscape : config.splitRatio).toFixed(2)}`,
      `split_ratio_portrait = ${(config.dynamicOrientationRatio ? config.splitRatioPortrait : config.splitRatio).toFixed(2)}`,
      `split_width = ${config.splitWidth}`,
      `split_height = ${config.splitHeight}`,
      `tabbed_on_min = ${config.tabbedOnMin ? 'true' : 'false'}`,
      `outputs = ${config.outputsFilter.join(', ')}`,
      `workspaces = ${config.workspacesFilter.join(', ')}`,
      `events = ${config.events.join(', ')}`,
      '',
      '[workspaces]',
    ];

    ([1, 2, 3, 4] as const).forEach((ws) => {
      const mode = config.workspaceModes[ws] ?? 'dwindle';
      lines.push(`${ws} = ${mode}`);
    });

    lines.push('', '[float_rules]');
    if (config.floatRules.length === 0) {
      lines.push('# rule = app_id:pavucontrol');
    } else {
      config.floatRules.forEach((r) => {
        const prefix = r.field === 'any' ? '' : `${r.field}:`;
        lines.push(`rule = ${prefix}${r.pattern}`);
      });
    }

    return lines.join('\n') + '\n';
  }, [config]);

  function handleAddRule(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newPattern.trim();
    if (!trimmed) return;
    setConfig((c) => ({
      ...c,
      floatRules: [
        ...c.floatRules,
        { id: `fr-${Date.now()}`, field: newField, pattern: trimmed },
      ],
    }));
    setNewPattern('');
  }

  function handleRemoveRule(id: string) {
    setConfig((c) => ({
      ...c,
      floatRules: c.floatRules.filter((r) => r.id !== id),
    }));
  }

  function handleWorkspaceMode(ws: number, mode: WorkspaceMode) {
    setConfig((c) => ({
      ...c,
      workspaceModes: { ...c.workspaceModes, [ws]: mode },
    }));
  }

  function handleCopyConfig() {
    navigator.clipboard.writeText(generatedIni);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function handleDownloadConfig() {
    const blob = new Blob([generatedIni], { type: 'text/plain;charset=utf-8' });
    triggerDownload('config', blob);
  }

  return (
    <section id="config-generator" className="py-12 border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Config generator &amp; rule tester
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Configure auto-float rules, per-workspace layout modes, orientation ratios, and minimum-size tabbed fallbacks. Changes sync live with the simulator above and export directly to <code className="font-mono text-slate-800">~/.config/autotiling-wl/config</code>.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 6 Cols: Interactive Editors */}
          <div className="lg:col-span-6 space-y-6">
            {/* Per-workspace Layout Modes */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white">
              <h3 className="text-sm font-semibold text-slate-900">
                Per-Workspace Layout Modes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">
                Override the default dwindle behavior on specific workspaces.
              </p>
              <div className="divide-y divide-slate-100">
                {[1, 2, 3, 4].map((ws) => {
                  const activeMode = config.workspaceModes[ws] ?? 'dwindle';
                  return (
                    <div
                      key={ws}
                      className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="text-xs font-mono font-medium text-slate-800 tabular-nums">
                        Workspace {ws}
                      </span>
                      <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200">
                        {(['dwindle', 'master-stack', 'tabbed'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => handleWorkspaceMode(ws, mode)}
                            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                              activeMode === mode
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Auto-float rules + Live Rule Tester */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Auto-Float Rules
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Windows matching <code className="font-mono">app_id</code> or <code className="font-mono">title</code> automatically receive <code className="font-mono">floating enable</code>.
                </p>
              </div>

              <form onSubmit={handleAddRule} className="flex flex-wrap gap-2">
                <select
                  aria-label="Match property"
                  value={newField}
                  onChange={(e) => setNewField(e.target.value as FloatRule['field'])}
                  className="px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-800"
                >
                  <option value="app_id">app_id</option>
                  <option value="title">title</option>
                  <option value="any">any</option>
                </select>
                <input
                  type="text"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  placeholder="e.g. org.keepassxc.KeePassXC"
                  aria-label="Auto-float pattern"
                  className="flex-1 min-w-[160px] px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus-visible:outline-2 focus-visible:outline-blue-600"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Rule
                </button>
              </form>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                {config.floatRules.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">
                    No auto-float rules configured.
                  </div>
                ) : (
                  config.floatRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="px-3 py-2 flex items-center justify-between gap-2 text-xs font-mono"
                    >
                      <span className="text-slate-800 truncate">
                        <span className="text-slate-500">{rule.field}:</span>
                        {rule.pattern}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(rule.id)}
                        aria-label={`Remove rule ${rule.pattern}`}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Rule Tester */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    Rule Match Tester
                  </span>
                  <span
                    className={`text-xs font-mono font-medium ${
                      testMatch ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {testMatch
                      ? `Float (${testMatch.field}:${testMatch.pattern})`
                      : 'Tile normally (dwindle)'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={testAppId}
                    onChange={(e) => setTestAppId(e.target.value)}
                    placeholder="Test app_id"
                    aria-label="Test app_id"
                    className="px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md"
                  />
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="Test title"
                    aria-label="Test window title"
                    className="px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right 6 Cols: Generated Config Preview */}
          <div className="lg:col-span-6 border border-slate-200 rounded-lg overflow-hidden bg-slate-950 text-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900">
              <div>
                <div className="text-xs font-mono font-semibold text-white">
                  ~/.config/autotiling-wl/config
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  System base template: /usr/share/autotiling-wl/config
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyConfig}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadConfig}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save config
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-[540px]">
              {generatedIni}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
