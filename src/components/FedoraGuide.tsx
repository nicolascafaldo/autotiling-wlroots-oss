import { ReactNode, useMemo, useState } from 'react';
import { Check, Copy, Download, Terminal } from 'lucide-react';
import { FORK_FILES } from '../data/forkFiles';
import { triggerDownload } from '../utils/tarExport';

type DistroId = 'fedora' | 'debian' | 'arch' | 'void';

interface StepItem {
  id: string;
  title: string;
  description: ReactNode;
  command: string;
}

interface DistroConfig {
  id: DistroId;
  label: string;
  headline: string;
  summary: ReactNode;
  depsCommand: string;
  steps: StepItem[];
}

const DISTRO_CONFIGS: Record<DistroId, DistroConfig> = {
  fedora: {
    id: 'fedora',
    label: 'Fedora 45',
    headline: 'Fedora Linux 45 build & deployment',
    summary: (
      <>
        Run <strong className="font-semibold text-slate-900">Step 01</strong> first, then either paste{' '}
        <strong className="font-semibold text-slate-900">Copy Fedora 45 Terminal Script</strong> from any directory or download the{' '}
        <code className="font-mono font-semibold text-slate-900 bg-slate-200/70 px-1 py-0.5 rounded text-xs">.tar</code> and run{' '}
        <strong className="font-semibold text-slate-900">Option A (Meson)</strong> or{' '}
        <strong className="font-semibold text-slate-900">Option B (RPM)</strong>.
      </>
    ),
    depsCommand:
      'sudo dnf install -y gcc meson ninja-build pkgconf-pkg-config wayland-devel wayland-protocols-devel json-c-devel rpm-build redhat-rpm-config rpmdevtools gzip tar systemd-rpm-macros',
    steps: [
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
        id: 'pkg',
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
        id: 'launch',
        title: '04. Launch on Sway, River, or systemd user session',
        description:
          'Runs dwindle by default. Toggle pause anytime with pkill -USR1 autotiling-wl or systemctl --user reload.',
        command: `# Sway (~/.config/sway/config)
exec_always autotiling-wl
bindsym $mod+Shift+t exec pkill -USR1 autotiling-wl

# River (~/.config/river/init)
autotiling-wl --backend river &
riverctl default-layout autotiling-wl

# Systemd user unit (RPM or --prefix=/usr)
systemctl --user enable --now autotiling-wl.service`,
      },
    ],
  },
  debian: {
    id: 'debian',
    label: 'Debian',
    headline: 'Debian (Trixie / Testing / Sid) build & deployment',
    summary: (
      <>
        Requires{' '}
        <mark className="bg-amber-100 text-slate-900 font-semibold px-1.5 py-0.5 rounded font-mono text-xs">
          wayland-protocols &gt;= 1.36
        </mark>{' '}
        and{' '}
        <mark className="bg-amber-100 text-slate-900 font-semibold px-1.5 py-0.5 rounded font-mono text-xs">
          libjson-c-dev &gt;= 0.17
        </mark>{' '}
        (<strong className="font-semibold text-slate-900">Debian 13 Trixie and newer</strong>). Run Step 01, then use the terminal script, Meson, or{' '}
        <code className="font-mono font-semibold text-slate-900 bg-slate-200/70 px-1 py-0.5 rounded text-xs">
          dpkg-buildpackage
        </code>
        .
      </>
    ),
    depsCommand:
      'sudo apt update && sudo apt install -y build-essential meson ninja-build pkg-config libwayland-dev libwayland-bin wayland-protocols libjson-c-dev debhelper devscripts',
    steps: [
      {
        id: 'deps',
        title: '01. Install Debian toolchain, Wayland dev headers, and debhelper',
        description:
          'Pulls build-essential, meson, ninja-build, wayland-scanner (libwayland-bin), wayland-protocols, json-c, and .deb packaging tools.',
        command: `sudo apt update
sudo apt install -y build-essential meson ninja-build pkg-config libwayland-dev libwayland-bin wayland-protocols libjson-c-dev debhelper devscripts`,
      },
      {
        id: 'build',
        title: '02. Option A: Extract downloaded tarball and compile',
        description:
          'Compiles and installs autotiling-wl, base config, systemd unit, and man page into /usr/local.',
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
        id: 'pkg',
        title: '03. Option B: Build and install a native .deb package',
        description:
          'Uses packaging/debian metadata to generate a clean .deb package managed by apt/dpkg in /usr.',
        command: `TAR=$(ls -t ~/Downloads/autotiling-wl-1.1.0*.tar | head -n1)
[ -f "$TAR" ] || { echo "Tarball not found in ~/Downloads"; exit 1; }
mkdir -p ~/autotiling-wl-build && tar -xf "$TAR" -C ~/autotiling-wl-build
cd ~/autotiling-wl-build/autotiling-wl-1.1.0
cp -r packaging/debian debian
chmod +x debian/rules
dpkg-buildpackage -us -uc -b
sudo apt install -y ../autotiling-wl_1.1.0-1_*.deb
autotiling-wl --init-config
man autotiling-wl`,
      },
      {
        id: 'launch',
        title: '04. Launch on Sway, River, or systemd user session',
        description:
          'Runs dwindle by default. Toggle pause anytime with pkill -USR1 autotiling-wl or systemctl --user reload.',
        command: `# Sway (~/.config/sway/config)
exec_always autotiling-wl
bindsym $mod+Shift+t exec pkill -USR1 autotiling-wl

# River (~/.config/river/init)
autotiling-wl --backend river &
riverctl default-layout autotiling-wl

# Systemd user unit (.deb or --prefix=/usr)
systemctl --user enable --now autotiling-wl.service`,
      },
    ],
  },
  arch: {
    id: 'arch',
    label: 'Arch Linux',
    headline: 'Arch Linux build & PKGBUILD workflow',
    summary: (
      <>
        Run <strong className="font-semibold text-slate-900">Step 01</strong> to install{' '}
        <code className="font-mono font-semibold text-slate-900 bg-slate-200/70 px-1 py-0.5 rounded text-xs">
          base-devel
        </code>
        , Meson, Wayland, and <code className="font-mono font-semibold text-slate-900 bg-slate-200/70 px-1 py-0.5 rounded text-xs">json-c</code>, then choose the terminal build script, manual Meson install, or{' '}
        <strong className="font-semibold text-slate-900">makepkg</strong>.
      </>
    ),
    depsCommand:
      'sudo pacman -S --needed --noconfirm base-devel meson ninja pkgconf wayland wayland-protocols json-c',
    steps: [
      {
        id: 'deps',
        title: '01. Install Arch Linux toolchain and Wayland packages',
        description:
          'Pulls base-devel, meson, ninja, pkgconf, wayland (including wayland-scanner), wayland-protocols, and json-c.',
        command: `sudo pacman -S --needed base-devel meson ninja pkgconf wayland wayland-protocols json-c`,
      },
      {
        id: 'build',
        title: '02. Option A: Extract downloaded tarball and compile',
        description:
          'Builds directly with Meson and Ninja and installs into /usr/local with an optional autotiling compatibility symlink.',
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
        id: 'pkg',
        title: '03. Option B: Build and install with PKGBUILD (makepkg)',
        description:
          'Packages autotiling-wl as a tracked pacman package into /usr using packaging/arch/PKGBUILD.',
        command: `TAR=$(ls -t ~/Downloads/autotiling-wl-1.1.0*.tar | head -n1)
[ -f "$TAR" ] || { echo "Tarball not found in ~/Downloads"; exit 1; }
mkdir -p ~/autotiling-wl-pkg && cd ~/autotiling-wl-pkg
gzip -c "$TAR" > autotiling-wl-1.1.0.tar.gz
tar -xOf "$TAR" autotiling-wl-1.1.0/packaging/arch/PKGBUILD > PKGBUILD
makepkg -si
autotiling-wl --init-config
man autotiling-wl`,
      },
      {
        id: 'launch',
        title: '04. Launch on Sway, River, or systemd user session',
        description:
          'Runs dwindle by default. Toggle pause anytime with pkill -USR1 autotiling-wl or systemctl --user reload.',
        command: `# Sway (~/.config/sway/config)
exec_always autotiling-wl
bindsym $mod+Shift+t exec pkill -USR1 autotiling-wl

# River (~/.config/river/init)
autotiling-wl --backend river &
riverctl default-layout autotiling-wl

# Systemd user unit (pacman package or --prefix=/usr)
systemctl --user enable --now autotiling-wl.service`,
      },
    ],
  },
  void: {
    id: 'void',
    label: 'Void Linux',
    headline: 'Void Linux build & xbps-src workflow',
    summary: (
      <>
        Void runs{' '}
        <mark className="bg-amber-100 text-slate-900 font-semibold px-1.5 py-0.5 rounded">
          runit without systemd
        </mark>
        ;{' '}
        <strong className="font-semibold text-slate-900">
          <code className="font-mono bg-slate-200/70 px-1 py-0.5 rounded text-xs">sd_notify</code> gracefully no-ops
        </strong>{' '}
        when{' '}
        <code className="font-mono font-semibold text-slate-900 bg-slate-200/70 px-1 py-0.5 rounded text-xs">
          $NOTIFY_SOCKET
        </code>{' '}
        is unset. Install build deps via{' '}
        <code className="font-mono font-semibold text-slate-900 bg-slate-200/70 px-1 py-0.5 rounded text-xs">
          xbps-install
        </code>{' '}
        and{' '}
        <strong className="font-semibold text-slate-900">
          launch directly from Sway or River
        </strong>
        .
      </>
    ),
    depsCommand:
      'sudo xbps-install -Sy base-devel meson ninja pkg-config wayland-devel wayland-protocols json-c-devel',
    steps: [
      {
        id: 'deps',
        title: '01. Install Void Linux toolchain and Wayland development libraries',
        description:
          'Pulls base-devel, meson, ninja, pkg-config, wayland-devel (includes wayland-scanner), wayland-protocols, and json-c-devel.',
        command: `sudo xbps-install -Sy base-devel meson ninja pkg-config wayland-devel wayland-protocols json-c-devel`,
      },
      {
        id: 'build',
        title: '02. Option A: Extract downloaded tarball and compile',
        description:
          'Compiles and installs autotiling-wl, base config, and man page into /usr/local. Ready for direct Sway/River launch.',
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
        id: 'pkg',
        title: '03. Option B: Build a Void XBPS package with xbps-src',
        description:
          'Uses packaging/void/template inside an existing void-packages clone to build a local XBPS binary package.',
        command: `TAR=$(ls -t ~/Downloads/autotiling-wl-1.1.0*.tar | head -n1)
[ -f "$TAR" ] || { echo "Tarball not found in ~/Downloads"; exit 1; }
# Run from your void-packages directory:
mkdir -p srcpkgs/autotiling-wl hostdir/sources/autotiling-wl-1.1.0
tar -xOf "$TAR" autotiling-wl-1.1.0/packaging/void/template > srcpkgs/autotiling-wl/template
gzip -c "$TAR" > hostdir/sources/autotiling-wl-1.1.0/autotiling-wl-1.1.0.tar.gz
./xbps-src pkg autotiling-wl
sudo xbps-install -R hostdir/binpkgs autotiling-wl`,
      },
      {
        id: 'launch',
        title: '04. Launch directly from Sway or River (runit / non-systemd)',
        description: (
          <>
            Void starts Wayland compositors <strong className="font-semibold text-slate-900">without systemd</strong>; launch{' '}
            <code className="font-mono font-semibold text-slate-900">autotiling-wl</code> in your compositor config and toggle pause anytime with{' '}
            <code className="font-mono font-semibold text-slate-900">SIGUSR1</code>.
          </>
        ),
        command: `# Sway (~/.config/sway/config)
exec_always autotiling-wl
bindsym $mod+Shift+t exec pkill -USR1 autotiling-wl

# River (~/.config/river/init)
autotiling-wl --backend river &
riverctl default-layout autotiling-wl

# Verify installed binary and man page
autotiling-wl --version && man autotiling-wl`,
      },
    ],
  },
};

