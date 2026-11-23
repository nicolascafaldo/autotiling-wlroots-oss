# autotiling-wl

Automatic window tiling for **Sway**, **River**, and modern **wlroots** Wayland compositors.

`autotiling-wl` automatically switches split direction based on the shape of your focused window to create a **dwindle** layout by default, while adding Hyprland-inspired ergonomics and keeping drop-in compatibility with original `autotiling` flags.

## Features

- **Dwindle layout by default**: Splits windows recursively along their longest edge without requiring manual split shortcuts.
- **Custom split ratios (`--mfact`)**: Control primary/secondary split proportions (e.g. `0.60` for 60/40 splits) on both Sway and River.
- **Ultrawide single-window centering (`--single-window-aspect`)**: Center a solo window cleanly to `16:9` (or `4:3`) on ultrawide monitors while multi-window splits still fill 100% of the screen.
- **Centered master & master-stack modes**: Assign `dwindle`, `master-stack`, `center-master`, or `tabbed` per workspace.
- **Promote new windows to master (`--new-status master`)**: Automatically swap newly spawned windows into the master slot.
- **Directional split placement (`--force-split`)**: Choose `auto`, `left` (prepend left/up), or `right` (append right/down).
- **Dynamic smart gaps (`--smart-gaps`)**: Collapse inner/outer gaps automatically when a workspace has one tiled window or uses `tabbed` layout.
- **Terminal window swallowing (`--swallow`)**: Automatically hide `foot`, `alacritty`, or `kitty` when launching a child GUI window and restore it on close.
- **Rich auto-float window rules**: Match `app_id` or window `title` with chained actions (`float`, `sticky`, `size W% H%`, `center`, `move X% Y%`, `opacity R`, `border none`).
- **Orientation-aware split ratios & tabbed fallback**: Separate split ratios for landscape and portrait monitors plus `--tabbed-on-min`.
- **Pause/resume anytime**: Send `SIGUSR1` (`pkill -USR1 autotiling-wl`) to pause or resume tiling without restarting.
- **Multi-compositor support**: Works seamlessly with Sway, River (`river-layout-v3`), and systemd user sessions (gracefully ignored on non-systemd setups such as Void).

---

## Web Installation Guide (GitHub Pages)

This repository includes a standalone, interactive installation page at `docs/index.html` featuring a 4-distro switcher (**Fedora 45**, **Debian**, **Arch Linux**, and **Void Linux**).

To publish it as a website via **GitHub Pages**:
1. Push your repository (including `docs/index.html`) to GitHub.
2. Open your repository on GitHub and go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select branch **`main`** and folder **`/docs`**, then click **Save**.
5. After ~1 minute, GitHub publishes the guide at `https://<your-username>.github.io/<your-repo>/`.

---

## Installation

### Fedora Linux 45

#### 1. Install dependencies
```bash
sudo dnf install -y gcc meson ninja-build pkgconf-pkg-config wayland-devel wayland-protocols-devel json-c-devel rpm-build redhat-rpm-config rpmdevtools gzip tar systemd-rpm-macros
```

#### 2A. Standard install (`/usr/local`)
```bash
git clone https://github.com/<your-username>/autotiling-wl.git
cd autotiling-wl
meson setup build --prefix=/usr/local -Dcompat_symlink=true
ninja -C build
sudo ninja -C build install
```

#### 2B. Build and install an RPM package (`/usr`)
```bash
git clone https://github.com/<your-username>/autotiling-wl.git
rpmdev-setuptree
tar --transform 's,^autotiling-wl,autotiling-wl-1.1.0,' -czf ~/rpmbuild/SOURCES/autotiling-wl-1.1.0.tar.gz autotiling-wl
cp autotiling-wl/packaging/fedora/autotiling-wl.spec ~/rpmbuild/SPECS/
rpmbuild -ba ~/rpmbuild/SPECS/autotiling-wl.spec
sudo dnf install -y ~/rpmbuild/RPMS/$(uname -m)/autotiling-wl-1.1.0-1.fc45.$(uname -m).rpm
```

---

### Debian (Trixie / Testing / Sid)

> Requires **`wayland-protocols >= 1.36`** and **`libjson-c-dev >= 0.17`** (included in **Debian 13 Trixie and newer**).

#### 1. Install dependencies
```bash
sudo apt update
sudo apt install -y build-essential meson ninja-build pkg-config libwayland-dev libwayland-bin wayland-protocols libjson-c-dev debhelper devscripts
```

#### 2A. Standard install (`/usr/local`)
```bash
git clone https://github.com/<your-username>/autotiling-wl.git
cd autotiling-wl
meson setup build --prefix=/usr/local -Dcompat_symlink=true
ninja -C build
sudo ninja -C build install
```

#### 2B. Build and install a `.deb` package (`/usr`)
```bash
git clone https://github.com/<your-username>/autotiling-wl.git
cd autotiling-wl
cp -r packaging/debian debian
chmod +x debian/rules
dpkg-buildpackage -us -uc -b
sudo apt install -y ../autotiling-wl_1.1.0-1_*.deb
```

---

### Arch Linux

#### 1. Install dependencies
```bash
sudo pacman -S --needed base-devel meson ninja pkgconf wayland wayland-protocols json-c
```

#### 2A. Standard install (`/usr/local`)
```bash
git clone https://github.com/<your-username>/autotiling-wl.git
cd autotiling-wl
meson setup build --prefix=/usr/local -Dcompat_symlink=true
ninja -C build
sudo ninja -C build install
```

