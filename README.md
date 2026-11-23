# autotiling-wl

Automatic window tiling for **Sway**, **River**, and modern **wlroots** Wayland compositors.

`autotiling-wl` automatically switches split direction based on the shape of your focused window to create a **dwindle** layout by default, while keeping drop-in compatibility with original `autotiling` flags and configs.

## Features

- **Dwindle layout by default**: Splits windows recursively along their longest edge without requiring manual split shortcuts.
- **Optional master-stack cap**: Limit split depth with `--limit 2` globally or per workspace.
- **Per-workspace layout modes**: Assign `dwindle`, `master-stack`, or `tabbed` layouts to specific workspaces.
- **Auto-floating rules**: Automatically float dialogs, mixers, or Picture-in-Picture windows by `app_id` or window title.
- **Orientation-aware split ratios**: Use separate split ratios for landscape and portrait/vertical monitors.
- **Minimum-size tabbed fallback**: Switch tiny splits to `tabbed` automatically with `--tabbed-on-min`.
- **Pause/resume anytime**: Send `SIGUSR1` (`pkill -USR1 autotiling-wl`) to pause or resume tiling without restarting.
- **Multi-compositor support**: Works seamlessly with Sway, River (`river-layout-v3`), and systemd user sessions.

---

## Installation (Fedora Linux 45)

### 1. Install dependencies

```bash
sudo dnf install -y gcc meson ninja-build pkgconf-pkg-config wayland-devel wayland-protocols-devel json-c-devel rpm-build redhat-rpm-config rpmdevtools gzip tar systemd-rpm-macros
```

### 2. Build and install

#### Option A: Standard install (`/usr/local`)

```bash
git clone https://github.com/<your-username>/autotiling-wl.git
cd autotiling-wl
meson setup build --prefix=/usr/local -Dcompat_symlink=true
ninja -C build
sudo ninja -C build install
```

> Pass `-Dcompat_symlink=true` if you want an `autotiling` symlink so existing Sway configs work without edits.

#### Option B: Build and install an RPM package (`/usr`)

```bash
git clone https://github.com/<your-username>/autotiling-wl.git
rpmdev-setuptree
tar --transform 's,^autotiling-wl,autotiling-wl-1.1.0,' -czf ~/rpmbuild/SOURCES/autotiling-wl-1.1.0.tar.gz autotiling-wl
cp autotiling-wl/packaging/fedora/autotiling-wl.spec ~/rpmbuild/SPECS/
rpmbuild -ba ~/rpmbuild/SPECS/autotiling-wl.spec
sudo dnf install -y ~/rpmbuild/RPMS/$(uname -m)/autotiling-wl-1.1.0-1.fc45.$(uname -m).rpm
```

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

### Systemd User Service (Optional)

> Note: `autotiling-wl.service` runs `/usr/bin/autotiling-wl` (the default path when installed via the RPM package or `--prefix=/usr`).

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
split_width = 0
split_height = 0
tabbed_on_min = false

[workspaces]
# 2 = master-stack
# 3 = tabbed

[float_rules]
rule = app_id:pavucontrol
rule = app_id:org.gnome.Calculator
rule = title:Picture-in-Picture
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
| `--tabbed-on-min` | Switch to `tabbed` when below min width/height | `false` |
| `--float-rule RULE` | Auto-float rule (`app_id:foo` or `title:bar`) | — |
| `--ws-layout WS:MODE` | Per-workspace mode (`dwindle`, `master-stack`, `tabbed`) | `dwindle` |
| `-e, --events EV...` | Sway IPC events to listen for | `window` |
| `--backend MODE` | Force backend (`auto`, `sway`, `river`, `wlroots`) | `auto` |

For full reference documentation, run:

```bash
man autotiling-wl
```

---

## License

GPL-3.0-or-later
