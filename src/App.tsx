/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Download } from 'lucide-react';
import { FORK_FILES } from './data/forkFiles';
import { DEFAULT_FLOAT_RULES, SimConfig } from './utils/tilingSim';
import { buildTarArchive, triggerDownload } from './utils/tarExport';
import { SimulatorWorkbench } from './components/SimulatorWorkbench';
import { ConfigGenerator } from './components/ConfigGenerator';
import { ArchitectureSection } from './components/ArchitectureSection';
import { SourceExplorer } from './components/SourceExplorer';
import { FedoraGuide } from './components/FedoraGuide';

function createDefaultConfig(): SimConfig {
  return {
    limit: 0,
    paused: false,
    splitRatio: 1.0,
    dynamicOrientationRatio: true,
    splitRatioLandscape: 1.0,
    splitRatioPortrait: 0.8,
    splitWidth: 0,
    splitHeight: 0,
    tabbedOnMin: false,
    outputsFilter: [],
    workspacesFilter: [],
    events: ['window'],
    workspaceModes: {
      1: 'dwindle',
      2: 'dwindle',
      3: 'dwindle',
      4: 'dwindle',
    },
    floatRules: DEFAULT_FLOAT_RULES,
    debug: true,
  };
}

export default function App() {
  const [config, setConfig] = useState<SimConfig>(createDefaultConfig);

  function handleDownloadTarball() {
    const entries = FORK_FILES.map((file) => ({
      path: file.path,
      content: file.content,
      mode: file.path.endsWith('.sh') ? '0755' : '0644',
    }));
    const blob = buildTarArchive('autotiling-wl-1.1.0', entries);
    triggerDownload('autotiling-wl-1.1.0.tar', blob);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Three-zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <a
            href="#simulator"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-mono"
          >
            autotiling-wl
          </a>

          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#simulator"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Simulator
            </a>
            <a
              href="#config-generator"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Config &amp; Rules
            </a>
            <a
              href="#architecture"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Architecture
            </a>
            <a
              href="#source-tree"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Source Tree
            </a>
            <a
              href="#fedora-45"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Fedora 45
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleDownloadTarball}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Tarball
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <SimulatorWorkbench
          config={config}
          setConfig={setConfig}
          onResetConfig={() => setConfig(createDefaultConfig())}
        />
        <ConfigGenerator config={config} setConfig={setConfig} />
        <ArchitectureSection />
        <SourceExplorer onDownloadTarball={handleDownloadTarball} />
        <FedoraGuide />
      </main>

      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            autotiling-wl · GPL-3.0-or-later · C17 rebuild for Wayland, Sway &amp; River
          </span>
          <div className="flex items-center gap-4">
            <a href="#simulator" className="hover:text-slate-900 transition-colors">
              Simulator
            </a>
            <a href="#config-generator" className="hover:text-slate-900 transition-colors">
              Config
            </a>
            <a href="#source-tree" className="hover:text-slate-900 transition-colors">
              Source Tree
            </a>
            <button
              type="button"
              onClick={handleDownloadTarball}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Export Tarball
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
