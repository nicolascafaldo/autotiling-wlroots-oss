import { useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode, Search } from 'lucide-react';
import { FORK_FILES, ForkFile } from '../data/forkFiles';
import { triggerDownload } from '../utils/tarExport';

interface SourceExplorerProps {
  onDownloadTarball: () => void;
}

const CATEGORIES: Array<'All' | ForkFile['category']> = [
  'All',
  'Core',
  'Protocols',
  'Build',
  'Docs & Config',
  'Packaging',
];

export function SourceExplorer({ onDownloadTarball }: SourceExplorerProps) {
  const [selectedPath, setSelectedPath] = useState<string>('src/autotile.c');
  const [category, setCategory] = useState<'All' | ForkFile['category']>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const filteredFiles = useMemo(() => {
    return FORK_FILES.filter((file) => {
      const matchesCat = category === 'All' || file.category === category;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        file.path.toLowerCase().includes(q) ||
        file.summary.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [category, searchQuery]);

  const activeFile = useMemo(
    () =>
      FORK_FILES.find((f) => f.path === selectedPath) ??
      filteredFiles[0] ??
      FORK_FILES[0],
    [selectedPath, filteredFiles]
  );

  const lines = useMemo(() => activeFile.content.split('\n'), [activeFile]);

  function handleCopyFile() {
    navigator.clipboard.writeText(activeFile.content);
    setCopiedPath(activeFile.path);
    setTimeout(() => setCopiedPath(null), 1600);
  }

  function handleDownloadSingle() {
    const filename = activeFile.path.split('/').pop() ?? 'source.txt';
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    triggerDownload(filename, blob);
  }

  return (
    <section id="source-tree" className="py-12 border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Complete C17 &amp; Meson fork source tree
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Inspect every source file, Wayland protocol XML, Meson build definition, and packaging files for Fedora, Debian, Arch, and Void.
            </p>
          </div>
          <button
            type="button"
            onClick={onDownloadTarball}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download autotiling-wl-1.1.0.tar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 border border-slate-200 rounded-lg overflow-hidden bg-white">
          {/* Left File Sidebar */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 flex flex-col">
            <div className="p-3 border-b border-slate-200 space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter files..."
                  aria-label="Filter source files"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-blue-600"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      category === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-200/70 overflow-y-auto max-h-[540px]">
              {filteredFiles.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No files match &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const isActive = file.path === activeFile.path;
                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => setSelectedPath(file.path)}
                      className={`w-full text-left px-3.5 py-2.5 transition-colors flex flex-col gap-0.5 ${
                        isActive
                          ? 'bg-white text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-mono truncate ${
                            isActive ? 'text-blue-700 font-semibold' : 'text-slate-800'
                          }`}
                        >
                          <FileCode className="w-3.5 h-3.5 shrink-0" />
                          {file.path}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                          {file.content.split('\n').length}L
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 line-clamp-1">
                        {file.summary}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Code Viewer */}
          <div className="lg:col-span-8 flex flex-col bg-slate-950 text-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900">
              <div className="min-w-0">
                <div className="text-xs font-mono font-semibold text-white truncate">
                  {activeFile.path}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {activeFile.summary}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyFile}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedPath === activeFile.path ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedPath === activeFile.path ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSingle}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save File
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-[540px] p-4 font-mono text-xs leading-relaxed">
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/70">
                      <td className="select-none pr-4 text-right text-slate-600 tabular-nums w-10 align-top">
                        {idx + 1}
                      </td>
                      <td className="text-slate-200 whitespace-pre">{line || ' '}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
