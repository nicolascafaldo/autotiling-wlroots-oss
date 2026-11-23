import { useMemo, useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { FORK_FILES } from '../data/forkFiles';

interface StepItem {
  id: string;
  title: string;
  description: string;
  command: string;
}

const FEDORA_STEPS: StepItem[] = [
  {
    id: 'deps',
    title: '01. Install Fedora 45 toolchain, Wayland headers, and RPM tooling',
    description:
      'Pulls gcc, meson, ninja, pkgconf, wayland-scanner, staging Wayland protocols, json-c, and full RPM packaging macros.',
    command: `sudo dnf install -y gcc meson ninja-build pkgconf-pkg-config wayland-devel wayland-protocols-devel json-c-devel rpm-build redhat-rpm-config rpmdevtools gzip tar systemd-rpm-macros`,
  },
  {
    id: 'build',
    title: '02. Option A: Extract downloaded tarball and compile',
    description:
      'Run from any directory after downloading the .tar to ~/Downloads. Installs into /usr/local (skip if building the RPM in Step 03).',
    command: `TAR=$(ls -t ~/Downloads/autotiling-wl-1.1.0*.tar | head -n1)
[ -f "$TAR" ] || { echo "Tarball not found in ~/Downloads"; exit 1; }
mkdir -p ~/autotiling-wl-build && tar -xf "$TAR" -C ~/autotiling-wl-build
cd ~/autotiling-wl-build/autotiling-wl-1.1.0
meson setup build --prefix=/usr/local -Dcompat_symlink=true
ninja -C build
sudo ninja -C build install
autotiling-wl --init-config
man autotiling-wl`,
  },
  {
    id: 'rpm',
    title: '03. Option B: Build a native Fedora 45 RPM package',
    description:
      'Run from any directory after downloading the .tar to ~/Downloads. Installs cleanly via dnf into /usr.',
    command: `TAR=$(ls -t ~/Downloads/autotiling-wl-1.1.0*.tar | head -n1)
[ -f "$TAR" ] || { echo "Tarball not found in ~/Downloads"; exit 1; }
rpmdev-setuptree
gzip -c "$TAR" > ~/rpmbuild/SOURCES/autotiling-wl-1.1.0.tar.gz
tar -xOf "$TAR" autotiling-wl-1.1.0/packaging/fedora/autotiling-wl.spec > ~/rpmbuild/SPECS/autotiling-wl.spec
rpmbuild -ba ~/rpmbuild/SPECS/autotiling-wl.spec
sudo dnf install -y ~/rpmbuild/RPMS/$(uname -m)/autotiling-wl-1.1.0-1.fc45.$(uname -m).rpm
autotiling-wl --init-config
man autotiling-wl`,
  },
  {
    id: 'sway',
    title: '04. Launch on Sway, River, or systemd user session',
    description:
      'Runs dwindle by default. Toggle pause anytime with pkill -USR1 autotiling-wl or systemctl --user reload.',
    command: `# Sway (~/.config/sway/config)
exec_always autotiling-wl
bindsym $mod+Shift+t exec pkill -USR1 autotiling-wl

# River (~/.config/river/init)
autotiling-wl --backend river &
riverctl default-layout autotiling-wl

# Systemd user unit (Type=notify + WatchdogSec=30s)
systemctl --user enable --now autotiling-wl.service`,
  },
];

export function FedoraGuide() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedBootstrap, setCopiedBootstrap] = useState(false);

  const bootstrapScript = useMemo(() => {
    const lines: string[] = [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'WORKDIR="$HOME/autotiling-wl-1.1.0"',
      'rm -rf "$WORKDIR"',
      'mkdir -p "$WORKDIR"/{src,protocols,share/autotiling-wl,man,systemd,packaging/fedora}',
      'cd "$WORKDIR"',
      '',
    ];

    FORK_FILES.forEach((file, idx) => {
      const marker = `EOF_AUTOTILE_${idx}`;
      lines.push(`cat << '${marker}' > "${file.path}"`);
      lines.push(file.content.replace(/\n$/, ''));
      lines.push(marker);
      lines.push('');
    });

    lines.push('meson setup build --prefix=/usr/local -Dcompat_symlink=true');
    lines.push('ninja -C build');
    lines.push('sudo ninja -C build install');
    lines.push('autotiling-wl --init-config');
    lines.push('echo "Installed autotiling-wl $(autotiling-wl --version)"');
    return lines.join('\n');
  }, []);

  function handleCopy(id: string, cmd: string) {
    navigator.clipboard.writeText(cmd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  }

  function handleCopyBootstrap() {
    navigator.clipboard.writeText(bootstrapScript);
    setCopiedBootstrap(true);
    setTimeout(() => setCopiedBootstrap(false), 1800);
  }

  return (
    <section id="fedora-45" className="py-12 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Fedora Linux 45 build &amp; deployment
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Run Step 01 first, then either paste <strong>Copy Full Terminal Build Script</strong> from any directory (no tarball download needed—writes <code className="font-mono text-slate-800">~/autotiling-wl-1.1.0</code> directly) or download the <code className="font-mono text-slate-800">.tar</code> and run Option A (Meson) or Option B (RPM).
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyBootstrap}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedBootstrap ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Terminal className="w-3.5 h-3.5" />
            )}
            {copiedBootstrap ? 'Copied Build Script' : 'Copy Full Terminal Build Script'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEDORA_STEPS.map((step) => (
            <div
              key={step.id}
              className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="relative bg-slate-950 rounded-md p-3.5 text-slate-100">
                <button
                  type="button"
                  onClick={() => handleCopy(step.id, step.command)}
                  className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedId === step.id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedId === step.id ? 'Copied' : 'Copy'}
                </button>
                <pre className="text-xs font-mono text-slate-200 overflow-x-auto pr-16 leading-relaxed">
                  {step.command}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