#### 2B. Build and install with `makepkg` (`/usr`)
```bash
git clone https://github.com/<your-username>/autotiling-wl.git
mkdir -p autotiling-wl-pkg
tar --transform 's,^autotiling-wl,autotiling-wl-1.1.0,' -czf autotiling-wl-pkg/autotiling-wl-1.1.0.tar.gz autotiling-wl
cp autotiling-wl/packaging/arch/PKGBUILD autotiling-wl-pkg/
cd autotiling-wl-pkg
makepkg -si
```

---

### Void Linux

> **Note:** Void runs **runit without systemd**; **`sd_notify` gracefully no-ops** when **`$NOTIFY_SOCKET`** is unset. Install build deps via **`xbps-install`** and **launch directly from Sway or River**.

#### 1. Install dependencies
```bash
sudo xbps-install -Sy base-devel meson ninja pkg-config wayland-devel wayland-protocols json-c-devel
```

#### 2A. Standard install (`/usr/local`)
```bash
git clone https://github.com/<your-username>/autotiling-wl.git
cd autotiling-wl
meson setup build --prefix=/usr/local -Dcompat_symlink=true
ninja -C build
sudo ninja -C build install
```

#### 2B. Package with `xbps-src` (Optional)
A template is provided at `packaging/void/template`. Copy it to `void-packages/srcpkgs/autotiling-wl/template`, update `distfiles`/`checksum`, and run `./xbps-src pkg autotiling-wl`.

> Pass `-Dcompat_symlink=true` when configuring Meson if you want an `autotiling` symlink so existing Sway configs work without edits.

---

## Quick Start

### Create your config file

```bash
autotiling-wl --init-config
```

This copies the default template into `~/.config/autotiling-wl/config`.

### Sway (`~/.config/sway/config`)

```sway
# Start autotiling in dwindle mode
exec_always autotiling-wl

# Optional: keybind to pause/resume autotiling
bindsym $mod+Shift+t exec pkill -USR1 autotiling-wl
```

### River (`~/.config/river/init`)

```sh
autotiling-wl --backend river &
riverctl default-layout autotiling-wl
```

### Systemd User Service (Fedora / Debian / Arch)

> **Note:** `autotiling-wl.service` runs `/usr/bin/autotiling-wl` (the default path when installed via a distro package or `--prefix=/usr`). On Void Linux (**runit**), **launch `autotiling-wl` directly from your Sway or River config instead**.

```bash
systemctl --user enable --now autotiling-wl.service

# Pause or resume via systemd
systemctl --user reload autotiling-wl.service
```

---

## Configuration (`~/.config/autotiling-wl/config`)

```ini
[general]
limit = 0
split_ratio = 1.00
split_ratio_landscape = 1.00
split_ratio_portrait = 0.80
mfact = 0.50
force_split = auto
new_status = slave
single_window_aspect = 16:9
smart_gaps = true
inner_gap = 10
outer_gap = 0
enable_swallow = false
swallow_terminals = foot, alacritty, kitty
split_width = 0
split_height = 0
tabbed_on_min = false

[workspaces]
# 2 = master-stack
# 3 = center-master
# 4 = tabbed

[float_rules]
rule = app_id:pavucontrol -> float, size 55% 65%, center
rule = app_id:org.gnome.Calculator -> float, center
rule = title:Picture-in-Picture -> float, sticky, size 28% 28%, move 70% 68%
```

---

## Command-Line Options

| Option | Description | Default |
| :--- | :--- | :--- |
| `-h, --help` | Show help and exit | — |
| `-v, --version` | Print version and exit | — |
| `-d, --debug` | Print debug logs to stderr | `false` |
| `-c, --config PATH` | Use a custom config file path | `~/.config/autotiling-wl/config` |
| `--init-config` | Create user config from base template | — |
| `-o, --outputs OUT...` | Restrict to specific monitors (e.g. `DP-1 HDMI-A-1`) | All |
| `-w, --workspaces WS...` | Restrict to specific workspaces (e.g. `1 3 5`) | All |
| `-l, --limit N` | Max split depth (`0` = dwindle, `2` = master-stack) | `0` |
| `-sw, --splitwidth PX` | Minimum container width before skipping/tabbing | `0` |
| `-sh, --splitheight PX` | Minimum container height before skipping/tabbing | `0` |
| `-sr, --splitratio R` | Height-to-width split ratio multiplier | `1.0` |
| `--splitratio-portrait R` | Split ratio override for vertical monitors | `0.80` |
| `--mfact R` | Master/primary split ratio (`0.10`–`0.90`) | `0.50` |
| `--force-split SIDE` | Placement side for new splits (`auto`, `left`, `right`) | `auto` |
| `--new-status MODE` | Spawn new windows as `slave` or promote to `master` | `slave` |
| `--single-window-aspect W:H` | Center a solo tiled window (`16:9`, `4:3`, or `0`) | `16:9` |
| `--smart-gaps` | Collapse gaps when <= 1 tiled window or `tabbed` | `true` |
| `--inner-gap PX` | Inner gap pixels when multiple tiled windows exist | `10` |
| `--outer-gap PX` | Outer gap pixels when multiple tiled windows exist | `0` |
| `--swallow` | Hide parent terminal when spawning a child GUI window | `false` |
| `--swallow-term LIST` | Comma-separated terminal `app_id` list | `foot,alacritty,kitty` |
| `--tabbed-on-min` | Switch to `tabbed` when below min width/height | `false` |
| `--float-rule RULE` | Window rule (`app_id:foo -> float, size 55% 65%, center`) | — |
| `--ws-layout WS:MODE` | Mode (`dwindle`, `master-stack`, `center-master`, `tabbed`) | `dwindle` |
| `-e, --events EV...` | Sway IPC events to listen for | `window` |
| `--backend MODE` | Force backend (`auto`, `sway`, `river`, `wlroots`) | `auto` |

For full reference documentation, run:

```bash
man autotiling-wl
```

---

## License

GPL-3.0-or-later