const DISTRO_ORDER: DistroId[] = ['fedora', 'debian', 'arch', 'void'];

export function FedoraGuide() {
  const [selectedDistro, setSelectedDistro] = useState<DistroId>('fedora');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedBootstrap, setCopiedBootstrap] = useState(false);

  const activeConfig = DISTRO_CONFIGS[selectedDistro];

  const bootstrapScript = useMemo(() => {
    const dirs = Array.from(
      new Set(
        FORK_FILES.map((file) =>
          file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : ''
        ).filter(Boolean)
      )
    );

    const lines: string[] = [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      '',
      `# 1. Install ${activeConfig.label} build dependencies`,
      activeConfig.depsCommand,
      '',
      '# 2. Write autotiling-wl 1.1.0 source tree',
      'WORKDIR="$HOME/autotiling-wl-1.1.0"',
      'rm -rf "$WORKDIR"',
      ...dirs.map((dir) => `mkdir -p "$WORKDIR/${dir}"`),
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

    lines.push('chmod +x packaging/debian/rules');
    lines.push('meson setup build --prefix=/usr/local -Dcompat_symlink=true');
    lines.push('ninja -C build');
    lines.push('sudo ninja -C build install');
    lines.push('autotiling-wl --init-config');
    lines.push('echo "Installed autotiling-wl $(autotiling-wl --version)"');
    return lines.join('\n');
  }, [activeConfig]);

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

  function handleDownloadPagesHtml() {
    const htmlFile = FORK_FILES.find((f) => f.path === 'docs/index.html');
    if (!htmlFile) return;
    const blob = new Blob([htmlFile.content], { type: 'text/html;charset=utf-8' });
    triggerDownload('index.html', blob);
  }

  return (
    <section id="install-guide" className="py-12 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {activeConfig.headline}
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {activeConfig.summary}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-auto">
            <button
              type="button"
              onClick={handleDownloadPagesHtml}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Save docs/index.html
            </button>
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
              {copiedBootstrap
                ? `Copied ${activeConfig.label} Script`
                : `Copy ${activeConfig.label} Terminal Script`}
            </button>
          </div>
        </div>

        {/* Distro Switcher */}
        <div
          role="tablist"
          aria-label="Linux distribution installation guide"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg mb-6"
        >
          {DISTRO_ORDER.map((distroId) => {
            const cfg = DISTRO_CONFIGS[distroId];
            const isActive = selectedDistro === distroId;
            return (
              <button
                key={distroId}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedDistro(distroId)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeConfig.steps.map((step) => (
            <div
              key={`${selectedDistro}-${step.id}`}
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
                  onClick={() => handleCopy(`${selectedDistro}-${step.id}`, step.command)}
                  className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedId === `${selectedDistro}-${step.id}` ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedId === `${selectedDistro}-${step.id}` ? 'Copied' : 'Copy'}
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

