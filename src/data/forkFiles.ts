export interface ForkFile {
  path: string;
  language: 'c' | 'meson' | 'xml' | 'spec' | 'ini' | 'markdown' | 'troff' | 'shell' | 'debian' | 'html';
  category: 'Core' | 'Protocols' | 'Build' | 'Packaging' | 'Docs & Config';
  summary: string;
  content: string;
}

export const FORK_FILES: ForkFile[] = [
  {
    path: 'meson.build',
    language: 'meson',
    category: 'Build',
    summary: 'Meson build definition targeting Fedora 45, wayland-scanner, River layout, man page, and base config.',
    content: `project(
  'autotiling-wl',
  'c',
  version: '1.1.0',
  license: 'GPL-3.0-or-later',
  default_options: [
    'c_std=c17',
    'warning_level=2',
    'werror=false',
    'b_pie=true',
  ],
)

datadir_abs = get_option('prefix') / get_option('datadir')

add_project_arguments(
  '-D_POSIX_C_SOURCE=200809L',
  '-DAUTOTILING_VERSION="' + meson.project_version() + '"',
  '-DAUTOTILING_DATADIR="' + datadir_abs + '"',
  language: 'c',
)

wayland_client = dependency('wayland-client', version: '>=1.22.0')
wayland_protocols = dependency('wayland-protocols', version: '>=1.36')
json_c = dependency('json-c', version: '>=0.17')
wayland_scanner = find_program('wayland-scanner')

subdir('protocols')

sources = files(
  'src/main.c',
  'src/autotile.c',
  'src/config.c',
  'src/wayland_ctx.c',
  'src/sway_ipc.c',
  'src/river_layout.c',
  'src/sd_notify.c',
)

executable(
  'autotiling-wl',
  [sources, protocol_sources],
  include_directories: include_directories('protocols', 'src'),
  dependencies: [wayland_client, json_c],
  install: true,
)

if get_option('compat_symlink')
  install_symlink(
    'autotiling',
    pointing_to: 'autotiling-wl',
    install_dir: get_option('bindir'),
  )
endif

install_data(
  'share/autotiling-wl/config',
  install_dir: get_option('datadir') / 'autotiling-wl',
)

install_man('man/autotiling-wl.1')

install_data(
  'systemd/autotiling-wl.service',
  install_dir: get_option('prefix') / 'lib/systemd/user',
)
`,
  },
  {
    path: 'meson_options.txt',
    language: 'meson',
    category: 'Build',
    summary: 'Configurable Meson build options including Sway drop-in binary symlink.',
    content: `option(
  'compat_symlink',
  type: 'boolean',
  value: false,
  description: 'Install an autotiling -> autotiling-wl compatibility symlink in bindir',
)
`,
  },
  {
    path: 'protocols/meson.build',
    language: 'meson',
    category: 'Protocols',
    summary: 'Generates client headers and code for ext-workspace-v1, ext-foreign-toplevel-list-v1, xdg-output, wlr-foreign-toplevel, and river-layout-v3.',
    content: `fs = import('fs')
wl_protocols_dir = wayland_protocols.get_variable('pkgdatadir')

protocol_xmls = [
  wl_protocols_dir / 'staging/ext-workspace/ext-workspace-v1.xml',
  wl_protocols_dir / 'staging/ext-foreign-toplevel-list/ext-foreign-toplevel-list-v1.xml',
  wl_protocols_dir / 'unstable/xdg-output/xdg-output-unstable-v1.xml',
  meson.current_source_dir() / 'wlr-foreign-toplevel-management-unstable-v1.xml',
  meson.current_source_dir() / 'river-layout-v3.xml',
]

protocol_sources = []

foreach xml : protocol_xmls
  stem = fs.stem(xml)
  header = custom_target(
    stem + '-client-protocol.h',
    input: xml,
    output: stem + '-client-protocol.h',
    command: [wayland_scanner, 'client-header', '@INPUT@', '@OUTPUT@'],
  )
  code = custom_target(
    stem + '-protocol.c',
    input: xml,
    output: stem + '-protocol.c',
    command: [wayland_scanner, 'private-code', '@INPUT@', '@OUTPUT@'],
  )
  protocol_sources += [header, code]
endforeach
`,
  },
  {
    path: 'share/autotiling-wl/config',
    language: 'ini',
    category: 'Docs & Config',
    summary: 'Base configuration installed to $PREFIX/share/autotiling-wl/config and copied via --init-config.',
    content: `# autotiling-wl base configuration
# Installed to /usr/share/autotiling-wl/config (or /usr/local/share/autotiling-wl/config)
# Copy to ~/.config/autotiling-wl/config via: autotiling-wl --init-config

[general]
# Default mode is dwindle (limit = 0). Set limit = 2 for master-stack cap.
limit = 0
debug = false

# Dynamic orientation-aware split direction bias
split_ratio = 1.00
split_ratio_landscape = 1.00
split_ratio_portrait = 0.80

# Hyprland-style split sizing, placement, and master promotion
# mfact = 0.55 splits 55% / 45% (0.50 = equal halves)
mfact = 0.50
force_split = auto
new_status = slave

# Ultrawide single-window centering (e.g. 16:9 or 4:3; 0 disables)
single_window_aspect = 16:9

# Dynamic smart gaps (collapses inner/outer gaps when <= 1 tiled window)
smart_gaps = true
inner_gap = 10
outer_gap = 0

# Terminal window swallowing (hides foot/alacritty/kitty while child GUI runs)
enable_swallow = false
swallow_terminals = foot, alacritty, kitty

# Minimum container thresholds (pixels); set tabbed_on_min = true to switch
# tiny splits into tabbed containers instead of skipping.
split_width = 0
split_height = 0
tabbed_on_min = false

# Comma-separated filter lists (empty = all)
outputs =
workspaces =
events = window

[workspaces]
# Per-workspace layout modes: dwindle | master-stack | center-master | tabbed
# 1 = dwindle
# 2 = master-stack
# 3 = center-master
# 4 = tabbed

[float_rules]
# Substring rules with optional Hyprland-style actions after ->
# Supported actions: float, sticky, center, size W% H%, move X% Y%, opacity R, border none
rule = app_id:pavucontrol -> float, size 55% 65%, center
rule = app_id:org.gnome.Calculator -> float, center
rule = app_id:nm-connection-editor -> float, center
rule = title:Picture-in-Picture -> float, sticky, size 28% 28%, move 70% 68%
rule = title:Extension:
`,
  },
  {
    path: 'man/autotiling-wl.1',
    language: 'troff',
    category: 'Docs & Config',
    summary: 'Unix manual page installed to mandir/man1/autotiling-wl.1.',
    content: String.raw`.TH AUTOTILING-WL 1 "November 2026" "autotiling-wl 1.1.0" "User Commands"
.SH NAME
autotiling-wl \- Wayland-native dwindle and layout daemon for Sway, River, and wlroots
.SH SYNOPSIS
.B autotiling-wl
[\fIOPTIONS\fR]
.SH DESCRIPTION
.B autotiling-wl
is a C17 rebuild of \fBnwg-piotr/autotiling\fR targeting modern Wayland protocols
(\fBext-workspace-v1\fR, \fBext-foreign-toplevel-list-v1\fR,
\fBzwlr_foreign_toplevel_manager_v1\fR, \fBxdg-output-unstable-v1\fR, and
\fBriver-layout-v3\fR) while preserving 1:1 CLI and Sway IPC compatibility.
By default it runs in recursive \fBdwindle\fR mode (\fB--limit 0\fR).
.SH OPTIONS
.TP
.BR \-h ", " \-\-help
Show usage summary and exit.
.TP
.BR \-v ", " \-\-version
Print version information and exit.
.TP
.BR \-d ", " \-\-debug
Print Wayland registry, hotplug, and split decision logs to stderr.
.TP
.BR \-c ", " \-\-config " " \fIPATH\fR
Load configuration from \fIPATH\fR instead of \fI~/.config/autotiling-wl/config\fR.
.TP
.BR \-\-init\-config
Copy the base config from \fI$PREFIX/share/autotiling-wl/config\fR to
\fI$XDG_CONFIG_HOME/autotiling-wl/config\fR and exit.
.TP
.BR \-o ", " \-\-outputs " " \fIOUT...\fR
Restrict autotiling to listed Wayland output names (e.g. DP-1 HDMI-A-1).
.TP
.BR \-w ", " \-\-workspaces " " \fIWS...\fR
Restrict autotiling to listed workspace numbers or names.
.TP
.BR \-l ", " \-\-limit " " \fIN\fR
Cap container split nesting depth to \fIN\fR (0 = unlimited dwindle, 2 = master-stack).
.TP
.BR \-sw ", " \-\-splitwidth " " \fIPX\fR
Minimum container width threshold in pixels.
.TP
.BR \-sh ", " \-\-splitheight " " \fIPX\fR
Minimum container height threshold in pixels.
.TP
.BR \-sr ", " \-\-splitratio " " \fIR\fR
Height-to-width split ratio multiplier (default 1.0).
.TP
.BR \-\-splitratio\-portrait " " \fIR\fR
Override split ratio when active output height exceeds width.
.TP
.BR \-\-mfact " " \fIR\fR
Master/primary split size fraction between 0.10 and 0.90 (default 0.50; e.g. 0.60 for 60/40 splits).
.TP
.BR \-\-force\-split " " \fISIDE\fR
Placement side for new splits: \fBauto\fR, \fBleft\fR (prepend), or \fBright\fR (append).
.TP
.BR \-\-new\-status " " \fIMODE\fR
Where newly spawned windows appear in master layouts: \fBslave\fR or \fBmaster\fR (auto-promote).
.TP
.BR \-\-single\-window\-aspect " " \fIW:H\fR
Center a solo tiled window on ultrawide monitors to aspect ratio \fIW:H\fR (e.g. \fI16:9\fR, \fI0\fR disables).
.TP
.BR \-\-smart\-gaps
Collapse inner and outer gaps when a workspace has 1 or fewer tiled windows.
.TP
.BR \-\-inner\-gap " " \fIPX\fR
Inner gap size in pixels when multiple tiled windows are present (default 10).
.TP
.BR \-\-outer\-gap " " \fIPX\fR
Outer gap size in pixels when multiple tiled windows are present (default 0).
.TP
.BR \-\-swallow
Enable terminal window swallowing using \fI/proc/<pid>/stat\fR parent PID matching.
.TP
.BR \-\-swallow\-term " " \fILIST\fR
Comma-separated terminal \fIapp_id\fR list eligible for swallowing (default: \fIfoot,alacritty,kitty\fR).
.TP
.BR \-\-tabbed\-on\-min
Switch container layout to \fBtabbed\fR when below \fB--splitwidth\fR or \fB--splitheight\fR.
.TP
.BR \-\-float\-rule " " \fIRULE\fR
Add an auto-float/window rule (\fIapp_id:foo\fR or \fItitle:bar\fR, optionally followed by \fI-> float, sticky, size 55% 65%, center\fR). May be repeated.
.TP
.BR \-\-ws\-layout " " \fIWS:MODE\fR
Set per-workspace layout mode (\fIdwindle\fR, \fImaster-stack\fR, \fIcenter-master\fR, or \fItabbed\fR).
.TP
.BR \-e ", " \-\-events " " \fIEV...\fR
Sway IPC events to subscribe to (default: window).
.TP
.BR \-\-backend " " \fIMODE\fR
Select backend driver: \fBauto\fR, \fBsway\fR, \fBriver\fR, or \fBwlroots\fR.
.SH SIGNALS
.TP
.B SIGUSR1
Toggle pause/resume state of autotiling split actions without stopping the daemon.
.SH FILES
.TP
.I ~/.config/autotiling-wl/config
User configuration file.
.TP
.I /usr/share/autotiling-wl/config
System base configuration template.
.SH SEE ALSO
.BR sway (5),
.BR river (1)
`,
  },
  {
    path: 'src/autotile.h',
    language: 'c',
    category: 'Core',
    summary: 'Core configuration, auto-float rules, per-workspace modes, orientation split ratios, and split decision API.',
    content: `#ifndef AUTOTILING_WL_AUTOTILE_H
#define AUTOTILING_WL_AUTOTILE_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define MAX_FILTER_ITEMS 64
#define MAX_EVENT_ITEMS  16
#define MAX_FLOAT_RULES  64
#define MAX_WS_MODES     32

typedef enum {
  BACKEND_AUTO = 0,
  BACKEND_SWAY_IPC,
  BACKEND_RIVER,
  BACKEND_WLROOTS_NATIVE,
} AutotileBackend;

typedef enum {
  SPLIT_NONE = 0,
  SPLIT_HORIZONTAL,
  SPLIT_VERTICAL,
  SPLIT_TABBED_FALLBACK,
  SPLIT_FLOAT_ENABLE,
} SplitDirection;

typedef enum {
  WS_MODE_DWINDLE = 0,
  WS_MODE_MASTER_STACK,
  WS_MODE_CENTER_MASTER,
  WS_MODE_TABBED,
} WorkspaceLayoutMode;

typedef enum {
  FORCE_SPLIT_AUTO = 0,
  FORCE_SPLIT_LEFT,
  FORCE_SPLIT_RIGHT,
} ForceSplitSide;

typedef enum {
  NEW_STATUS_SLAVE = 0,
  NEW_STATUS_MASTER,
} NewWindowStatus;

typedef enum {
  FLOAT_MATCH_ANY = 0,
  FLOAT_MATCH_APP_ID,
  FLOAT_MATCH_TITLE,
} FloatMatchField;

typedef struct {
  FloatMatchField field;
  char pattern[128];
  bool enable_float;
  bool sticky;
  bool center;
  int size_w;
  int size_h;
  bool size_percent;
  int move_x;
  int move_y;
  bool move_percent;
  bool has_move;
  double opacity;
  char border_mode[32];
} AutoFloatRule;

typedef struct {
  int workspace_num;
  char workspace_name[64];
  WorkspaceLayoutMode mode;
} WorkspaceModeRule;

typedef struct {
  bool debug;
  bool paused;
  int limit;
  int split_width;
  int split_height;
  bool tabbed_on_min;
  double split_ratio;
  double split_ratio_landscape;
  double split_ratio_portrait;
  double mfact;
  ForceSplitSide force_split;
  NewWindowStatus new_status;
  double single_window_aspect;
  bool smart_gaps;
  int inner_gap;
  int outer_gap;
  bool enable_swallow;
  AutotileBackend backend;

  char *outputs[MAX_FILTER_ITEMS];
  size_t outputs_count;

  char *workspaces[MAX_FILTER_ITEMS];
  size_t workspaces_count;

  char *events[MAX_EVENT_ITEMS];
  size_t events_count;

  char *swallow_terminals[MAX_FILTER_ITEMS];
  size_t swallow_terminals_count;

  AutoFloatRule float_rules[MAX_FLOAT_RULES];
  size_t float_rules_count;

  WorkspaceModeRule ws_modes[MAX_WS_MODES];
  size_t ws_modes_count;

  const char *exec_splith;
  const char *exec_splitv;
} AutotileConfig;

typedef struct {
  int x;
  int y;
  int width;
  int height;
} ContainerRect;

typedef struct {
  int64_t id;
  int pid;
  ContainerRect rect;
  int output_width;
  int output_height;
  int ws_tiled_count;
  bool floating;
  bool fullscreen;
  bool parent_tabbed_or_stacked;
  char parent_layout[32];
  int depth;
  char output_name[64];
  char workspace_name[64];
  int workspace_num;
  char app_id[128];
  char title[256];
} FocusedContainer;

typedef struct {
  SplitDirection direction;
  const char *command;
  const char *skip_reason;
  char aux_command[512];
  int resize_pct;
  WorkspaceLayoutMode ws_mode;
} SplitDecision;

void autotile_config_init(AutotileConfig *cfg);
void autotile_config_free(AutotileConfig *cfg);
bool autotile_add_float_rule(AutotileConfig *cfg, const char *spec);
bool autotile_add_ws_mode(AutotileConfig *cfg, const char *spec);
void autotile_clear_swallow_terms(AutotileConfig *cfg);
bool autotile_add_swallow_term(AutotileConfig *cfg, const char *term);
bool autotile_is_swallow_terminal(const AutotileConfig *cfg, const char *app_id);
double autotile_parse_aspect(const char *spec);
WorkspaceLayoutMode autotile_resolve_ws_mode(
  const AutotileConfig *cfg,
  int ws_num,
  const char *ws_name
);

SplitDecision autotile_evaluate_split(
  const AutotileConfig *cfg,
  const FocusedContainer *focused
);

#endif /* AUTOTILING_WL_AUTOTILE_H */
`,
  },
  {
    path: 'src/autotile.c',
    language: 'c',
    category: 'Core',
    summary: 'Implements dwindle, center-master, mfact ratios, rich float actions, smart gaps, ultrawide aspect centering, and orientation split ratios.',
    content: `#include "autotile.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static char *trim_local(char *s) {
  while (*s && isspace((unsigned char)*s)) s++;
  size_t len = strlen(s);
  while (len > 0 && isspace((unsigned char)s[len - 1])) s[--len] = '\\0';
  return s;
}

void autotile_config_init(AutotileConfig *cfg) {
  memset(cfg, 0, sizeof(*cfg));
  cfg->debug = false;
  cfg->paused = false;
  cfg->limit = 0; /* 0 = recursive dwindle by default */
  cfg->split_width = 0;
  cfg->split_height = 0;
  cfg->tabbed_on_min = false;
  cfg->split_ratio = 1.0;
  cfg->split_ratio_landscape = 1.0;
  cfg->split_ratio_portrait = 0.80;
  cfg->mfact = 0.50;
  cfg->force_split = FORCE_SPLIT_AUTO;
  cfg->new_status = NEW_STATUS_SLAVE;
  cfg->single_window_aspect = 0.0;
  cfg->smart_gaps = false;
  cfg->inner_gap = 10;
  cfg->outer_gap = 0;
  cfg->enable_swallow = false;
  cfg->backend = BACKEND_AUTO;

  autotile_add_swallow_term(cfg, "foot");
  autotile_add_swallow_term(cfg, "alacritty");
  autotile_add_swallow_term(cfg, "kitty");
}

void autotile_clear_swallow_terms(AutotileConfig *cfg) {
  for (size_t i = 0; i < cfg->swallow_terminals_count; i++) {
    free(cfg->swallow_terminals[i]);
    cfg->swallow_terminals[i] = NULL;
  }
  cfg->swallow_terminals_count = 0;
}

bool autotile_add_swallow_term(AutotileConfig *cfg, const char *term) {
  if (!term || !*term || cfg->swallow_terminals_count >= MAX_FILTER_ITEMS) return false;
  cfg->swallow_terminals[cfg->swallow_terminals_count++] = strdup(term);
  return true;
}

bool autotile_is_swallow_terminal(const AutotileConfig *cfg, const char *app_id) {
  if (!app_id || !*app_id) return false;
  for (size_t i = 0; i < cfg->swallow_terminals_count; i++) {
    if (cfg->swallow_terminals[i] && strstr(app_id, cfg->swallow_terminals[i])) {
      return true;
    }
  }
  return false;
}

double autotile_parse_aspect(const char *spec) {
  if (!spec || !*spec || strcmp(spec, "0") == 0 || strcmp(spec, "off") == 0) return 0.0;
  const char *sep = strchr(spec, ':');
  if (!sep) sep = strchr(spec, ' ');
  if (sep) {
    double w = atof(spec);
    double h = atof(sep + 1);
    return (w > 0.0 && h > 0.0) ? (w / h) : 0.0;
  }
  double val = atof(spec);
  return val > 0.0 ? val : 0.0;
}

void autotile_config_free(AutotileConfig *cfg) {
  for (size_t i = 0; i < cfg->outputs_count; i++) free(cfg->outputs[i]);
  for (size_t i = 0; i < cfg->workspaces_count; i++) free(cfg->workspaces[i]);
  for (size_t i = 0; i < cfg->events_count; i++) free(cfg->events[i]);
  autotile_clear_swallow_terms(cfg);
}

static void parse_rule_actions(AutoFloatRule *rule, const char *actions) {
  char buf[256];
  snprintf(buf, sizeof(buf), "%s", actions);
  char *saveptr = NULL;
  for (char *tok = strtok_r(buf, ",", &saveptr); tok; tok = strtok_r(NULL, ",", &saveptr)) {
    char *a = trim_local(tok);
    if (strcmp(a, "float") == 0) {
      rule->enable_float = true;
    } else if (strcmp(a, "sticky") == 0) {
      rule->sticky = true;
    } else if (strcmp(a, "center") == 0) {
      rule->center = true;
    } else if (strncmp(a, "size ", 5) == 0) {
      char w_tok[32] = "", h_tok[32] = "";
      if (sscanf(a + 5, "%31s %31s", w_tok, h_tok) == 2) {
        rule->size_w = atoi(w_tok);
        rule->size_h = atoi(h_tok);
        rule->size_percent = (strchr(w_tok, '%') != NULL || strchr(h_tok, '%') != NULL);
      }
    } else if (strncmp(a, "move ", 5) == 0) {
      char x_tok[32] = "", y_tok[32] = "";
      if (sscanf(a + 5, "%31s %31s", x_tok, y_tok) == 2) {
        rule->move_x = atoi(x_tok);
        rule->move_y = atoi(y_tok);
        rule->move_percent = (strchr(x_tok, '%') != NULL || strchr(y_tok, '%') != NULL);
        rule->has_move = true;
      }
    } else if (strncmp(a, "opacity ", 8) == 0) {
      rule->opacity = atof(a + 8);
    } else if (strncmp(a, "border ", 7) == 0) {
      snprintf(rule->border_mode, sizeof(rule->border_mode), "%s", a);
    }
  }
}

bool autotile_add_float_rule(AutotileConfig *cfg, const char *spec) {
  if (!spec || !*spec || cfg->float_rules_count >= MAX_FLOAT_RULES) {
    return false;
  }
  AutoFloatRule *rule = &cfg->float_rules[cfg->float_rules_count++];
  memset(rule, 0, sizeof(*rule));
  rule->enable_float = true;

  char match_buf[160];
  const char *arrow = strstr(spec, "->");
  if (arrow) {
    size_t len = (size_t)(arrow - spec);
    if (len >= sizeof(match_buf)) len = sizeof(match_buf) - 1;
    memcpy(match_buf, spec, len);
    match_buf[len] = '\\0';
    parse_rule_actions(rule, arrow + 2);
  } else {
    snprintf(match_buf, sizeof(match_buf), "%s", spec);
  }

  char *trimmed = trim_local(match_buf);
  if (strncmp(trimmed, "app_id:", 7) == 0) {
    rule->field = FLOAT_MATCH_APP_ID;
    snprintf(rule->pattern, sizeof(rule->pattern), "%s", trimmed + 7);
  } else if (strncmp(trimmed, "title:", 6) == 0) {
    rule->field = FLOAT_MATCH_TITLE;
    snprintf(rule->pattern, sizeof(rule->pattern), "%s", trimmed + 6);
  } else {
    rule->field = FLOAT_MATCH_ANY;
    snprintf(rule->pattern, sizeof(rule->pattern), "%s", trimmed);
  }
  return true;
}

bool autotile_add_ws_mode(AutotileConfig *cfg, const char *spec) {
  if (!spec || cfg->ws_modes_count >= MAX_WS_MODES) {
    return false;
  }
  const char *colon = strchr(spec, ':');
  if (!colon) colon = strchr(spec, '=');
  if (!colon || colon == spec) return false;

  WorkspaceModeRule rule = {0};
  size_t ws_len = (size_t)(colon - spec);
  if (ws_len >= sizeof(rule.workspace_name)) ws_len = sizeof(rule.workspace_name) - 1;
  memcpy(rule.workspace_name, spec, ws_len);
  rule.workspace_num = atoi(rule.workspace_name);

  const char *mode_str = colon + 1;
  while (*mode_str == ' ') mode_str++;
  if (strcmp(mode_str, "master-stack") == 0) rule.mode = WS_MODE_MASTER_STACK;
  else if (strcmp(mode_str, "center-master") == 0) rule.mode = WS_MODE_CENTER_MASTER;
  else if (strcmp(mode_str, "tabbed") == 0) rule.mode = WS_MODE_TABBED;
  else rule.mode = WS_MODE_DWINDLE;

  cfg->ws_modes[cfg->ws_modes_count++] = rule;
  return true;
}

static bool match_output_filter(const AutotileConfig *cfg, const char *output_name) {
  if (cfg->outputs_count == 0) return true;
  for (size_t i = 0; i < cfg->outputs_count; i++) {
    if (strcmp(cfg->outputs[i], output_name) == 0) return true;
  }
  return false;
}

static bool match_workspace_filter(
  const AutotileConfig *cfg,
  int workspace_num,
  const char *workspace_name
) {
  if (cfg->workspaces_count == 0) return true;
  char num_buf[32];
  snprintf(num_buf, sizeof(num_buf), "%d", workspace_num);
  for (size_t i = 0; i < cfg->workspaces_count; i++) {
    if (strcmp(cfg->workspaces[i], num_buf) == 0 ||
        (workspace_name && strcmp(cfg->workspaces[i], workspace_name) == 0)) {
      return true;
    }
  }
  return false;
}

static const AutoFloatRule *match_float_rules(
  const AutotileConfig *cfg,
  const FocusedContainer *focused
) {
  for (size_t i = 0; i < cfg->float_rules_count; i++) {
    const AutoFloatRule *r = &cfg->float_rules[i];
    if (!r->pattern[0]) continue;
    if (r->field == FLOAT_MATCH_APP_ID && strstr(focused->app_id, r->pattern)) return r;
    if (r->field == FLOAT_MATCH_TITLE && strstr(focused->title, r->pattern)) return r;
    if (r->field == FLOAT_MATCH_ANY &&
        (strstr(focused->app_id, r->pattern) || strstr(focused->title, r->pattern))) {
      return r;
    }
  }
  return NULL;
}

WorkspaceLayoutMode autotile_resolve_ws_mode(
  const AutotileConfig *cfg,
  int ws_num,
  const char *ws_name
) {
  for (size_t i = 0; i < cfg->ws_modes_count; i++) {
    const WorkspaceModeRule *r = &cfg->ws_modes[i];
    if ((r->workspace_num > 0 && r->workspace_num == ws_num) ||
        (ws_name && strcmp(r->workspace_name, ws_name) == 0)) {
      return r->mode;
    }
  }
  return WS_MODE_DWINDLE;
}

static void append_cmd(char *dst, size_t dst_sz, const char *frag) {
  if (!frag || !*frag) return;
  size_t cur = strlen(dst);
  if (cur > 0 && cur + 2 < dst_sz) {
    strncat(dst, "; ", dst_sz - cur - 1);
    cur = strlen(dst);
  }
  if (cur + 1 < dst_sz) {
    strncat(dst, frag, dst_sz - cur - 1);
  }
}

static void build_float_rule_cmd(const AutoFloatRule *r, char *out, size_t out_sz) {
  char seg[128];
  out[0] = '\\0';
  if (r->enable_float) append_cmd(out, out_sz, "floating enable");
  if (r->size_w > 0 && r->size_h > 0) {
    if (r->size_percent) {
      snprintf(seg, sizeof(seg), "resize set %d ppt %d ppt", r->size_w, r->size_h);
    } else {
      snprintf(seg, sizeof(seg), "resize set %d px %d px", r->size_w, r->size_h);
    }
    append_cmd(out, out_sz, seg);
  }
  if (r->center) {
    append_cmd(out, out_sz, "move position center");
  } else if (r->has_move) {
    if (r->move_percent) {
      snprintf(seg, sizeof(seg), "move position %d ppt %d ppt", r->move_x, r->move_y);
    } else {
      snprintf(seg, sizeof(seg), "move position %d px %d px", r->move_x, r->move_y);
    }
    append_cmd(out, out_sz, seg);
  }
  if (r->sticky) append_cmd(out, out_sz, "sticky enable");
  if (r->opacity > 0.05 && r->opacity <= 1.0) {
    snprintf(seg, sizeof(seg), "opacity %.2f", r->opacity);
    append_cmd(out, out_sz, seg);
  }
  if (r->border_mode[0]) append_cmd(out, out_sz, r->border_mode);
}

static void append_gap_and_aspect_cmds(
  const AutotileConfig *cfg,
  const FocusedContainer *focused,
  WorkspaceLayoutMode ws_mode,
  char *aux,
  size_t aux_sz
) {
  char seg[128];
  int tiled = focused->ws_tiled_count;
  if (cfg->smart_gaps) {
    if (tiled <= 1 || ws_mode == WS_MODE_TABBED) {
      append_cmd(aux, aux_sz, "gaps inner current set 0; gaps outer current set 0");
    } else {
      snprintf(seg, sizeof(seg), "gaps inner current set %d; gaps outer current set %d",
               cfg->inner_gap, cfg->outer_gap);
      append_cmd(aux, aux_sz, seg);
    }
  }

  if (cfg->single_window_aspect > 0.0 && focused->output_width > 0 && focused->output_height > 0) {
    double out_aspect = (double)focused->output_width / (double)focused->output_height;
    if (tiled == 1 && out_aspect > cfg->single_window_aspect + 0.15) {
      int target_w = (int)((double)focused->output_height * cfg->single_window_aspect + 0.5);
      int horiz_gap = (focused->output_width - target_w) / 2;
      if (horiz_gap > 0) {
        snprintf(seg, sizeof(seg), "gaps horizontal current set %d", horiz_gap);
        append_cmd(aux, aux_sz, seg);
      }
    } else if (tiled > 1) {
      snprintf(seg, sizeof(seg), "gaps horizontal current set %d",
               cfg->smart_gaps ? cfg->outer_gap : 0);
      append_cmd(aux, aux_sz, seg);
    }
  }
}

SplitDecision autotile_evaluate_split(
  const AutotileConfig *cfg,
  const FocusedContainer *focused
) {
  SplitDecision decision = {
    .direction = SPLIT_NONE,
    .command = NULL,
    .skip_reason = NULL,
    .aux_command = "",
    .resize_pct = 0,
    .ws_mode = WS_MODE_DWINDLE,
  };

  if (cfg->paused) {
    decision.skip_reason = "autotiling paused via SIGUSR1";
    return decision;
  }

  if (!focused) {
    decision.skip_reason = "no focused container";
    return decision;
  }

  WorkspaceLayoutMode ws_mode = autotile_resolve_ws_mode(
    cfg, focused->workspace_num, focused->workspace_name);
  decision.ws_mode = ws_mode;

  const AutoFloatRule *matched_rule = match_float_rules(cfg, focused);
  if (!focused->floating && matched_rule) {
    decision.direction = SPLIT_FLOAT_ENABLE;
    decision.command = "floating enable";
    build_float_rule_cmd(matched_rule, decision.aux_command, sizeof(decision.aux_command));
    return decision;
  }

  if (focused->floating) {
    decision.skip_reason = "focused container is floating";
    return decision;
  }

  if (focused->fullscreen) {
    decision.skip_reason = "focused container is fullscreen";
    return decision;
  }

  if (!match_output_filter(cfg, focused->output_name)) {
    decision.skip_reason = "output filtered out by --outputs";
    return decision;
  }

  if (!match_workspace_filter(cfg, focused->workspace_num, focused->workspace_name)) {
    decision.skip_reason = "workspace filtered out by --workspaces";
    return decision;
  }

  append_gap_and_aspect_cmds(
    cfg, focused, ws_mode, decision.aux_command, sizeof(decision.aux_command));

  if (ws_mode == WS_MODE_TABBED) {
    if (strcmp(focused->parent_layout, "tabbed") != 0) {
      decision.direction = SPLIT_TABBED_FALLBACK;
      decision.command = "layout tabbed";
    } else {
      decision.skip_reason = "workspace mode is tabbed";
    }
    return decision;
  }

  if (focused->parent_tabbed_or_stacked) {
    decision.skip_reason = "parent layout is tabbed or stacked";
    return decision;
  }

  int effective_limit = cfg->limit;
  if ((ws_mode == WS_MODE_MASTER_STACK || ws_mode == WS_MODE_CENTER_MASTER) &&
      (effective_limit == 0 || effective_limit > 2)) {
    effective_limit = 2;
  }

  if (effective_limit > 0 && focused->depth >= effective_limit) {
    decision.skip_reason = "container depth reached limit";
    return decision;
  }

  bool below_min_w = cfg->split_width > 0 && focused->rect.width < cfg->split_width;
  bool below_min_h = cfg->split_height > 0 && focused->rect.height < cfg->split_height;
  if (below_min_w || below_min_h) {
    if (cfg->tabbed_on_min) {
      decision.direction = SPLIT_TABBED_FALLBACK;
      decision.command = "layout tabbed";
    } else {
      decision.skip_reason = below_min_w
        ? "container width below --splitwidth"
        : "container height below --splitheight";
    }
    return decision;
  }

  double diff = cfg->mfact - 0.50;
  if (diff < 0.0) diff = -diff;
  if (cfg->mfact > 0.1 && cfg->mfact < 0.9 && diff > 0.01) {
    decision.resize_pct = (int)(cfg->mfact * 100.0 + 0.5);
  }

  double ratio = cfg->split_ratio > 0.0 ? cfg->split_ratio : 1.0;
  if (focused->output_height > focused->output_width && cfg->split_ratio_portrait > 0.0) {
    ratio = cfg->split_ratio_portrait;
  } else if (focused->output_width >= focused->output_height && cfg->split_ratio_landscape > 0.0) {
    ratio = cfg->split_ratio_landscape;
  }

  double scaled_width = (double)focused->rect.width / ratio;
  if ((double)focused->rect.height > scaled_width) {
    decision.direction = SPLIT_VERTICAL;
    decision.command = "splitv";
  } else {
    decision.direction = SPLIT_HORIZONTAL;
    decision.command = "splith";
  }

  return decision;
}
`,
  },
  {
    path: 'src/config.h',
    language: 'c',
    category: 'Core',
    summary: 'XDG config parser and --init-config template installer.',
    content: `#ifndef AUTOTILING_WL_CONFIG_H
#define AUTOTILING_WL_CONFIG_H

#include "autotile.h"
#include <stdbool.h>

bool autotile_config_load_default(AutotileConfig *cfg, const char *override_path);
bool autotile_config_init_user_file(void);

#endif /* AUTOTILING_WL_CONFIG_H */
`,
  },
  {
    path: 'src/config.c',
    language: 'c',
    category: 'Core',
    summary: 'Parses ~/.config/autotiling-wl/config or DATADIR base config and implements --init-config.',
    content: `#include "config.h"

#include <ctype.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>

#ifndef AUTOTILING_DATADIR
#define AUTOTILING_DATADIR "/usr/local/share"
#endif

static char *trim_ws(char *s) {
  while (*s && isspace((unsigned char)*s)) s++;
  size_t len = strlen(s);
  while (len > 0 && isspace((unsigned char)s[len - 1])) {
    s[--len] = '\\0';
  }
  return s;
}

static void split_csv(const char *val, char **dest, size_t *count, size_t max) {
  if (!val || !*val) return;
  char *dup = strdup(val);
  if (!dup) return;
  char *tok = strtok(dup, ", ");
  while (tok && *count < max) {
    if (*tok) dest[(*count)++] = strdup(tok);
    tok = strtok(NULL, ", ");
  }
  free(dup);
}

static bool parse_config_file(AutotileConfig *cfg, const char *path) {
  FILE *fp = fopen(path, "r");
  if (!fp) return false;

  char section[64] = "";
  char line[512];
  while (fgets(line, sizeof(line), fp)) {
    char *s = trim_ws(line);
    if (!*s || *s == '#' || *s == ';') continue;

    if (*s == '[') {
      char *end = strchr(s, ']');
      if (end) {
        *end = '\\0';
        snprintf(section, sizeof(section), "%s", s + 1);
      }
      continue;
    }

    char *eq = strchr(s, '=');
    if (!eq) continue;
    *eq = '\\0';
    char *key = trim_ws(s);
    char *val = trim_ws(eq + 1);

    if (strcmp(section, "general") == 0) {
      if (strcmp(key, "limit") == 0) cfg->limit = atoi(val);
      else if (strcmp(key, "debug") == 0) cfg->debug = (strcmp(val, "true") == 0);
      else if (strcmp(key, "split_ratio") == 0) cfg->split_ratio = atof(val);
      else if (strcmp(key, "split_ratio_landscape") == 0) cfg->split_ratio_landscape = atof(val);
      else if (strcmp(key, "split_ratio_portrait") == 0) cfg->split_ratio_portrait = atof(val);
      else if (strcmp(key, "mfact") == 0) cfg->mfact = atof(val);
      else if (strcmp(key, "force_split") == 0) {
        if (strcmp(val, "left") == 0) cfg->force_split = FORCE_SPLIT_LEFT;
        else if (strcmp(val, "right") == 0) cfg->force_split = FORCE_SPLIT_RIGHT;
        else cfg->force_split = FORCE_SPLIT_AUTO;
      } else if (strcmp(key, "new_status") == 0) {
        cfg->new_status = (strcmp(val, "master") == 0) ? NEW_STATUS_MASTER : NEW_STATUS_SLAVE;
      } else if (strcmp(key, "single_window_aspect") == 0) {
        cfg->single_window_aspect = autotile_parse_aspect(val);
      } else if (strcmp(key, "smart_gaps") == 0) {
        cfg->smart_gaps = (strcmp(val, "true") == 0);
      } else if (strcmp(key, "inner_gap") == 0) cfg->inner_gap = atoi(val);
      else if (strcmp(key, "outer_gap") == 0) cfg->outer_gap = atoi(val);
      else if (strcmp(key, "enable_swallow") == 0) cfg->enable_swallow = (strcmp(val, "true") == 0);
      else if (strcmp(key, "swallow_terminals") == 0) {
        autotile_clear_swallow_terms(cfg);
        split_csv(val, cfg->swallow_terminals, &cfg->swallow_terminals_count, MAX_FILTER_ITEMS);
      } else if (strcmp(key, "split_width") == 0) cfg->split_width = atoi(val);
      else if (strcmp(key, "split_height") == 0) cfg->split_height = atoi(val);
      else if (strcmp(key, "tabbed_on_min") == 0) cfg->tabbed_on_min = (strcmp(val, "true") == 0);
      else if (strcmp(key, "outputs") == 0) split_csv(val, cfg->outputs, &cfg->outputs_count, MAX_FILTER_ITEMS);
      else if (strcmp(key, "workspaces") == 0) split_csv(val, cfg->workspaces, &cfg->workspaces_count, MAX_FILTER_ITEMS);
      else if (strcmp(key, "events") == 0) split_csv(val, cfg->events, &cfg->events_count, MAX_EVENT_ITEMS);
    } else if (strcmp(section, "workspaces") == 0) {
      char spec[128];
      snprintf(spec, sizeof(spec), "%s:%s", key, val);
      autotile_add_ws_mode(cfg, spec);
    } else if (strcmp(section, "float_rules") == 0 && strcmp(key, "rule") == 0) {
      autotile_add_float_rule(cfg, val);
    }
  }

  fclose(fp);
  return true;
}

static bool resolve_user_config_path(char *out, size_t out_len) {
  const char *xdg = getenv("XDG_CONFIG_HOME");
  if (xdg && *xdg) {
    snprintf(out, out_len, "%s/autotiling-wl/config", xdg);
    return true;
  }
  const char *home = getenv("HOME");
  if (home && *home) {
    snprintf(out, out_len, "%s/.config/autotiling-wl/config", home);
    return true;
  }
  return false;
}

bool autotile_config_load_default(AutotileConfig *cfg, const char *override_path) {
  if (override_path) {
    return parse_config_file(cfg, override_path);
  }
  char user_path[512];
  if (resolve_user_config_path(user_path, sizeof(user_path)) &&
      parse_config_file(cfg, user_path)) {
    return true;
  }
  char sys_path[512];
  snprintf(sys_path, sizeof(sys_path), "%s/autotiling-wl/config", AUTOTILING_DATADIR);
  return parse_config_file(cfg, sys_path);
}

bool autotile_config_init_user_file(void) {
  char user_path[512];
  if (!resolve_user_config_path(user_path, sizeof(user_path))) {
    fprintf(stderr, "error: HOME or XDG_CONFIG_HOME not set\\n");
    return false;
  }

  char dir_path[512];
  snprintf(dir_path, sizeof(dir_path), "%s", user_path);
  char *slash = strrchr(dir_path, '/');
  if (slash) {
    *slash = '\\0';
    mkdir(dir_path, 0755);
  }

  char sys_path[512];
  snprintf(sys_path, sizeof(sys_path), "%s/autotiling-wl/config", AUTOTILING_DATADIR);
  FILE *src = fopen(sys_path, "r");
  if (!src) {
    fprintf(stderr, "error: base config not found at %s (%s)\\n", sys_path, strerror(errno));
    return false;
  }

  FILE *dst = fopen(user_path, "w");
  if (!dst) {
    fclose(src);
    fprintf(stderr, "error: cannot write %s (%s)\\n", user_path, strerror(errno));
    return false;
  }

  char buf[4096];
  size_t n;
  while ((n = fread(buf, 1, sizeof(buf), src)) > 0) {
    fwrite(buf, 1, n, dst);
  }
  fclose(src);
  fclose(dst);
  printf("Initialized user config at %s\\n", user_path);
  return true;
}
`,
  },
  {
    path: 'src/sd_notify.h',
    language: 'c',
    category: 'Core',
    summary: 'Zero-dependency POSIX $NOTIFY_SOCKET sd_notify client header.',
    content: `#ifndef AUTOTILING_WL_SD_NOTIFY_H
#define AUTOTILING_WL_SD_NOTIFY_H

#include <stdint.h>

void sd_notify_ready(const char *status);
void sd_notify_watchdog(void);
void sd_notify_status(const char *status);
void sd_notify_stopping(void);
int sd_watchdog_interval_ms(void);

#endif /* AUTOTILING_WL_SD_NOTIFY_H */
`,
  },
  {
    path: 'src/sd_notify.c',
    language: 'c',
    category: 'Core',
    summary: 'Native $NOTIFY_SOCKET datagram client sending READY=1, WATCHDOG=1, and STATUS= to systemd.',
    content: `#include "sd_notify.h"

#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>

static void send_notify_msg(const char *msg) {
  const char *sock_path = getenv("NOTIFY_SOCKET");
  if (!sock_path || !*sock_path || !msg) return;

  int fd = socket(AF_UNIX, SOCK_DGRAM | SOCK_CLOEXEC, 0);
  if (fd < 0) return;

  struct sockaddr_un addr = {0};
  addr.sun_family = AF_UNIX;
  socklen_t addr_len;

  if (sock_path[0] == '@') {
    size_t len = strlen(sock_path);
    if (len >= sizeof(addr.sun_path)) {
      close(fd);
      return;
    }
    memcpy(addr.sun_path, sock_path, len);
    addr.sun_path[0] = '\\0';
    addr_len = (socklen_t)(offsetof(struct sockaddr_un, sun_path) + len);
  } else {
    snprintf(addr.sun_path, sizeof(addr.sun_path), "%s", sock_path);
    addr_len = (socklen_t)(offsetof(struct sockaddr_un, sun_path) + strlen(addr.sun_path));
  }

  (void)sendto(fd, msg, strlen(msg), MSG_NOSIGNAL, (struct sockaddr *)&addr, addr_len);
  close(fd);
}

void sd_notify_ready(const char *status) {
  char buf[256];
  snprintf(buf, sizeof(buf), "READY=1\\nSTATUS=%s", status ? status : "Running");
  send_notify_msg(buf);
}

void sd_notify_watchdog(void) {
  send_notify_msg("WATCHDOG=1");
}

void sd_notify_status(const char *status) {
  char buf[256];
  snprintf(buf, sizeof(buf), "STATUS=%s", status ? status : "");
  send_notify_msg(buf);
}

void sd_notify_stopping(void) {
  send_notify_msg("STOPPING=1\\nSTATUS=Shutting down");
}

int sd_watchdog_interval_ms(void) {
  const char *usec_env = getenv("WATCHDOG_USEC");
  if (!usec_env || !*usec_env) return -1;
  long long usec = atoll(usec_env);
  if (usec <= 0) return -1;
  /* Ping at half the configured systemd WatchdogSec interval */
  int half_ms = (int)(usec / 2000LL);
  return half_ms > 500 ? half_ms : 500;
}
`,
  },
  {
    path: 'src/river_layout.h',
    language: 'c',
    category: 'Core',
    summary: 'River compositor river-layout-v3 layout generator header.',
    content: `#ifndef AUTOTILING_WL_RIVER_LAYOUT_H
#define AUTOTILING_WL_RIVER_LAYOUT_H

#include "autotile.h"
#include <stdbool.h>
#include <stdint.h>

struct river_layout_manager_v3;
struct wl_output;

typedef struct {
  struct river_layout_manager_v3 *manager;
  const AutotileConfig *cfg;
  bool active;
} RiverLayoutDriver;

void river_layout_attach_output(
  RiverLayoutDriver *driver,
  struct wl_output *output,
  const char *output_name
);

#endif /* AUTOTILING_WL_RIVER_LAYOUT_H */
`,
  },
  {
    path: 'src/river_layout.c',
    language: 'c',
    category: 'Core',
    summary: 'Implements river_layout_v3 layout_demand computing recursive dwindle and master-stack rects natively for River.',
    content: `#include "river_layout.h"
#include "river-layout-v3-client-protocol.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
  const RiverLayoutDriver *driver;
  struct river_layout_v3 *layout;
  char output_name[64];
} RiverOutputLayout;

static void push_dwindle_rect(
  struct river_layout_v3 *layout,
  uint32_t serial,
  int x, int y, int w, int h,
  uint32_t count,
  double split_ratio,
  double mfact,
  int gap,
  ForceSplitSide force_split,
  int limit,
  int depth
) {
  if (count == 0) return;
  if (count == 1) {
    river_layout_v3_push_view_dimensions(layout, x, y, w, h, serial);
    return;
  }

  bool at_limit = (limit > 0 && depth >= limit);
  double ratio = split_ratio > 0.0 ? split_ratio : 1.0;
  double mf = (mfact > 0.1 && mfact < 0.9) ? mfact : 0.50;
  bool horizontal = ((double)h <= ((double)w / ratio));

  if (at_limit) {
    int total_gap = gap * (int)(count - 1);
    int slice_h = (h - total_gap) / (int)count;
    for (uint32_t i = 0; i < count; i++) {
      int ch = (i == count - 1) ? (h - (slice_h + gap) * (int)i) : slice_h;
      river_layout_v3_push_view_dimensions(
        layout, x, y + (slice_h + gap) * (int)i, w, ch > 40 ? ch : 40, serial);
    }
    return;
  }

  if (horizontal) {
    int avail_w = w - gap;
    int primary_w = (int)((double)avail_w * mf);
    int secondary_w = avail_w - primary_w;
    if (force_split == FORCE_SPLIT_LEFT) {
      river_layout_v3_push_view_dimensions(layout, x + secondary_w + gap, y, primary_w, h, serial);
      push_dwindle_rect(layout, serial, x, y, secondary_w, h,
                        count - 1, split_ratio, mf, gap, force_split, limit, depth + 1);
    } else {
      river_layout_v3_push_view_dimensions(layout, x, y, primary_w, h, serial);
      push_dwindle_rect(layout, serial, x + primary_w + gap, y, secondary_w, h,
                        count - 1, split_ratio, mf, gap, force_split, limit, depth + 1);
    }
  } else {
    int avail_h = h - gap;
    int primary_h = (int)((double)avail_h * mf);
    int secondary_h = avail_h - primary_h;
    if (force_split == FORCE_SPLIT_LEFT) {
      river_layout_v3_push_view_dimensions(layout, x, y + secondary_h + gap, w, primary_h, serial);
      push_dwindle_rect(layout, serial, x, y, w, secondary_h,
                        count - 1, split_ratio, mf, gap, force_split, limit, depth + 1);
    } else {
      river_layout_v3_push_view_dimensions(layout, x, y, w, primary_h, serial);
      push_dwindle_rect(layout, serial, x, y + primary_h + gap, w, secondary_h,
                        count - 1, split_ratio, mf, gap, force_split, limit, depth + 1);
    }
  }
}

static void push_center_master_rects(
  struct river_layout_v3 *layout,
  uint32_t serial,
  int x, int y, int w, int h,
  uint32_t count,
  double mfact,
  int gap
) {
  if (count == 0) return;
  if (count == 1) {
    river_layout_v3_push_view_dimensions(layout, x, y, w, h, serial);
    return;
  }
  double mf = (mfact > 0.1 && mfact < 0.9) ? mfact : 0.50;
  if (count == 2) {
    int mw = (int)((double)(w - gap) * mf);
    river_layout_v3_push_view_dimensions(layout, x, y, mw, h, serial);
    river_layout_v3_push_view_dimensions(layout, x + mw + gap, y, w - mw - gap, h, serial);
    return;
  }

  int mw = (int)((double)(w - gap * 2) * mf);
  int side_total = w - mw - gap * 2;
  int left_w = side_total / 2;
  int right_w = side_total - left_w;
  int master_x = x + left_w + gap;
  int right_x = master_x + mw + gap;

  river_layout_v3_push_view_dimensions(layout, master_x, y, mw, h, serial);

  uint32_t left_count = (count - 1 + 1) / 2;
  uint32_t right_count = (count - 1) - left_count;

  int lh = (h - gap * (int)(left_count - 1)) / (int)left_count;
  int ry_step = right_count > 0 ? (h - gap * (int)(right_count - 1)) / (int)right_count : h;

  uint32_t li = 0, ri = 0;
  for (uint32_t i = 1; i < count; i++) {
    if (i % 2 == 1) {
      int ch = (li == left_count - 1) ? (h - (lh + gap) * (int)li) : lh;
      river_layout_v3_push_view_dimensions(layout, x, y + (lh + gap) * (int)li, left_w, ch, serial);
      li++;
    } else {
      int ch = (ri == right_count - 1) ? (h - (ry_step + gap) * (int)ri) : ry_step;
      river_layout_v3_push_view_dimensions(
        layout, right_x, y + (ry_step + gap) * (int)ri, right_w, ch, serial);
      ri++;
    }
  }
}

static void river_layout_demand(
  void *data,
  struct river_layout_v3 *layout,
  uint32_t view_count,
  uint32_t usable_width,
  uint32_t usable_height,
  uint32_t tags,
  uint32_t serial
) {
  (void)tags;
  RiverOutputLayout *out = data;
  const AutotileConfig *cfg = out->driver->cfg;

  if (cfg->paused) {
    river_layout_v3_commit(layout, "autotiling-wl (paused)", serial);
    return;
  }

  int igap = (cfg->smart_gaps && view_count <= 1) ? 0 : cfg->inner_gap;
  int ogap = (cfg->smart_gaps && view_count <= 1) ? 0 : cfg->outer_gap;

  int x0 = ogap;
  int y0 = ogap;
  int w0 = (int)usable_width - ogap * 2;
  int h0 = (int)usable_height - ogap * 2;
  if (w0 < 100) w0 = (int)usable_width;
  if (h0 < 100) h0 = (int)usable_height;

  if (view_count == 1 && cfg->single_window_aspect > 0.0 && usable_height > 0) {
    double out_aspect = (double)usable_width / (double)usable_height;
    if (out_aspect > cfg->single_window_aspect + 0.15) {
      int target_w = (int)((double)usable_height * cfg->single_window_aspect);
      if (target_w > 0 && target_w < (int)usable_width) {
        x0 = ((int)usable_width - target_w) / 2;
        w0 = target_w;
      }
    }
  }

  double ratio = cfg->split_ratio > 0.0 ? cfg->split_ratio : 1.0;
  if (usable_height > usable_width && cfg->split_ratio_portrait > 0.0) {
    ratio = cfg->split_ratio_portrait;
  } else if (usable_width >= usable_height && cfg->split_ratio_landscape > 0.0) {
    ratio = cfg->split_ratio_landscape;
  }

  WorkspaceLayoutMode mode = autotile_resolve_ws_mode(cfg, 1, "1");
  if (mode == WS_MODE_CENTER_MASTER) {
    push_center_master_rects(layout, serial, x0, y0, w0, h0, view_count, cfg->mfact, igap);
    river_layout_v3_commit(layout, "autotiling-wl (center-master)", serial);
    return;
  }

  push_dwindle_rect(layout, serial, x0, y0, w0, h0,
                    view_count, ratio, cfg->mfact, igap, cfg->force_split, cfg->limit, 1);

  const char *name = (cfg->limit == 2 || mode == WS_MODE_MASTER_STACK)
    ? "autotiling-wl (master-stack)"
    : "autotiling-wl (dwindle)";
  river_layout_v3_commit(layout, name, serial);
}

static void river_namespace_in_use(void *data, struct river_layout_v3 *layout) {
  (void)layout;
  RiverOutputLayout *out = data;
  fprintf(stderr, "[river] namespace autotiling-wl already in use on %s\\n", out->output_name);
}

static void river_user_command(void *data, struct river_layout_v3 *layout, const char *command) {
  (void)data;
  (void)layout;
  (void)command;
}

static const struct river_layout_v3_listener river_layout_listener = {
  .namespace_in_use = river_namespace_in_use,
  .layout_demand = river_layout_demand,
  .user_command = river_user_command,
};

void river_layout_attach_output(
  RiverLayoutDriver *driver,
  struct wl_output *output,
  const char *output_name
) {
  if (!driver->manager || !output) return;
  RiverOutputLayout *out = calloc(1, sizeof(*out));
  if (!out) return;
  out->driver = driver;
  snprintf(out->output_name, sizeof(out->output_name), "%s", output_name ? output_name : "output");
  out->layout = river_layout_manager_v3_get_layout(driver->manager, output, "autotiling-wl");
  river_layout_v3_add_listener(out->layout, &river_layout_listener, out);
  driver->active = true;
}
`,
  },
  {
    path: 'src/wayland_ctx.h',
    language: 'c',
    category: 'Core',
    summary: 'Wayland registry context with live wl_output hotplug tracking and river_layout_manager_v3 binding.',
    content: `#ifndef AUTOTILING_WL_WAYLAND_CTX_H
#define AUTOTILING_WL_WAYLAND_CTX_H

#include "river_layout.h"
#include <stdbool.h>
#include <stdint.h>
#include <wayland-client.h>

#define MAX_OUTPUTS    16
#define MAX_WORKSPACES 64
#define MAX_TOPLEVELS  256

typedef struct {
  uint32_t global_name;
  struct wl_output *wl_output;
  struct zxdg_output_v1 *xdg_output;
  char name[64];
  int32_t x;
  int32_t y;
  int32_t width;
  int32_t height;
  bool active;
  bool river_attached;
} WlOutputInfo;

typedef struct {
  struct ext_workspace_handle_v1 *handle;
  char id[64];
  char name[64];
  uint32_t state;
  bool active;
} WlWorkspaceInfo;

typedef struct {
  void *handle;
  char app_id[128];
  char title[256];
  bool activated;
  bool fullscreen;
  bool minimized;
} WlToplevelInfo;

typedef struct {
  struct wl_display *display;
  struct wl_registry *registry;
  struct zxdg_output_manager_v1 *xdg_output_mgr;
  struct ext_workspace_manager_v1 *ext_workspace_mgr;
  struct ext_foreign_toplevel_list_v1 *ext_toplevel_list;
  struct zwlr_foreign_toplevel_manager_v1 *wlr_toplevel_mgr;
  RiverLayoutDriver river;

  WlOutputInfo outputs[MAX_OUTPUTS];
  size_t outputs_count;

  WlWorkspaceInfo workspaces[MAX_WORKSPACES];
  size_t workspaces_count;

  WlToplevelInfo toplevels[MAX_TOPLEVELS];
  size_t toplevels_count;

  bool dirty_event;
  bool hotplug_event;
  bool debug;
} WaylandContext;

bool wayland_ctx_init(WaylandContext *ctx, const AutotileConfig *cfg, bool debug);
void wayland_ctx_destroy(WaylandContext *ctx);
int wayland_ctx_get_fd(const WaylandContext *ctx);
bool wayland_ctx_dispatch(WaylandContext *ctx);
const char *wayland_ctx_active_workspace(const WaylandContext *ctx);
const WlOutputInfo *wayland_ctx_active_output(const WaylandContext *ctx);

#endif /* AUTOTILING_WL_WAYLAND_CTX_H */
`,
  },
  {
    path: 'src/wayland_ctx.c',
    language: 'c',
    category: 'Core',
    summary: 'Wayland registry listener binding ext-workspace-v1, wlr-foreign-toplevel, xdg-output, river-layout-v3, and hotplug wl_output events.',
    content: `#include "wayland_ctx.h"

#include "ext-foreign-toplevel-list-v1-client-protocol.h"
#include "ext-workspace-v1-client-protocol.h"
#include "river-layout-v3-client-protocol.h"
#include "wlr-foreign-toplevel-management-unstable-v1-client-protocol.h"
#include "xdg-output-unstable-v1-client-protocol.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void xdg_output_logical_position(void *data, struct zxdg_output_v1 *xdg_output,
                                        int32_t x, int32_t y) {
  (void)xdg_output;
  WlOutputInfo *out = data;
  out->x = x;
  out->y = y;
}

static void xdg_output_logical_size(void *data, struct zxdg_output_v1 *xdg_output,
                                    int32_t width, int32_t height) {
  (void)xdg_output;
  WlOutputInfo *out = data;
  out->width = width;
  out->height = height;
}

static void xdg_output_done(void *data, struct zxdg_output_v1 *xdg_output) {
  (void)data;
  (void)xdg_output;
}

static void xdg_output_name(void *data, struct zxdg_output_v1 *xdg_output, const char *name) {
  (void)xdg_output;
  WlOutputInfo *out = data;
  snprintf(out->name, sizeof(out->name), "%s", name);
}

static void xdg_output_description(void *data, struct zxdg_output_v1 *xdg_output,
                                   const char *description) {
  (void)data;
  (void)xdg_output;
  (void)description;
}

static const struct zxdg_output_v1_listener xdg_output_listener = {
  .logical_position = xdg_output_logical_position,
  .logical_size = xdg_output_logical_size,
  .done = xdg_output_done,
  .name = xdg_output_name,
  .description = xdg_output_description,
};

static void ws_handle_id(void *data, struct ext_workspace_handle_v1 *ws, const char *id) {
  (void)ws;
  WlWorkspaceInfo *info = data;
  snprintf(info->id, sizeof(info->id), "%s", id);
}

static void ws_handle_name(void *data, struct ext_workspace_handle_v1 *ws, const char *name) {
  (void)ws;
  WlWorkspaceInfo *info = data;
  snprintf(info->name, sizeof(info->name), "%s", name);
}

static void ws_handle_coordinates(void *data, struct ext_workspace_handle_v1 *ws,
                                  struct wl_array *coordinates) {
  (void)data;
  (void)ws;
  (void)coordinates;
}

static void ws_handle_state(void *data, struct ext_workspace_handle_v1 *ws, uint32_t state) {
  (void)ws;
  WlWorkspaceInfo *info = data;
  info->state = state;
  info->active = (state & EXT_WORKSPACE_HANDLE_V1_STATE_ACTIVE) != 0;
}

static void ws_handle_capabilities(void *data, struct ext_workspace_handle_v1 *ws, uint32_t caps) {
  (void)data;
  (void)ws;
  (void)caps;
}

static void ws_handle_removed(void *data, struct ext_workspace_handle_v1 *ws) {
  WlWorkspaceInfo *info = data;
  info->active = false;
  info->name[0] = '\\0';
  ext_workspace_handle_v1_destroy(ws);
}

static const struct ext_workspace_handle_v1_listener ws_handle_listener = {
  .id = ws_handle_id,
  .name = ws_handle_name,
  .coordinates = ws_handle_coordinates,
  .state = ws_handle_state,
  .capabilities = ws_handle_capabilities,
  .removed = ws_handle_removed,
};

static void ws_mgr_workspace_group(void *data, struct ext_workspace_manager_v1 *mgr,
                                   struct ext_workspace_group_handle_v1 *group) {
  (void)data;
  (void)mgr;
  (void)group;
}

static void ws_mgr_workspace(void *data, struct ext_workspace_manager_v1 *mgr,
                             struct ext_workspace_handle_v1 *ws) {
  (void)mgr;
  WaylandContext *ctx = data;
  if (ctx->workspaces_count >= MAX_WORKSPACES) return;
  WlWorkspaceInfo *info = &ctx->workspaces[ctx->workspaces_count++];
  memset(info, 0, sizeof(*info));
  info->handle = ws;
  ext_workspace_handle_v1_add_listener(ws, &ws_handle_listener, info);
}

static void ws_mgr_done(void *data, struct ext_workspace_manager_v1 *mgr) {
  (void)mgr;
  WaylandContext *ctx = data;
  ctx->dirty_event = true;
}

static void ws_mgr_finished(void *data, struct ext_workspace_manager_v1 *mgr) {
  (void)data;
  ext_workspace_manager_v1_destroy(mgr);
}

static const struct ext_workspace_manager_v1_listener ws_mgr_listener = {
  .workspace_group = ws_mgr_workspace_group,
  .workspace = ws_mgr_workspace,
  .done = ws_mgr_done,
  .finished = ws_mgr_finished,
};

static void wlr_tl_title(void *data, struct zwlr_foreign_toplevel_handle_v1 *tl,
                         const char *title) {
  (void)tl;
  WlToplevelInfo *info = data;
  snprintf(info->title, sizeof(info->title), "%s", title);
}

static void wlr_tl_app_id(void *data, struct zwlr_foreign_toplevel_handle_v1 *tl,
                          const char *app_id) {
  (void)tl;
  WlToplevelInfo *info = data;
  snprintf(info->app_id, sizeof(info->app_id), "%s", app_id);
}

static void wlr_tl_output_enter(void *data, struct zwlr_foreign_toplevel_handle_v1 *tl,
                                struct wl_output *output) {
  (void)data; (void)tl; (void)output;
}

static void wlr_tl_output_leave(void *data, struct zwlr_foreign_toplevel_handle_v1 *tl,
                                struct wl_output *output) {
  (void)data; (void)tl; (void)output;
}

static void wlr_tl_state(void *data, struct zwlr_foreign_toplevel_handle_v1 *tl,
                         struct wl_array *state) {
  (void)tl;
  WlToplevelInfo *info = data;
  info->activated = false;
  info->fullscreen = false;
  info->minimized = false;

  uint32_t *entry;
  wl_array_for_each(entry, state) {
    if (*entry == ZWLR_FOREIGN_TOPLEVEL_HANDLE_V1_STATE_ACTIVATED) info->activated = true;
    else if (*entry == ZWLR_FOREIGN_TOPLEVEL_HANDLE_V1_STATE_FULLSCREEN) info->fullscreen = true;
    else if (*entry == ZWLR_FOREIGN_TOPLEVEL_HANDLE_V1_STATE_MINIMIZED) info->minimized = true;
  }
}

static void wlr_tl_done(void *data, struct zwlr_foreign_toplevel_handle_v1 *tl) {
  (void)data; (void)tl;
}

static void wlr_tl_closed(void *data, struct zwlr_foreign_toplevel_handle_v1 *tl) {
  WlToplevelInfo *info = data;
  info->activated = false;
  info->handle = NULL;
  zwlr_foreign_toplevel_handle_v1_destroy(tl);
}

static void wlr_tl_parent(void *data, struct zwlr_foreign_toplevel_handle_v1 *tl,
                          struct zwlr_foreign_toplevel_handle_v1 *parent) {
  (void)data; (void)tl; (void)parent;
}

static const struct zwlr_foreign_toplevel_handle_v1_listener wlr_tl_listener = {
  .title = wlr_tl_title,
  .app_id = wlr_tl_app_id,
  .output_enter = wlr_tl_output_enter,
  .output_leave = wlr_tl_output_leave,
  .state = wlr_tl_state,
  .done = wlr_tl_done,
  .closed = wlr_tl_closed,
  .parent = wlr_tl_parent,
};

static void wlr_mgr_toplevel(void *data, struct zwlr_foreign_toplevel_manager_v1 *mgr,
                             struct zwlr_foreign_toplevel_handle_v1 *tl) {
  (void)mgr;
  WaylandContext *ctx = data;
  if (ctx->toplevels_count >= MAX_TOPLEVELS) return;
  WlToplevelInfo *info = &ctx->toplevels[ctx->toplevels_count++];
  memset(info, 0, sizeof(*info));
  info->handle = tl;
  ctx->dirty_event = true;
  zwlr_foreign_toplevel_handle_v1_add_listener(tl, &wlr_tl_listener, info);
}

static void wlr_mgr_finished(void *data, struct zwlr_foreign_toplevel_manager_v1 *mgr) {
  (void)data;
  zwlr_foreign_toplevel_manager_v1_destroy(mgr);
}

static const struct zwlr_foreign_toplevel_manager_v1_listener wlr_mgr_listener = {
  .toplevel = wlr_mgr_toplevel,
  .finished = wlr_mgr_finished,
};

static void attach_pending_river_outputs(WaylandContext *ctx) {
  if (!ctx->river.manager) return;
  for (size_t i = 0; i < ctx->outputs_count; i++) {
    WlOutputInfo *out = &ctx->outputs[i];
    if (out->active && !out->river_attached) {
      river_layout_attach_output(&ctx->river, out->wl_output, out->name);
      out->river_attached = true;
    }
  }
}

static void registry_global(void *data, struct wl_registry *registry,
                            uint32_t name, const char *interface, uint32_t version) {
  WaylandContext *ctx = data;

  if (strcmp(interface, wl_output_interface.name) == 0) {
    if (ctx->outputs_count < MAX_OUTPUTS) {
      WlOutputInfo *out = &ctx->outputs[ctx->outputs_count++];
      memset(out, 0, sizeof(*out));
      out->global_name = name;
      out->wl_output = wl_registry_bind(registry, name, &wl_output_interface,
                                        version < 4 ? version : 4);
      out->active = true;
      ctx->hotplug_event = true;
      if (ctx->xdg_output_mgr) {
        out->xdg_output = zxdg_output_manager_v1_get_xdg_output(
          ctx->xdg_output_mgr, out->wl_output);
        zxdg_output_v1_add_listener(out->xdg_output, &xdg_output_listener, out);
      }
      attach_pending_river_outputs(ctx);
      if (ctx->debug) {
        fprintf(stderr, "[wayland] output hotplug added global=%u\\n", name);
      }
    }
  } else if (strcmp(interface, zxdg_output_manager_v1_interface.name) == 0) {
    ctx->xdg_output_mgr = wl_registry_bind(registry, name,
                                           &zxdg_output_manager_v1_interface,
                                           version < 3 ? version : 3);
    for (size_t i = 0; i < ctx->outputs_count; i++) {
      if (ctx->outputs[i].active && !ctx->outputs[i].xdg_output) {
        ctx->outputs[i].xdg_output = zxdg_output_manager_v1_get_xdg_output(
          ctx->xdg_output_mgr, ctx->outputs[i].wl_output);
        zxdg_output_v1_add_listener(ctx->outputs[i].xdg_output,
                                    &xdg_output_listener, &ctx->outputs[i]);
      }
    }
  } else if (strcmp(interface, ext_workspace_manager_v1_interface.name) == 0) {
    ctx->ext_workspace_mgr = wl_registry_bind(registry, name,
                                              &ext_workspace_manager_v1_interface, 1);
    ext_workspace_manager_v1_add_listener(ctx->ext_workspace_mgr, &ws_mgr_listener, ctx);
  } else if (strcmp(interface, zwlr_foreign_toplevel_manager_v1_interface.name) == 0) {
    ctx->wlr_toplevel_mgr = wl_registry_bind(registry, name,
                                             &zwlr_foreign_toplevel_manager_v1_interface,
                                             version < 3 ? version : 3);
    zwlr_foreign_toplevel_manager_v1_add_listener(ctx->wlr_toplevel_mgr,
                                                  &wlr_mgr_listener, ctx);
  } else if (strcmp(interface, ext_foreign_toplevel_list_v1_interface.name) == 0) {
    ctx->ext_toplevel_list = wl_registry_bind(registry, name,
                                              &ext_foreign_toplevel_list_v1_interface, 1);
  } else if (strcmp(interface, river_layout_manager_v3_interface.name) == 0) {
    ctx->river.manager = wl_registry_bind(registry, name,
                                          &river_layout_manager_v3_interface, 2);
    attach_pending_river_outputs(ctx);
    if (ctx->debug) {
      fprintf(stderr, "[wayland] bound river_layout_manager_v3\\n");
    }
  }
}

static void registry_global_remove(void *data, struct wl_registry *registry, uint32_t name) {
  (void)registry;
  WaylandContext *ctx = data;
  for (size_t i = 0; i < ctx->outputs_count; i++) {
    if (ctx->outputs[i].global_name == name && ctx->outputs[i].active) {
      ctx->outputs[i].active = false;
      ctx->hotplug_event = true;
      if (ctx->outputs[i].xdg_output) {
        zxdg_output_v1_destroy(ctx->outputs[i].xdg_output);
        ctx->outputs[i].xdg_output = NULL;
      }
      if (ctx->outputs[i].wl_output) {
        wl_output_destroy(ctx->outputs[i].wl_output);
        ctx->outputs[i].wl_output = NULL;
      }
      if (ctx->debug) {
        fprintf(stderr, "[wayland] output hotplug removed %s (global=%u)\\n",
                ctx->outputs[i].name, name);
      }
    }
  }
}

static const struct wl_registry_listener registry_listener = {
  .global = registry_global,
  .global_remove = registry_global_remove,
};

bool wayland_ctx_init(WaylandContext *ctx, const AutotileConfig *cfg, bool debug) {
  memset(ctx, 0, sizeof(*ctx));
  ctx->debug = debug;
  ctx->river.cfg = cfg;

  ctx->display = wl_display_connect(NULL);
  if (!ctx->display) return false;

  ctx->registry = wl_display_get_registry(ctx->display);
  wl_registry_add_listener(ctx->registry, &registry_listener, ctx);
  wl_display_roundtrip(ctx->display);
  wl_display_roundtrip(ctx->display);
  return true;
}

void wayland_ctx_destroy(WaylandContext *ctx) {
  if (ctx->river.manager) river_layout_manager_v3_destroy(ctx->river.manager);
  if (ctx->ext_workspace_mgr) ext_workspace_manager_v1_destroy(ctx->ext_workspace_mgr);
  if (ctx->wlr_toplevel_mgr) zwlr_foreign_toplevel_manager_v1_destroy(ctx->wlr_toplevel_mgr);
  if (ctx->ext_toplevel_list) ext_foreign_toplevel_list_v1_destroy(ctx->ext_toplevel_list);
  if (ctx->xdg_output_mgr) zxdg_output_manager_v1_destroy(ctx->xdg_output_mgr);
  if (ctx->registry) wl_registry_destroy(ctx->registry);
  if (ctx->display) wl_display_disconnect(ctx->display);
}

int wayland_ctx_get_fd(const WaylandContext *ctx) {
  return ctx->display ? wl_display_get_fd(ctx->display) : -1;
}

bool wayland_ctx_dispatch(WaylandContext *ctx) {
  if (wl_display_dispatch(ctx->display) < 0) return false;
  wl_display_flush(ctx->display);
  return true;
}

const char *wayland_ctx_active_workspace(const WaylandContext *ctx) {
  for (size_t i = 0; i < ctx->workspaces_count; i++) {
    if (ctx->workspaces[i].active) return ctx->workspaces[i].name;
  }
  return NULL;
}

const WlOutputInfo *wayland_ctx_active_output(const WaylandContext *ctx) {
  for (size_t i = 0; i < ctx->outputs_count; i++) {
    if (ctx->outputs[i].active) return &ctx->outputs[i];
  }
  return NULL;
}
`,
  },
  {
    path: 'src/sway_ipc.h',
    language: 'c',
    category: 'Core',
    summary: 'Sway/i3 IPC client interface with window event parsing, master promotion, and terminal swallow tracking.',
    content: `#ifndef AUTOTILING_WL_SWAY_IPC_H
#define AUTOTILING_WL_SWAY_IPC_H

#include "autotile.h"
#include <stdbool.h>
#include <stdint.h>

#define MAX_SWALLOWED_CONTAINERS 32

typedef struct {
  int64_t parent_id;
  int64_t child_id;
  bool active;
} SwallowEntry;

typedef struct {
  char change[32];
  int64_t container_id;
  int container_pid;
  char app_id[128];
  bool floating;
} SwayWindowEvent;

typedef struct {
  int event_fd;
  int cmd_fd;
  char socket_path[256];
  bool debug;
  SwallowEntry swallowed[MAX_SWALLOWED_CONTAINERS];
} SwayIpcClient;

bool sway_ipc_connect(SwayIpcClient *client, bool debug);
void sway_ipc_disconnect(SwayIpcClient *client);
bool sway_ipc_subscribe(SwayIpcClient *client, const char *const *events, size_t count);
bool sway_ipc_read_event(SwayIpcClient *client, SwayWindowEvent *out_ev);
bool sway_ipc_get_focused(SwayIpcClient *client, FocusedContainer *out_focused);
bool sway_ipc_run_command(SwayIpcClient *client, const char *cmd);
void sway_ipc_handle_window_event(
  SwayIpcClient *client,
  const AutotileConfig *cfg,
  const SwayWindowEvent *ev,
  const FocusedContainer *prev_focused,
  const FocusedContainer *cur_focused,
  const SplitDecision *decision
);

#endif /* AUTOTILING_WL_SWAY_IPC_H */
`,
  },
  {
    path: 'src/sway_ipc.c',
    language: 'c',
    category: 'Core',
    summary: 'Binary Sway IPC client with tree inspection, rich rule execution, force_split, new_status=master, and /proc PPID terminal swallowing.',
    content: `#include "sway_ipc.h"

#include <errno.h>
#include <json-c/json.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>

#define IPC_MAGIC        "i3-ipc"
#define IPC_HEADER_SIZE  14
#define IPC_RUN_COMMAND  0
#define IPC_SUBSCRIBE    2
#define IPC_GET_TREE     4

static int open_ipc_socket(const char *path) {
  int fd = socket(AF_UNIX, SOCK_STREAM, 0);
  if (fd < 0) return -1;
  struct sockaddr_un addr = {0};
  addr.sun_family = AF_UNIX;
  snprintf(addr.sun_path, sizeof(addr.sun_path), "%s", path);
  if (connect(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
    close(fd);
    return -1;
  }
  return fd;
}

static bool write_exact(int fd, const void *buf, size_t len) {
  const uint8_t *p = buf;
  while (len > 0) {
    ssize_t n = write(fd, p, len);
    if (n <= 0) {
      if (errno == EINTR) continue;
      return false;
    }
    p += n;
    len -= (size_t)n;
  }
  return true;
}

static bool read_exact(int fd, void *buf, size_t len) {
  uint8_t *p = buf;
  while (len > 0) {
    ssize_t n = read(fd, p, len);
    if (n <= 0) {
      if (n < 0 && errno == EINTR) continue;
      return false;
    }
    p += n;
    len -= (size_t)n;
  }
  return true;
}

static bool send_ipc_packet(int fd, uint32_t type, const char *payload) {
  uint32_t len = payload ? (uint32_t)strlen(payload) : 0;
  uint8_t hdr[IPC_HEADER_SIZE];
  memcpy(hdr, IPC_MAGIC, 6);
  memcpy(hdr + 6, &len, 4);
  memcpy(hdr + 10, &type, 4);
  if (!write_exact(fd, hdr, IPC_HEADER_SIZE)) return false;
  if (len > 0 && !write_exact(fd, payload, len)) return false;
  return true;
}

static char *recv_ipc_packet(int fd, uint32_t *out_type) {
  uint8_t hdr[IPC_HEADER_SIZE];
  if (!read_exact(fd, hdr, IPC_HEADER_SIZE)) return NULL;
  if (memcmp(hdr, IPC_MAGIC, 6) != 0) return NULL;
  uint32_t len = 0, type = 0;
  memcpy(&len, hdr + 6, 4);
  memcpy(&type, hdr + 10, 4);
  if (out_type) *out_type = type;
  char *buf = malloc((size_t)len + 1);
  if (!buf) return NULL;
  if (len > 0 && !read_exact(fd, buf, len)) {
    free(buf);
    return NULL;
  }
  buf[len] = '\\0';
  return buf;
}

bool sway_ipc_connect(SwayIpcClient *client, bool debug) {
  memset(client, 0, sizeof(*client));
  client->event_fd = -1;
  client->cmd_fd = -1;
  client->debug = debug;

  const char *sock = getenv("SWAYSOCK");
  if (!sock || !*sock) sock = getenv("I3SOCK");
  if (!sock || !*sock) return false;

  snprintf(client->socket_path, sizeof(client->socket_path), "%s", sock);
  client->event_fd = open_ipc_socket(client->socket_path);
  client->cmd_fd = open_ipc_socket(client->socket_path);
  if (client->event_fd < 0 || client->cmd_fd < 0) {
    sway_ipc_disconnect(client);
    return false;
  }
  return true;
}

void sway_ipc_disconnect(SwayIpcClient *client) {
  if (client->event_fd >= 0) close(client->event_fd);
  if (client->cmd_fd >= 0) close(client->cmd_fd);
  client->event_fd = -1;
  client->cmd_fd = -1;
}

bool sway_ipc_subscribe(SwayIpcClient *client, const char *const *events, size_t count) {
  struct json_object *arr = json_object_new_array();
  if (count == 0) {
    json_object_array_add(arr, json_object_new_string("window"));
  } else {
    for (size_t i = 0; i < count; i++) {
      json_object_array_add(arr, json_object_new_string(events[i]));
    }
  }
  const char *payload = json_object_to_json_string(arr);
  bool ok = send_ipc_packet(client->event_fd, IPC_SUBSCRIBE, payload);
  json_object_put(arr);
  if (!ok) return false;
  char *reply = recv_ipc_packet(client->event_fd, NULL);
  free(reply);
  return reply != NULL;
}

bool sway_ipc_read_event(SwayIpcClient *client, SwayWindowEvent *out_ev) {
  uint32_t ev_type = 0;
  char *payload = recv_ipc_packet(client->event_fd, &ev_type);
  if (!payload) return false;

  if (out_ev) {
    memset(out_ev, 0, sizeof(*out_ev));
    struct json_object *root = json_tokener_parse(payload);
    if (root) {
      struct json_object *chg_obj = NULL, *con_obj = NULL;
      if (json_object_object_get_ex(root, "change", &chg_obj)) {
        const char *chg = json_object_get_string(chg_obj);
        if (chg) snprintf(out_ev->change, sizeof(out_ev->change), "%s", chg);
      }
      if (json_object_object_get_ex(root, "container", &con_obj)) {
        struct json_object *v = NULL;
        if (json_object_object_get_ex(con_obj, "id", &v)) {
          out_ev->container_id = json_object_get_int64(v);
        }
        if (json_object_object_get_ex(con_obj, "pid", &v)) {
          out_ev->container_pid = json_object_get_int(v);
        }
        if (json_object_object_get_ex(con_obj, "app_id", &v) && json_object_get_string(v)) {
          snprintf(out_ev->app_id, sizeof(out_ev->app_id), "%s", json_object_get_string(v));
        }
        if (json_object_object_get_ex(con_obj, "floating", &v)) {
          const char *fl = json_object_get_string(v);
          out_ev->floating = (fl && (strcmp(fl, "user_on") == 0 || strcmp(fl, "auto_on") == 0));
        }
      }
      json_object_put(root);
    }
  }

  free(payload);
  return true;
}

static int count_workspace_tiled_windows(struct json_object *node) {
  int count = 0;
  struct json_object *children = NULL;
  if (json_object_object_get_ex(node, "nodes", &children) &&
      json_object_is_type(children, json_type_array)) {
    size_t n = json_object_array_length(children);
    for (size_t i = 0; i < n; i++) {
      struct json_object *child = json_object_array_get_idx(children, i);
      struct json_object *sub = NULL;
      bool has_sub = json_object_object_get_ex(child, "nodes", &sub) &&
                     json_object_is_type(sub, json_type_array) &&
                     json_object_array_length(sub) > 0;
      if (has_sub) {
        count += count_workspace_tiled_windows(child);
      } else {
        struct json_object *pid_obj = NULL;
        if (json_object_object_get_ex(child, "pid", &pid_obj) &&
            json_object_get_int(pid_obj) > 0) {
          count++;
        }
      }
    }
  }
  return count;
}

static bool find_focused_recursive(
  struct json_object *node,
  struct json_object *parent,
  const char *output_name,
  int out_w,
  int out_h,
  const char *ws_name,
  int ws_num,
  int ws_tiled_count,
  int depth,
  FocusedContainer *out
) {
  struct json_object *type_obj = NULL;
  const char *node_type = "";
  if (json_object_object_get_ex(node, "type", &type_obj)) {
    const char *s = json_object_get_string(type_obj);
    if (s) node_type = s;
  }

  if (strcmp(node_type, "output") == 0) {
    struct json_object *name_obj = NULL, *rect_obj = NULL, *v = NULL;
    if (json_object_object_get_ex(node, "name", &name_obj)) {
      output_name = json_object_get_string(name_obj);
    }
    if (json_object_object_get_ex(node, "rect", &rect_obj)) {
      if (json_object_object_get_ex(rect_obj, "width", &v)) out_w = json_object_get_int(v);
      if (json_object_object_get_ex(rect_obj, "height", &v)) out_h = json_object_get_int(v);
    }
  } else if (strcmp(node_type, "workspace") == 0) {
    struct json_object *name_obj = NULL, *num_obj = NULL;
    if (json_object_object_get_ex(node, "name", &name_obj)) ws_name = json_object_get_string(name_obj);
    if (json_object_object_get_ex(node, "num", &num_obj)) ws_num = json_object_get_int(num_obj);
    ws_tiled_count = count_workspace_tiled_windows(node);
    depth = 0;
  } else if (strcmp(node_type, "con") == 0 || strcmp(node_type, "floating_con") == 0) {
    depth++;
  }

  struct json_object *focused_obj = NULL;
  if (json_object_object_get_ex(node, "focused", &focused_obj) &&
      json_object_get_boolean(focused_obj) &&
      (strcmp(node_type, "con") == 0 || strcmp(node_type, "floating_con") == 0)) {

    memset(out, 0, sizeof(*out));
    out->depth = depth;
    out->workspace_num = ws_num;
    out->ws_tiled_count = ws_tiled_count;
    out->output_width = out_w;
    out->output_height = out_h;
    snprintf(out->output_name, sizeof(out->output_name), "%s", output_name ? output_name : "");
    snprintf(out->workspace_name, sizeof(out->workspace_name), "%s", ws_name ? ws_name : "");

    struct json_object *v = NULL, *app_obj = NULL, *title_obj = NULL, *rect_obj = NULL;
    if (json_object_object_get_ex(node, "id", &v)) out->id = json_object_get_int64(v);
    if (json_object_object_get_ex(node, "pid", &v)) out->pid = json_object_get_int(v);
    if (json_object_object_get_ex(node, "app_id", &app_obj) && json_object_get_string(app_obj)) {
      snprintf(out->app_id, sizeof(out->app_id), "%s", json_object_get_string(app_obj));
    }
    if (json_object_object_get_ex(node, "name", &title_obj) && json_object_get_string(title_obj)) {
      snprintf(out->title, sizeof(out->title), "%s", json_object_get_string(title_obj));
    }
    if (json_object_object_get_ex(node, "rect", &rect_obj)) {
      if (json_object_object_get_ex(rect_obj, "x", &v)) out->rect.x = json_object_get_int(v);
      if (json_object_object_get_ex(rect_obj, "y", &v)) out->rect.y = json_object_get_int(v);
      if (json_object_object_get_ex(rect_obj, "width", &v)) out->rect.width = json_object_get_int(v);
      if (json_object_object_get_ex(rect_obj, "height", &v)) out->rect.height = json_object_get_int(v);
    }

    struct json_object *fs_obj = NULL, *float_obj = NULL;
    if (json_object_object_get_ex(node, "fullscreen_mode", &fs_obj)) {
      out->fullscreen = json_object_get_int(fs_obj) != 0;
    }
    if (json_object_object_get_ex(node, "floating", &float_obj)) {
      const char *fl = json_object_get_string(float_obj);
      out->floating = (fl && (strcmp(fl, "user_on") == 0 || strcmp(fl, "auto_on") == 0));
    }

    if (parent) {
      struct json_object *layout_obj = NULL;
      if (json_object_object_get_ex(parent, "layout", &layout_obj)) {
        const char *layout = json_object_get_string(layout_obj);
        if (layout) {
          snprintf(out->parent_layout, sizeof(out->parent_layout), "%s", layout);
          out->parent_tabbed_or_stacked =
            (strcmp(layout, "tabbed") == 0 || strcmp(layout, "stacked") == 0);
        }
      }
    }
    return true;
  }

  const char *child_keys[] = {"nodes", "floating_nodes"};
  for (size_t k = 0; k < 2; k++) {
    struct json_object *children = NULL;
    if (json_object_object_get_ex(node, child_keys[k], &children) &&
        json_object_is_type(children, json_type_array)) {
      size_t n = json_object_array_length(children);
      for (size_t i = 0; i < n; i++) {
        struct json_object *child = json_object_array_get_idx(children, i);
        if (find_focused_recursive(child, node, output_name, out_w, out_h,
                                   ws_name, ws_num, ws_tiled_count, depth, out)) {
          return true;
        }
      }
    }
  }
  return false;
}

bool sway_ipc_get_focused(SwayIpcClient *client, FocusedContainer *out_focused) {
  if (!send_ipc_packet(client->cmd_fd, IPC_GET_TREE, NULL)) return false;
  char *tree_json = recv_ipc_packet(client->cmd_fd, NULL);
  if (!tree_json) return false;
  struct json_object *root = json_tokener_parse(tree_json);
  free(tree_json);
  if (!root) return false;
  bool found = find_focused_recursive(root, NULL, "", 0, 0, "", -1, 0, 0, out_focused);
  json_object_put(root);
  return found;
}

bool sway_ipc_run_command(SwayIpcClient *client, const char *cmd) {
  if (!cmd || !*cmd) return true;
  if (!send_ipc_packet(client->cmd_fd, IPC_RUN_COMMAND, cmd)) return false;
  char *reply = recv_ipc_packet(client->cmd_fd, NULL);
  free(reply);
  return reply != NULL;
}

static int read_ppid_from_proc(int pid) {
  if (pid <= 1) return 0;
  char path[64];
  snprintf(path, sizeof(path), "/proc/%d/stat", pid);
  FILE *fp = fopen(path, "r");
  if (!fp) return 0;
  char buf[512];
  size_t n = fread(buf, 1, sizeof(buf) - 1, fp);
  fclose(fp);
  if (n == 0) return 0;
  buf[n] = '\\0';
  char *rparen = strrchr(buf, ')');
  if (!rparen) return 0;
  char state = 0;
  int ppid = 0;
  if (sscanf(rparen + 2, "%c %d", &state, &ppid) == 2) return ppid;
  return 0;
}

static bool pid_is_descendant_of(int child_pid, int ancestor_pid) {
  if (child_pid <= 1 || ancestor_pid <= 1 || child_pid == ancestor_pid) return false;
  int cur = child_pid;
  for (int hop = 0; hop < 8 && cur > 1; hop++) {
    int ppid = read_ppid_from_proc(cur);
    if (ppid <= 1) break;
    if (ppid == ancestor_pid) return true;
    cur = ppid;
  }
  return false;
}

void sway_ipc_handle_window_event(
  SwayIpcClient *client,
  const AutotileConfig *cfg,
  const SwayWindowEvent *ev,
  const FocusedContainer *prev_focused,
  const FocusedContainer *cur_focused,
  const SplitDecision *decision
) {
  if (!ev || !ev->change[0]) return;
  char cmd[512];

  if (cfg->enable_swallow && strcmp(ev->change, "new") == 0 &&
      prev_focused && prev_focused->pid > 0 && !prev_focused->floating &&
      !ev->floating &&
      autotile_is_swallow_terminal(cfg, prev_focused->app_id) &&
      !autotile_is_swallow_terminal(cfg, ev->app_id) &&
      pid_is_descendant_of(ev->container_pid, prev_focused->pid)) {
    for (size_t i = 0; i < MAX_SWALLOWED_CONTAINERS; i++) {
      if (!client->swallowed[i].active) {
        client->swallowed[i].active = true;
        client->swallowed[i].parent_id = prev_focused->id;
        client->swallowed[i].child_id = ev->container_id;
        snprintf(cmd, sizeof(cmd),
                 "[con_id=%lld] mark _swallowed_%lld, move scratchpad",
                 (long long)prev_focused->id, (long long)ev->container_id);
        sway_ipc_run_command(client, cmd);
        if (client->debug) {
          fprintf(stderr, "[swallow] hid terminal %lld behind child %lld\\n",
                  (long long)prev_focused->id, (long long)ev->container_id);
        }
        break;
      }
    }
  } else if (strcmp(ev->change, "close") == 0) {
    for (size_t i = 0; i < MAX_SWALLOWED_CONTAINERS; i++) {
      if (client->swallowed[i].active && client->swallowed[i].child_id == ev->container_id) {
        snprintf(cmd, sizeof(cmd),
                 "[con_mark=\\"_swallowed_%lld\\"] scratchpad show, floating disable, unmark _swallowed_%lld",
                 (long long)ev->container_id, (long long)ev->container_id);
        sway_ipc_run_command(client, cmd);
        client->swallowed[i].active = false;
        if (client->debug) {
          fprintf(stderr, "[swallow] restored terminal after child %lld closed\\n",
                  (long long)ev->container_id);
        }
        break;
      }
    }
  }

  if (strcmp(ev->change, "new") == 0 && cur_focused && !cur_focused->floating && decision) {
    if (cfg->force_split == FORCE_SPLIT_LEFT) {
      sway_ipc_run_command(
        client,
        strcmp(cur_focused->parent_layout, "splitv") == 0 ? "move up" : "move left");
    }

    if (decision->resize_pct > 0) {
      int slave_pct = 100 - decision->resize_pct;
      if (strcmp(cur_focused->parent_layout, "splitv") == 0) {
        snprintf(cmd, sizeof(cmd), "resize set height %d ppt", slave_pct);
      } else {
        snprintf(cmd, sizeof(cmd), "resize set width %d ppt", slave_pct);
      }
      sway_ipc_run_command(client, cmd);
    }

    if (cfg->new_status == NEW_STATUS_MASTER &&
        (decision->ws_mode == WS_MODE_MASTER_STACK ||
         decision->ws_mode == WS_MODE_CENTER_MASTER)) {
      if (cur_focused->ws_tiled_count <= 1) {
        snprintf(cmd, sizeof(cmd), "mark _autotile_master_%d", cur_focused->workspace_num);
        sway_ipc_run_command(client, cmd);
      } else {
        snprintf(cmd, sizeof(cmd),
                 "swap container with mark _autotile_master_%d; mark _autotile_master_%d",
                 cur_focused->workspace_num, cur_focused->workspace_num);
        sway_ipc_run_command(client, cmd);
      }
    }
  }
}
`,
  },
  {
    path: 'src/main.c',
    language: 'c',
    category: 'Core',
    summary: 'Main daemon entrypoint with SIGUSR1 pause, config loader, Hyprland-style CLI options, systemd watchdog poll, and River/Sway/Wayland event loop.',
    content: `#include "autotile.h"
#include "config.h"
#include "sd_notify.h"
#include "sway_ipc.h"
#include "wayland_ctx.h"

#include <errno.h>
#include <getopt.h>
#include <poll.h>
#include <signal.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static volatile sig_atomic_t g_running = 1;
static volatile sig_atomic_t g_toggle_pause = 0;

static void handle_stop_signal(int sig) {
  (void)sig;
  g_running = 0;
}

static void handle_usr1(int sig) {
  (void)sig;
  g_toggle_pause = 1;
}

static void print_usage(const char *prog) {
  printf(
    "Usage: %s [OPTIONS]\\n\\n"
    "Wayland-native dwindle & autotiling daemon for Sway, River, and wlroots.\\n\\n"
    "Options:\\n"
    "  -h, --help                      Show this help message and exit\\n"
    "  -d, --debug                     Print debug messages to stderr\\n"
    "  -v, --version                   Display version information\\n"
    "  -c, --config PATH               Load config file from PATH\\n"
    "      --init-config               Copy base config to ~/.config/autotiling-wl/config\\n"
    "  -o, --outputs OUT...            Restrict autotiling to specified output names\\n"
    "  -w, --workspaces WS...          Restrict autotiling to specified workspace numbers\\n"
    "  -l, --limit N                   Max split depth (0 = dwindle default, 2 = master-stack)\\n"
    "  -sw, --splitwidth PX            Minimum container width threshold\\n"
    "  -sh, --splitheight PX           Minimum container height threshold\\n"
    "  -sr, --splitratio R             Height/width direction ratio multiplier (default: 1.0)\\n"
    "      --splitratio-portrait R     Split ratio when monitor height > width\\n"
    "      --mfact R                   Master/primary split proportion 0.1-0.9 (default: 0.50)\\n"
    "      --force-split SIDE          Split placement side: auto | left | right\\n"
    "      --new-status MODE           Master placement for new windows: slave | master\\n"
    "      --single-window-aspect W:H  Center solo window on ultrawide (e.g. 16:9, 0 = off)\\n"
    "      --smart-gaps                Collapse gaps when <= 1 tiled window is open\\n"
    "      --inner-gap PX              Inner gap pixels for multi-window workspaces (default: 10)\\n"
    "      --outer-gap PX              Outer gap pixels for multi-window workspaces (default: 0)\\n"
    "      --swallow                   Enable terminal swallowing via /proc PPID chain\\n"
    "      --swallow-term LIST         Comma-separated terminal app_ids (foot,alacritty,kitty)\\n"
    "      --tabbed-on-min             Fallback to layout tabbed when below min thresholds\\n"
    "      --float-rule RULE           Window rule (app_id:foo [-> float, sticky, size 55%% 65%%, center])\\n"
    "      --ws-layout WS:MODE         Workspace mode (dwindle|master-stack|center-master|tabbed)\\n"
    "  -e, --events EV...              Sway IPC events to subscribe to (default: window)\\n"
    "      --backend MODE              auto | sway | river | wlroots (default: auto)\\n",
    prog
  );
}

static void normalize_legacy_flags(int argc, char **argv) {
  static char arg_sw[] = "--splitwidth";
  static char arg_sh[] = "--splitheight";
  static char arg_sr[] = "--splitratio";
  for (int i = 1; i < argc; i++) {
    if (strcmp(argv[i], "-sw") == 0) argv[i] = arg_sw;
    else if (strcmp(argv[i], "-sh") == 0) argv[i] = arg_sh;
    else if (strcmp(argv[i], "-sr") == 0) argv[i] = arg_sr;
  }
}

static void collect_variadic(int argc, char **argv, char **dest, size_t *count, size_t max) {
  while (optind < argc && argv[optind][0] != '-') {
    if (*count < max) dest[(*count)++] = strdup(argv[optind]);
    optind++;
  }
}

static void process_sway_focus(
  const AutotileConfig *cfg,
  SwayIpcClient *ipc,
  const SwayWindowEvent *ev,
  const FocusedContainer *prev_focused,
  FocusedContainer *cur_focused,
  bool *has_cur
) {
  FocusedContainer focused;
  if (!sway_ipc_get_focused(ipc, &focused)) {
    if (has_cur) *has_cur = false;
    return;
  }
  if (cur_focused) *cur_focused = focused;
  if (has_cur) *has_cur = true;

  SplitDecision decision = autotile_evaluate_split(cfg, &focused);
  if (ev) {
    sway_ipc_handle_window_event(ipc, cfg, ev, prev_focused, &focused, &decision);
  }

  if (decision.aux_command[0]) {
    sway_ipc_run_command(ipc, decision.aux_command);
  } else if (decision.direction != SPLIT_NONE && decision.command) {
    sway_ipc_run_command(ipc, decision.command);
  }

  if (decision.direction != SPLIT_NONE && decision.direction != SPLIT_FLOAT_ENABLE &&
      decision.command && decision.aux_command[0]) {
    sway_ipc_run_command(ipc, decision.command);
  }

  if (cfg->debug) {
    if (decision.direction != SPLIT_NONE && decision.command) {
      fprintf(stderr, "[autotile] %s (app=%s %dx%d depth=%d tiled=%d ws=%s out=%s)\\n",
              decision.command, focused.app_id, focused.rect.width,
              focused.rect.height, focused.depth, focused.ws_tiled_count,
              focused.workspace_name, focused.output_name);
    } else if (decision.skip_reason) {
      fprintf(stderr, "[autotile] skip: %s\\n", decision.skip_reason);
    }
  }
}

int main(int argc, char **argv) {
  AutotileConfig cfg;
  autotile_config_init(&cfg);
  normalize_legacy_flags(argc, argv);

  /* Pre-scan for --config or --init-config before loading config defaults */
  const char *config_path = NULL;
  for (int i = 1; i < argc; i++) {
    if (strcmp(argv[i], "--init-config") == 0) {
      bool ok = autotile_config_init_user_file();
      autotile_config_free(&cfg);
      return ok ? 0 : 1;
    }
    if ((strcmp(argv[i], "-c") == 0 || strcmp(argv[i], "--config") == 0) && i + 1 < argc) {
      config_path = argv[i + 1];
    }
  }
  autotile_config_load_default(&cfg, config_path);

  enum {
    OPT_BACKEND = 1000,
    OPT_INIT_CONFIG,
    OPT_RATIO_PORTRAIT,
    OPT_TABBED_ON_MIN,
    OPT_FLOAT_RULE,
    OPT_WS_LAYOUT,
    OPT_MFACT,
    OPT_FORCE_SPLIT,
    OPT_NEW_STATUS,
    OPT_SINGLE_ASPECT,
    OPT_SMART_GAPS,
    OPT_INNER_GAP,
    OPT_OUTER_GAP,
    OPT_SWALLOW,
    OPT_SWALLOW_TERM,
  };

  static const struct option long_opts[] = {
    {"help",                 no_argument,       NULL, 'h'},
    {"debug",                no_argument,       NULL, 'd'},
    {"version",              no_argument,       NULL, 'v'},
    {"config",               required_argument, NULL, 'c'},
    {"init-config",          no_argument,       NULL, OPT_INIT_CONFIG},
    {"outputs",              required_argument, NULL, 'o'},
    {"workspaces",           required_argument, NULL, 'w'},
    {"limit",                required_argument, NULL, 'l'},
    {"splitwidth",           required_argument, NULL, 'W'},
    {"splitheight",          required_argument, NULL, 'H'},
    {"splitratio",           required_argument, NULL, 'R'},
    {"splitratio-portrait",  required_argument, NULL, OPT_RATIO_PORTRAIT},
    {"mfact",                required_argument, NULL, OPT_MFACT},
    {"force-split",          required_argument, NULL, OPT_FORCE_SPLIT},
    {"new-status",           required_argument, NULL, OPT_NEW_STATUS},
    {"single-window-aspect", required_argument, NULL, OPT_SINGLE_ASPECT},
    {"smart-gaps",           no_argument,       NULL, OPT_SMART_GAPS},
    {"inner-gap",            required_argument, NULL, OPT_INNER_GAP},
    {"outer-gap",            required_argument, NULL, OPT_OUTER_GAP},
    {"swallow",              no_argument,       NULL, OPT_SWALLOW},
    {"swallow-term",         required_argument, NULL, OPT_SWALLOW_TERM},
    {"tabbed-on-min",        no_argument,       NULL, OPT_TABBED_ON_MIN},
    {"float-rule",           required_argument, NULL, OPT_FLOAT_RULE},
    {"ws-layout",            required_argument, NULL, OPT_WS_LAYOUT},
    {"events",               required_argument, NULL, 'e'},
    {"backend",              required_argument, NULL, OPT_BACKEND},
    {NULL, 0, NULL, 0},
  };

  int c;
  while ((c = getopt_long(argc, argv, "hdvc:o:w:l:e:", long_opts, NULL)) != -1) {
    switch (c) {
      case 'h':
        print_usage(argv[0]);
        autotile_config_free(&cfg);
        return 0;
      case 'v':
        printf("autotiling-wl %s (dwindle + ext-workspace-v1 + river-layout-v3 + Sway IPC)\\n",
               AUTOTILING_VERSION);
        autotile_config_free(&cfg);
        return 0;
      case 'd': cfg.debug = true; break;
      case 'c': break;
      case 'o':
        if (cfg.outputs_count < MAX_FILTER_ITEMS) cfg.outputs[cfg.outputs_count++] = strdup(optarg);
        collect_variadic(argc, argv, cfg.outputs, &cfg.outputs_count, MAX_FILTER_ITEMS);
        break;
      case 'w':
        if (cfg.workspaces_count < MAX_FILTER_ITEMS) cfg.workspaces[cfg.workspaces_count++] = strdup(optarg);
        collect_variadic(argc, argv, cfg.workspaces, &cfg.workspaces_count, MAX_FILTER_ITEMS);
        break;
      case 'l': cfg.limit = atoi(optarg); break;
      case 'W': cfg.split_width = atoi(optarg); break;
      case 'H': cfg.split_height = atoi(optarg); break;
      case 'R': cfg.split_ratio = atof(optarg); break;
      case OPT_RATIO_PORTRAIT: cfg.split_ratio_portrait = atof(optarg); break;
      case OPT_MFACT: cfg.mfact = atof(optarg); break;
      case OPT_FORCE_SPLIT:
        if (strcmp(optarg, "left") == 0) cfg.force_split = FORCE_SPLIT_LEFT;
        else if (strcmp(optarg, "right") == 0) cfg.force_split = FORCE_SPLIT_RIGHT;
        else cfg.force_split = FORCE_SPLIT_AUTO;
        break;
      case OPT_NEW_STATUS:
        cfg.new_status = (strcmp(optarg, "master") == 0) ? NEW_STATUS_MASTER : NEW_STATUS_SLAVE;
        break;
      case OPT_SINGLE_ASPECT: cfg.single_window_aspect = autotile_parse_aspect(optarg); break;
      case OPT_SMART_GAPS: cfg.smart_gaps = true; break;
      case OPT_INNER_GAP: cfg.inner_gap = atoi(optarg); break;
      case OPT_OUTER_GAP: cfg.outer_gap = atoi(optarg); break;
      case OPT_SWALLOW: cfg.enable_swallow = true; break;
      case OPT_SWALLOW_TERM: {
        autotile_clear_swallow_terms(&cfg);
        char *dup = strdup(optarg);
        if (dup) {
          char *tok = strtok(dup, ",");
          while (tok) {
            autotile_add_swallow_term(&cfg, tok);
            tok = strtok(NULL, ",");
          }
          free(dup);
        }
        break;
      }
      case OPT_TABBED_ON_MIN: cfg.tabbed_on_min = true; break;
      case OPT_FLOAT_RULE: autotile_add_float_rule(&cfg, optarg); break;
      case OPT_WS_LAYOUT: autotile_add_ws_mode(&cfg, optarg); break;
      case 'e':
        if (cfg.events_count < MAX_EVENT_ITEMS) cfg.events[cfg.events_count++] = strdup(optarg);
        collect_variadic(argc, argv, cfg.events, &cfg.events_count, MAX_EVENT_ITEMS);
        break;
      case OPT_BACKEND:
        if (strcmp(optarg, "sway") == 0) cfg.backend = BACKEND_SWAY_IPC;
        else if (strcmp(optarg, "river") == 0) cfg.backend = BACKEND_RIVER;
        else if (strcmp(optarg, "wlroots") == 0) cfg.backend = BACKEND_WLROOTS_NATIVE;
        else cfg.backend = BACKEND_AUTO;
        break;
      default:
        print_usage(argv[0]);
        autotile_config_free(&cfg);
        return 1;
    }
  }

  signal(SIGINT, handle_stop_signal);
  signal(SIGTERM, handle_stop_signal);
  signal(SIGUSR1, handle_usr1);

  WaylandContext wl;
  if (!wayland_ctx_init(&wl, &cfg, cfg.debug)) {
    fprintf(stderr, "error: failed to connect to WAYLAND_DISPLAY\\n");
    autotile_config_free(&cfg);
    return 1;
  }

  SwayIpcClient ipc;
  bool use_sway = false;
  if ((cfg.backend == BACKEND_AUTO || cfg.backend == BACKEND_SWAY_IPC) &&
      sway_ipc_connect(&ipc, cfg.debug)) {
    use_sway = sway_ipc_subscribe(&ipc, (const char *const *)cfg.events, cfg.events_count);
  }

  FocusedContainer last_focused = {0};
  bool has_last_focused = false;

  if (use_sway) {
    process_sway_focus(&cfg, &ipc, NULL, NULL, &last_focused, &has_last_focused);
    sd_notify_ready("Active (Sway IPC + Wayland dwindle)");
  } else if (wl.river.active) {
    sd_notify_ready("Active (river-layout-v3 dwindle)");
  } else {
    sd_notify_ready("Active (wlroots Wayland protocol listener)");
  }

  int watchdog_ms = sd_watchdog_interval_ms();
  struct pollfd fds[2];
  fds[0].fd = wayland_ctx_get_fd(&wl);
  fds[0].events = POLLIN;
  fds[1].fd = use_sway ? ipc.event_fd : -1;
  fds[1].events = POLLIN;

  while (g_running) {
    if (g_toggle_pause) {
      g_toggle_pause = 0;
      cfg.paused = !cfg.paused;
      sd_notify_status(cfg.paused ? "Paused (SIGUSR1)" : "Active (dwindle)");
      if (cfg.debug) {
        fprintf(stderr, "[signal] SIGUSR1 -> autotiling %s\\n",
                cfg.paused ? "PAUSED" : "RESUMED");
      }
      if (!cfg.paused && use_sway) {
        process_sway_focus(&cfg, &ipc, NULL, NULL, &last_focused, &has_last_focused);
      }
    }

    int nfds = use_sway ? 2 : 1;
    int rc = poll(fds, nfds, watchdog_ms);
    if (rc < 0) {
      if (errno == EINTR) continue;
      break;
    }

    if (watchdog_ms > 0) {
      sd_notify_watchdog();
    }

    if (fds[0].revents & POLLIN) {
      if (!wayland_ctx_dispatch(&wl)) break;
      if (wl.hotplug_event) {
        wl.hotplug_event = false;
        if (use_sway) {
          process_sway_focus(&cfg, &ipc, NULL, NULL, &last_focused, &has_last_focused);
        }
      }
    }

    if (use_sway && (fds[1].revents & POLLIN)) {
      SwayWindowEvent ev;
      if (!sway_ipc_read_event(&ipc, &ev)) break;
      FocusedContainer prev_copy = last_focused;
      process_sway_focus(
        &cfg, &ipc, &ev, has_last_focused ? &prev_copy : NULL,
        &last_focused, &has_last_focused);
    }
  }

  sd_notify_stopping();
  if (use_sway) sway_ipc_disconnect(&ipc);
  wayland_ctx_destroy(&wl);
  autotile_config_free(&cfg);
  return 0;
}
`,
  },
  {
    path: 'protocols/river-layout-v3.xml',
    language: 'xml',
    category: 'Protocols',
    summary: 'River compositor layout generator v3 protocol XML.',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<protocol name="river_layout_v3">
  <copyright>
    Copyright 2020 The River Developers
    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.
  </copyright>

  <interface name="river_layout_manager_v3" version="2">
    <request name="destroy" type="destructor"/>
    <request name="get_layout">
      <arg name="id" type="new_id" interface="river_layout_v3"/>
      <arg name="output" type="object" interface="wl_output"/>
      <arg name="namespace" type="string"/>
    </request>
  </interface>

  <interface name="river_layout_v3" version="2">
    <request name="destroy" type="destructor"/>
    <request name="push_view_dimensions">
      <arg name="x" type="int"/>
      <arg name="y" type="int"/>
      <arg name="width" type="int"/>
      <arg name="height" type="int"/>
      <arg name="serial" type="uint"/>
    </request>
    <request name="commit">
      <arg name="name" type="string"/>
      <arg name="serial" type="uint"/>
    </request>
    <event name="namespace_in_use"/>
    <event name="layout_demand">
      <arg name="view_count" type="uint"/>
      <arg name="usable_width" type="uint"/>
      <arg name="usable_height" type="uint"/>
      <arg name="tags" type="uint"/>
      <arg name="serial" type="uint"/>
    </event>
    <event name="user_command">
      <arg name="command" type="string"/>
    </event>
  </interface>
</protocol>
`,
  },
  {
    path: 'protocols/wlr-foreign-toplevel-management-unstable-v1.xml',
    language: 'xml',
    category: 'Protocols',
    summary: 'Standard wlroots unstable v1 toplevel management XML bundled for Fedora 45 builds.',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<protocol name="wlr_foreign_toplevel_management_unstable_v1">
  <copyright>
    Copyright © 2018 Ilia Bozhinov
    Permission to use, copy, modify, distribute, and sell this software and its
    documentation for any purpose is hereby granted without fee.
  </copyright>

  <interface name="zwlr_foreign_toplevel_manager_v1" version="3">
    <event name="toplevel">
      <arg name="toplevel" type="new_id" interface="zwlr_foreign_toplevel_handle_v1"/>
    </event>
    <event name="finished"/>
    <request name="stop"/>
  </interface>

  <interface name="zwlr_foreign_toplevel_handle_v1" version="3">
    <event name="title"><arg name="title" type="string"/></event>
    <event name="app_id"><arg name="app_id" type="string"/></event>
    <event name="output_enter"><arg name="output" type="object" interface="wl_output"/></event>
    <event name="output_leave"><arg name="output" type="object" interface="wl_output"/></event>
    <enum name="state">
      <entry name="maximized" value="0"/>
      <entry name="minimized" value="1"/>
      <entry name="activated" value="2"/>
      <entry name="fullscreen" value="3"/>
    </enum>
    <event name="state"><arg name="state" type="array"/></event>
    <event name="done"/>
    <event name="closed"/>
    <request name="set_maximized"/>
    <request name="unset_maximized"/>
    <request name="set_minimized"/>
    <request name="unset_minimized"/>
    <request name="activate"><arg name="seat" type="object" interface="wl_seat"/></request>
    <request name="close"/>
    <request name="set_rectangle">
      <arg name="surface" type="object" interface="wl_surface"/>
      <arg name="x" type="int"/>
      <arg name="y" type="int"/>
      <arg name="width" type="int"/>
      <arg name="height" type="int"/>
    </request>
    <request name="destroy" type="destructor"/>
    <request name="set_fullscreen"><arg name="output" type="object" interface="wl_output" allow-null="true"/></request>
    <request name="unset_fullscreen"/>
    <event name="parent" since="3">
      <arg name="parent" type="object" interface="zwlr_foreign_toplevel_handle_v1" allow-null="true"/>
    </event>
  </interface>
</protocol>
`,
  },
  {
    path: 'systemd/autotiling-wl.service',
    language: 'ini',
    category: 'Packaging',
    summary: 'Systemd user unit with Type=notify readiness, 30s watchdog, and SIGUSR1 pause reload.',
    content: `[Unit]
Description=Wayland-native dwindle and autotiling daemon for Sway, River, and wlroots
Documentation=man:autotiling-wl(1)
PartOf=graphical-session.target
After=graphical-session.target
ConditionEnvironment=WAYLAND_DISPLAY

[Service]
Type=notify
WatchdogSec=30s
ExecStart=/usr/bin/autotiling-wl
ExecReload=/bin/kill -USR1 $MAINPID
Restart=on-failure
RestartSec=1

[Install]
WantedBy=sway-session.target
`,
  },
  {
    path: 'packaging/fedora/autotiling-wl.spec',
    language: 'spec',
    category: 'Packaging',
    summary: 'Fedora Linux 45 RPM spec packaging binary, man page, systemd unit, and base share config.',
    content: `Name:           autotiling-wl
Version:        1.1.0
Release:        1%{?dist}
Summary:        Wayland-native dwindle & autotiling daemon for Sway, River, and wlroots

License:        GPL-3.0-or-later
URL:            https://github.com/example/autotiling-wl
Source0:        %{name}-%{version}.tar.gz

BuildRequires:  gcc
BuildRequires:  meson >= 0.63
BuildRequires:  ninja-build
BuildRequires:  pkgconfig(json-c) >= 0.17
BuildRequires:  pkgconfig(wayland-client) >= 1.22.0
BuildRequires:  pkgconfig(wayland-protocols) >= 1.36
BuildRequires:  wayland-devel
BuildRequires:  systemd-rpm-macros

Recommends:     sway

%description
A C17 rebuild of nwg-piotr/autotiling with recursive dwindle by default,
modern Wayland protocols (ext-workspace-v1, ext-foreign-toplevel-list-v1,
xdg-output-unstable-v1, wlr-foreign-toplevel-management, river-layout-v3),
auto-float rules, per-workspace layout modes, and native sd_notify support.

%prep
%autosetup

%build
%meson -Dcompat_symlink=false
%meson_build

%install
%meson_install

%post
%systemd_user_post autotiling-wl.service

%preun
%systemd_user_preun autotiling-wl.service

%files
%doc README.md
%{_bindir}/autotiling-wl
%{_datadir}/autotiling-wl/config
%{_mandir}/man1/autotiling-wl.1*
%{_userunitdir}/autotiling-wl.service

%changelog
* Sun Nov 22 2026 Fedora Packager <packager@fedoraproject.org> - 1.1.0-1
- Add dwindle default, auto-float rules, per-workspace modes, River layout, SIGUSR1, sd_notify, base config, and man page
`,
  },
  {
    path: 'packaging/debian/control',
    language: 'debian',
    category: 'Packaging',
    summary: 'Debian/Ubuntu control metadata declaring debhelper-compat, Meson, Wayland, and json-c build dependencies.',
    content: `Source: autotiling-wl
Section: x11
Priority: optional
Maintainer: Maintainer <maintainer@example.org>
Rules-Requires-Root: no
Build-Depends:
 debhelper-compat (= 13),
 libjson-c-dev (>= 0.17),
 libwayland-bin,
 libwayland-dev (>= 1.22.0),
 meson (>= 0.63),
 ninja-build,
 pkgconf | pkg-config,
 wayland-protocols (>= 1.36)
Standards-Version: 4.7.0
Homepage: https://github.com/example/autotiling-wl

Package: autotiling-wl
Architecture: any
Depends: \${shlibs:Depends}, \${misc:Depends}
Recommends: sway | river
Description: Wayland-native dwindle & autotiling daemon for Sway, River, and wlroots
 A C17 rebuild of autotiling with recursive dwindle layout by default,
 modern Wayland protocols (ext-workspace-v1, ext-foreign-toplevel-list-v1,
 xdg-output-unstable-v1, wlr-foreign-toplevel-management, river-layout-v3),
 auto-float rules, per-workspace layout modes, and native sd_notify support.
`,
  },
  {
    path: 'packaging/debian/rules',
    language: 'debian',
    category: 'Packaging',
    summary: 'Debian debhelper rules building autotiling-wl with Meson and disabling compat symlink.',
    content: `#!/usr/bin/make -f

%:
\tdh $@ --buildsystem=meson

override_dh_auto_configure:
\tdh_auto_configure -- -Dcompat_symlink=false
`,
  },
  {
    path: 'packaging/debian/changelog',
    language: 'debian',
    category: 'Packaging',
    summary: 'Debian package changelog for autotiling-wl 1.1.0-1.',
    content: `autotiling-wl (1.1.0-1) unstable; urgency=medium

  * Release 1.1.0 with dwindle default, auto-float rules, per-workspace modes,
    River layout support, SIGUSR1 toggle, sd_notify, base config, and man page.

 -- Maintainer <maintainer@example.org>  Sun, 22 Nov 2026 12:00:00 +0000
`,
  },
  {
    path: 'packaging/arch/PKGBUILD',
    language: 'shell',
    category: 'Packaging',
    summary: 'Arch Linux PKGBUILD using meson/ninja and systemd user unit packaging.',
    content: `# Maintainer: Maintainer <maintainer@example.org>
pkgname=autotiling-wl
pkgver=1.1.0
pkgrel=1
pkgdesc='Wayland-native dwindle & autotiling daemon for Sway, River, and wlroots'
arch=('x86_64' 'aarch64')
url='https://github.com/example/autotiling-wl'
license=('GPL-3.0-or-later')
depends=('wayland' 'json-c')
makedepends=('meson' 'ninja' 'pkgconf' 'wayland-protocols')
optdepends=(
  'sway: Sway IPC autotiling integration'
  'river: River river-layout-v3 integration'
)
source=("\${pkgname}-\${pkgver}.tar.gz")
sha256sums=('SKIP')

build() {
  arch-meson "\${pkgname}-\${pkgver}" build -Dcompat_symlink=false
  meson compile -C build
}

package() {
  meson install -C build --destdir "$pkgdir"
}
`,
  },
  {
    path: 'packaging/void/template',
    language: 'shell',
    category: 'Packaging',
    summary: 'Void Linux xbps-src template building autotiling-wl via Meson.',
    content: `# Template file for 'autotiling-wl'
pkgname=autotiling-wl
version=1.1.0
revision=1
build_style=meson
configure_args="-Dcompat_symlink=false"
hostmakedepends="pkg-config wayland-devel"
makedepends="wayland-devel wayland-protocols json-c-devel"
short_desc="Wayland-native dwindle & autotiling daemon for Sway, River, and wlroots"
maintainer="Maintainer <maintainer@example.org>"
license="GPL-3.0-or-later"
homepage="https://github.com/example/autotiling-wl"
distfiles="https://github.com/example/autotiling-wl/archive/refs/tags/v\${version}.tar.gz"
checksum=0000000000000000000000000000000000000000000000000000000000000000
`,
  },
  {
    path: 'README.md',
    language: 'markdown',
    category: 'Docs & Config',
    summary: 'User-ready GitHub README covering features, Fedora/Debian/Arch/Void installation, GitHub Pages docs, configuration, and Sway/River setup.',
    content: `# autotiling-wl

Automatic window tiling for **Sway**, **River**, and modern **wlroots** Wayland compositors.

\`autotiling-wl\` automatically switches split direction based on the shape of your focused window to create a **dwindle** layout by default, while adding Hyprland-inspired ergonomics and keeping drop-in compatibility with original \`autotiling\` flags.

## Features

- **Dwindle layout by default**: Splits windows recursively along their longest edge without requiring manual split shortcuts.
- **Custom split ratios (\`--mfact\`)**: Control primary/secondary split proportions (e.g. \`0.60\` for 60/40 splits) on both Sway and River.
- **Ultrawide single-window centering (\`--single-window-aspect\`)**: Center a solo window cleanly to \`16:9\` (or \`4:3\`) on ultrawide monitors while multi-window splits still fill 100% of the screen.
- **Centered master & master-stack modes**: Assign \`dwindle\`, \`master-stack\`, \`center-master\`, or \`tabbed\` per workspace.
- **Promote new windows to master (\`--new-status master\`)**: Automatically swap newly spawned windows into the master slot.
- **Directional split placement (\`--force-split\`)**: Choose \`auto\`, \`left\` (prepend left/up), or \`right\` (append right/down).
- **Dynamic smart gaps (\`--smart-gaps\`)**: Collapse inner/outer gaps automatically when a workspace has one tiled window or uses \`tabbed\` layout.
- **Terminal window swallowing (\`--swallow\`)**: Automatically hide \`foot\`, \`alacritty\`, or \`kitty\` when launching a child GUI window and restore it on close.
- **Rich auto-float window rules**: Match \`app_id\` or window \`title\` with chained actions (\`float\`, \`sticky\`, \`size W% H%\`, \`center\`, \`move X% Y%\`, \`opacity R\`, \`border none\`).
- **Orientation-aware split ratios & tabbed fallback**: Separate split ratios for landscape and portrait monitors plus \`--tabbed-on-min\`.
- **Pause/resume anytime**: Send \`SIGUSR1\` (\`pkill -USR1 autotiling-wl\`) to pause or resume tiling without restarting.
- **Multi-compositor support**: Works seamlessly with Sway, River (\`river-layout-v3\`), and systemd user sessions (gracefully ignored on non-systemd setups such as Void).

---

## Web Installation Guide (GitHub Pages)

This repository includes a standalone, interactive installation page at \`docs/index.html\` featuring a 4-distro switcher (**Fedora 45**, **Debian**, **Arch Linux**, and **Void Linux**).

To publish it as a website via **GitHub Pages**:
1. Push your repository (including \`docs/index.html\`) to GitHub.
2. Open your repository on GitHub and go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select branch **\`main\`** and folder **\`/docs\`**, then click **Save**.
5. After ~1 minute, GitHub publishes the guide at \`https://<your-username>.github.io/<your-repo>/\`.

---

## Installation

### Fedora Linux 45

#### 1. Install dependencies
\`\`\`bash
sudo dnf install -y gcc meson ninja-build pkgconf-pkg-config wayland-devel wayland-protocols-devel json-c-devel rpm-build redhat-rpm-config rpmdevtools gzip tar systemd-rpm-macros
\`\`\`

#### 2A. Standard install (\`/usr/local\`)
\`\`\`bash
git clone https://github.com/<your-username>/autotiling-wl.git
cd autotiling-wl
meson setup build --prefix=/usr/local -Dcompat_symlink=true
ninja -C build
sudo ninja -C build install
\`\`\`

#### 2B. Build and install an RPM package (\`/usr\`)
\`\`\`bash
git clone https://github.com/<your-username>/autotiling-wl.git
rpmdev-setuptree
tar --transform 's,^autotiling-wl,autotiling-wl-1.1.0,' -czf ~/rpmbuild/SOURCES/autotiling-wl-1.1.0.tar.gz autotiling-wl
cp autotiling-wl/packaging/fedora/autotiling-wl.spec ~/rpmbuild/SPECS/
rpmbuild -ba ~/rpmbuild/SPECS/autotiling-wl.spec
sudo dnf install -y ~/rpmbuild/RPMS/$(uname -m)/autotiling-wl-1.1.0-1.fc45.$(uname -m).rpm
\`\`\`

---

### Debian (Trixie / Testing / Sid)

> Requires \`wayland-protocols >= 1.36\` and \`libjson-c-dev >= 0.17\` (included in Debian 13 Trixie and newer).

#### 1. Install dependencies
\`\`\`bash
sudo apt update
sudo apt install -y build-essential meson ninja-build pkg-config libwayland-dev libwayland-bin wayland-protocols libjson-c-dev debhelper devscripts
\`\`\`

#### 2A. Standard install (\`/usr/local\`)
\`\`\`bash
git clone https://github.com/<your-username>/autotiling-wl.git
cd autotiling-wl
meson setup build --prefix=/usr/local -Dcompat_symlink=true
ninja -C build
sudo ninja -C build install
\`\`\`

#### 2B. Build and install a \`.deb\` package (\`/usr\`)
\`\`\`bash
git clone https://github.com/<your-username>/autotiling-wl.git
cd autotiling-wl
cp -r packaging/debian debian
chmod +x debian/rules
dpkg-buildpackage -us -uc -b
sudo apt install -y ../autotiling-wl_1.1.0-1_*.deb
\`\`\`

---

### Arch Linux

#### 1. Install dependencies
\`\`\`bash
sudo pacman -S --needed base-devel meson ninja pkgconf wayland wayland-protocols json-c
\`\`\`

#### 2A. Standard install (\`/usr/local\`)
\`\`\`bash
git clone https://github.com/<your-username>/autotiling-wl.git
cd autotiling-wl
meson setup build --prefix=/usr/local -Dcompat_symlink=true
ninja -C build
sudo ninja -C build install
\`\`\`

#### 2B. Build and install with \`makepkg\` (\`/usr\`)
\`\`\`bash
git clone https://github.com/<your-username>/autotiling-wl.git
mkdir -p autotiling-wl-pkg
tar --transform 's,^autotiling-wl,autotiling-wl-1.1.0,' -czf autotiling-wl-pkg/autotiling-wl-1.1.0.tar.gz autotiling-wl
cp autotiling-wl/packaging/arch/PKGBUILD autotiling-wl-pkg/
cd autotiling-wl-pkg
makepkg -si
\`\`\`

---

### Void Linux

> **Note:** Void runs **runit without systemd**; **\`sd_notify\` gracefully no-ops** when **\`$NOTIFY_SOCKET\`** is unset. Install build deps via **\`xbps-install\`** and **launch directly from Sway or River**.

#### 1. Install dependencies
\`\`\`bash
sudo xbps-install -Sy base-devel meson ninja pkg-config wayland-devel wayland-protocols json-c-devel
\`\`\`

#### 2A. Standard install (\`/usr/local\`)
\`\`\`bash
git clone https://github.com/<your-username>/autotiling-wl.git
cd autotiling-wl
meson setup build --prefix=/usr/local -Dcompat_symlink=true
ninja -C build
sudo ninja -C build install
\`\`\`

#### 2B. Package with \`xbps-src\` (Optional)
A template is provided at \`packaging/void/template\`. Copy it to \`void-packages/srcpkgs/autotiling-wl/template\`, update \`distfiles\`/\`checksum\`, and run \`./xbps-src pkg autotiling-wl\`.

> Pass \`-Dcompat_symlink=true\` when configuring Meson if you want an \`autotiling\` symlink so existing Sway configs work without edits.

---

## Quick Start

### Create your config file

\`\`\`bash
autotiling-wl --init-config
\`\`\`

This copies the default template into \`~/.config/autotiling-wl/config\`.

### Sway (\`~/.config/sway/config\`)

\`\`\`sway
# Start autotiling in dwindle mode
exec_always autotiling-wl

# Optional: keybind to pause/resume autotiling
bindsym $mod+Shift+t exec pkill -USR1 autotiling-wl
\`\`\`

### River (\`~/.config/river/init\`)

\`\`\`sh
autotiling-wl --backend river &
riverctl default-layout autotiling-wl
\`\`\`

### Systemd User Service (Fedora / Debian / Arch)

> Note: \`autotiling-wl.service\` runs \`/usr/bin/autotiling-wl\` (the default path when installed via a distro package or \`--prefix=/usr\`). On Void Linux (\`runit\`), launch \`autotiling-wl\` directly from your Sway or River config instead.

\`\`\`bash
systemctl --user enable --now autotiling-wl.service

# Pause or resume via systemd
systemctl --user reload autotiling-wl.service
\`\`\`

---

## Configuration (\`~/.config/autotiling-wl/config\`)

\`\`\`ini
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
\`\`\`

---

## Command-Line Options

| Option | Description | Default |
| :--- | :--- | :--- |
| \`-h, --help\` | Show help and exit | — |
| \`-v, --version\` | Print version and exit | — |
| \`-d, --debug\` | Print debug logs to stderr | \`false\` |
| \`-c, --config PATH\` | Use a custom config file path | \`~/.config/autotiling-wl/config\` |
| \`--init-config\` | Create user config from base template | — |
| \`-o, --outputs OUT...\` | Restrict to specific monitors (e.g. \`DP-1 HDMI-A-1\`) | All |
| \`-w, --workspaces WS...\` | Restrict to specific workspaces (e.g. \`1 3 5\`) | All |
| \`-l, --limit N\` | Max split depth (\`0\` = dwindle, \`2\` = master-stack) | \`0\` |
| \`-sw, --splitwidth PX\` | Minimum container width before skipping/tabbing | \`0\` |
| \`-sh, --splitheight PX\` | Minimum container height before skipping/tabbing | \`0\` |
| \`-sr, --splitratio R\` | Height-to-width split ratio multiplier | \`1.0\` |
| \`--splitratio-portrait R\` | Split ratio override for vertical monitors | \`0.80\` |
| \`--mfact R\` | Master/primary split ratio (\`0.10\`–\`0.90\`) | \`0.50\` |
| \`--force-split SIDE\` | Placement side for new splits (\`auto\`, \`left\`, \`right\`) | \`auto\` |
| \`--new-status MODE\` | Spawn new windows as \`slave\` or promote to \`master\` | \`slave\` |
| \`--single-window-aspect W:H\` | Center a solo tiled window (\`16:9\`, \`4:3\`, or \`0\`) | \`16:9\` |
| \`--smart-gaps\` | Collapse gaps when <= 1 tiled window or \`tabbed\` | \`true\` |
| \`--inner-gap PX\` | Inner gap pixels when multiple tiled windows exist | \`10\` |
| \`--outer-gap PX\` | Outer gap pixels when multiple tiled windows exist | \`0\` |
| \`--swallow\` | Hide parent terminal when spawning a child GUI window | \`false\` |
| \`--swallow-term LIST\` | Comma-separated terminal \`app_id\` list | \`foot,alacritty,kitty\` |
| \`--tabbed-on-min\` | Switch to \`tabbed\` when below min width/height | \`false\` |
| \`--float-rule RULE\` | Window rule (\`app_id:foo -> float, size 55% 65%, center\`) | — |
| \`--ws-layout WS:MODE\` | Mode (\`dwindle\`, \`master-stack\`, \`center-master\`, \`tabbed\`) | \`dwindle\` |
| \`-e, --events EV...\` | Sway IPC events to listen for | \`window\` |
| \`--backend MODE\` | Force backend (\`auto\`, \`sway\`, \`river\`, \`wlroots\`) | \`auto\` |

For full reference documentation, run:

\`\`\`bash
man autotiling-wl
\`\`\`

---

## License

GPL-3.0-or-later
`,
  },
  {
    path: 'docs/index.html',
    language: 'html',
    category: 'Docs & Config',
    summary: 'Standalone GitHub Pages site with interactive Fedora, Debian, Arch, and Void Linux installation switcher.',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>autotiling-wl — Installation & Configuration Guide</title>
  <meta name="description" content="Install and configure autotiling-wl on Fedora, Debian, Arch Linux, and Void Linux for Sway, River, and wlroots." />
  <style>
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --muted: #475569;
      --code-bg: #0f172a;
      --code-text: #e2e8f0;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --highlight-bg: #fef3c7;
      --ok: #10b981;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    code, pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 20;
    }
    .header-inner {
      max-width: 1120px;
      margin: 0 auto;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .brand {
      font-weight: 700;
      font-size: 18px;
      letter-spacing: -0.02em;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--text);
      text-decoration: none;
    }
    nav {
      display: flex;
      gap: 20px;
      font-size: 14px;
      font-weight: 500;
    }
    nav a {
      color: var(--muted);
      text-decoration: none;
    }
    nav a:hover { color: var(--text); text-decoration: underline; }
    main {
      max-width: 1120px;
      margin: 0 auto;
      padding: 36px 24px 64px;
    }
    .hero {
      padding-bottom: 28px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 32px;
    }
    .hero h1 {
      margin: 0 0 10px;
      font-size: clamp(1.75rem, 3vw, 2.35rem);
      line-height: 1.15;
      letter-spacing: -0.025em;
    }
    .hero p {
      margin: 0;
      max-width: 720px;
      color: var(--muted);
      font-size: 16px;
    }
    .section-title {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 8px;
    }
    .distro-summary {
      margin: 0 0 18px;
      font-size: 14px;
      color: var(--muted);
      max-width: 780px;
    }
    .distro-summary mark {
      background: var(--highlight-bg);
      color: var(--text);
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .distro-summary code {
      background: #e2e8f0;
      color: var(--text);
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 12px;
    }
    .tablist {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 4px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .tab-btn {
      border: 0;
      background: transparent;
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
      padding: 7px 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .tab-btn:hover { background: #f1f5f9; color: var(--text); }
    .tab-btn[aria-selected="true"] {
      background: var(--text);
      color: #ffffff;
    }
    .steps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
      gap: 20px;
      margin-bottom: 44px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
    }
    .card h3 {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 600;
    }
    .card p {
      margin: 0;
      font-size: 13px;
      color: var(--muted);
    }
    .code-box {
      position: relative;
      background: var(--code-bg);
      color: var(--code-text);
      border-radius: 6px;
      padding: 14px;
    }
    .code-box pre {
      margin: 0;
      font-size: 12px;
      line-height: 1.55;
      overflow-x: auto;
      padding-right: 64px;
      white-space: pre;
    }
    .copy-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      border: 1px solid #334155;
      background: #1e293b;
      color: #e2e8f0;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 9px;
      border-radius: 5px;
      cursor: pointer;
    }
    .copy-btn:hover { background: #334155; }
    .copy-btn.copied { color: var(--ok); border-color: var(--ok); }
    .two-col {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 44px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      font-size: 13px;
    }
    th, td {
      text-align: left;
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    th {
      background: #f8fafc;
      color: var(--muted);
      font-weight: 600;
      font-size: 12px;
      border-bottom: 1px solid var(--border);
    }
    td:first-child {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      white-space: nowrap;
    }
    .table-wrap { overflow-x: auto; margin-bottom: 44px; }
    footer {
      border-top: 1px solid var(--border);
      background: var(--surface);
      padding: 20px 24px;
      font-size: 12px;
      color: var(--muted);
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <a href="#install" class="brand">autotiling-wl 1.1.0</a>
      <nav aria-label="Page sections">
        <a href="#install">Install Guide</a>
        <a href="#quickstart">Quick Start</a>
        <a href="#config">Config Template</a>
        <a href="#flags">CLI Options</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero">
      <h1>Wayland-native dwindle &amp; autotiling daemon for Sway, River &amp; wlroots</h1>
      <p>
        Rebuilt in C17 and Meson with recursive dwindle layout by default, split size ratios (<code>--mfact</code>), centered master &amp; ultrawide single-window centering, smart gaps, terminal window swallowing, and rich auto-float window rules.
      </p>
    </section>

    <section id="install">
      <h2 class="section-title" id="distro-headline">Fedora Linux 45 installation</h2>
      <p class="distro-summary" id="distro-summary"></p>

      <div class="tablist" role="tablist" aria-label="Linux distribution">
        <button type="button" class="tab-btn" role="tab" data-distro="fedora" aria-selected="true">Fedora 45</button>
        <button type="button" class="tab-btn" role="tab" data-distro="debian" aria-selected="false">Debian</button>
        <button type="button" class="tab-btn" role="tab" data-distro="arch" aria-selected="false">Arch Linux</button>
        <button type="button" class="tab-btn" role="tab" data-distro="void" aria-selected="false">Void Linux</button>
      </div>

      <div class="steps-grid" id="steps-container"></div>
    </section>

    <section id="quickstart">
      <h2 class="section-title">Quick start &amp; compositor hooks</h2>
      <p class="distro-summary">
        Initialize <code>~/.config/autotiling-wl/config</code> once, then launch directly from Sway, River, or a systemd user session.
      </p>
      <div class="two-col">
        <div class="card">
          <div>
            <h3>Sway (~/.config/sway/config)</h3>
            <p>Starts autotiling in dwindle mode with an optional SIGUSR1 pause/resume keybind.</p>
          </div>
          <div class="code-box">
            <button type="button" class="copy-btn" data-copy-target="sway-cfg">Copy</button>
            <pre id="sway-cfg">exec_always autotiling-wl
bindsym $mod+Shift+t exec pkill -USR1 autotiling-wl</pre>
          </div>
        </div>
        <div class="card">
          <div>
            <h3>River (~/.config/river/init)</h3>
            <p>Speaks <code>river-layout-v3</code> natively with dwindle, center-master, and smart gaps.</p>
          </div>
          <div class="code-box">
            <button type="button" class="copy-btn" data-copy-target="river-cfg">Copy</button>
            <pre id="river-cfg">autotiling-wl --backend river &amp;
riverctl default-layout autotiling-wl</pre>
          </div>
        </div>
      </div>
    </section>

    <section id="config">
      <h2 class="section-title">Default configuration (~/.config/autotiling-wl/config)</h2>
      <p class="distro-summary">
        Generate this file automatically via <code>autotiling-wl --init-config</code>.
      </p>
      <div class="code-box" style="margin-bottom: 44px;">
        <button type="button" class="copy-btn" data-copy-target="ini-cfg">Copy</button>
        <pre id="ini-cfg">[general]
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
# 1 = dwindle | 2 = master-stack | 3 = center-master | 4 = tabbed

[float_rules]
rule = app_id:pavucontrol -&gt; float, size 55% 65%, center
rule = app_id:org.gnome.Calculator -&gt; float, center
rule = title:Picture-in-Picture -&gt; float, sticky, size 28% 28%, move 70% 68%</pre>
      </div>
    </section>

    <section id="flags">
      <h2 class="section-title">CLI flags reference</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Flag</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>-l, --limit N</td><td>0 (dwindle)</td><td>Cap split depth (0 = recursive dwindle, 2 = master-stack).</td></tr>
            <tr><td>-sr, --splitratio R</td><td>1.00 / 0.80</td><td>Height/width split threshold; supports --splitratio-portrait for vertical monitors.</td></tr>
            <tr><td>--mfact R</td><td>0.50</td><td>Master/primary split proportion between 0.10 and 0.90.</td></tr>
            <tr><td>--force-split SIDE</td><td>auto</td><td>Place new splits on auto, left (prepend), or right (append).</td></tr>
            <tr><td>--new-status MODE</td><td>slave</td><td>Keep newly spawned windows as slave or promote to master.</td></tr>
            <tr><td>--single-window-aspect W:H</td><td>16:9</td><td>Center solo tiled window on ultrawide displays (0 disables).</td></tr>
            <tr><td>--smart-gaps / --inner-gap / --outer-gap</td><td>true / 10 / 0</td><td>Collapse gaps automatically when &lt;= 1 tiled window or tabbed layout is active.</td></tr>
            <tr><td>--swallow / --swallow-term LIST</td><td>false / foot,alacritty,kitty</td><td>Hide launching terminal while child GUI window is open via /proc PPID chain.</td></tr>
            <tr><td>--ws-layout WS:MODE</td><td>dwindle</td><td>Assign dwindle, master-stack, center-master, or tabbed per workspace.</td></tr>
            <tr><td>--float-rule RULE</td><td>—</td><td>Match app_id:/title: with -&gt; float, sticky, size W% H%, center, move X% Y%, opacity R, border none.</td></tr>
            <tr><td>--tabbed-on-min / -sw / -sh</td><td>false / 0 / 0</td><td>Switch container to tabbed when smaller than min width/height thresholds.</td></tr>
            <tr><td>--backend MODE</td><td>auto</td><td>Select auto, sway, river, or wlroots backend driver.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>

  <footer>
    autotiling-wl 1.1.0 · GPL-3.0-or-later · C17 + Meson for Sway, River &amp; wlroots
  </footer>

  <script>
    (function () {
      var DISTROS = {
        fedora: {
          headline: 'Fedora Linux 45 installation',
          summaryHtml: 'Install the <strong>Fedora 45</strong> toolchain in Step 01, then clone the repository and choose <strong>Option A (Meson into /usr/local)</strong> or <strong>Option B (native RPM into /usr)</strong>.',
          steps: [
            {
              title: '01. Install Fedora 45 toolchain, Wayland headers & RPM tools',
              desc: 'Installs gcc, meson, ninja, pkgconf, wayland-scanner, wayland-protocols >= 1.36, json-c, and RPM packaging macros.',
              cmd: 'sudo dnf install -y gcc meson ninja-build pkgconf-pkg-config wayland-devel wayland-protocols-devel json-c-devel rpm-build redhat-rpm-config rpmdevtools gzip tar systemd-rpm-macros'
            },
            {
              title: '02. Option A: Build and install with Meson (/usr/local)',
              desc: 'Standard source build with optional autotiling compatibility symlink.',
              cmd: 'git clone https://github.com/<your-username>/autotiling-wl.git\\ncd autotiling-wl\\nmeson setup build --prefix=/usr/local -Dcompat_symlink=true\\nninja -C build\\nsudo ninja -C build install\\nautotiling-wl --init-config'
            },
            {
              title: '03. Option B: Build and install a Fedora 45 RPM (/usr)',
              desc: 'Builds a clean RPM package managed by dnf with systemd user unit integration.',
              cmd: 'git clone https://github.com/<your-username>/autotiling-wl.git\\nrpmdev-setuptree\\ntar --transform "s,^autotiling-wl,autotiling-wl-1.1.0," -czf ~/rpmbuild/SOURCES/autotiling-wl-1.1.0.tar.gz autotiling-wl\\ncp autotiling-wl/packaging/fedora/autotiling-wl.spec ~/rpmbuild/SPECS/\\nrpmbuild -ba ~/rpmbuild/SPECS/autotiling-wl.spec\\nsudo dnf install -y ~/rpmbuild/RPMS/$(uname -m)/autotiling-wl-1.1.0-1.fc45.$(uname -m).rpm'
            },
            {
              title: '04. Enable systemd user service or launch directly',
              desc: 'RPM installs /usr/lib/systemd/user/autotiling-wl.service automatically.',
              cmd: 'systemctl --user enable --now autotiling-wl.service\\n# Pause/resume anytime:\\n# systemctl --user reload autotiling-wl.service'
            }
          ]
        },
        debian: {
          headline: 'Debian (Trixie / Testing / Sid) installation',
          summaryHtml: 'Requires <mark>wayland-protocols &gt;= 1.36</mark> and <mark>libjson-c-dev &gt;= 0.17</mark> (<strong>Debian 13 Trixie and newer</strong>). Build via Meson or <code>dpkg-buildpackage</code>.',
          steps: [
            {
              title: '01. Install Debian build dependencies & debhelper',
              desc: 'Pulls build-essential, meson, ninja-build, libwayland-bin (wayland-scanner), wayland-protocols, and json-c.',
              cmd: 'sudo apt update\\nsudo apt install -y build-essential meson ninja-build pkg-config libwayland-dev libwayland-bin wayland-protocols libjson-c-dev debhelper devscripts'
            },
            {
              title: '02. Option A: Build and install with Meson (/usr/local)',
              desc: 'Direct Meson install with man page, base config template, and autotiling symlink.',
              cmd: 'git clone https://github.com/<your-username>/autotiling-wl.git\\ncd autotiling-wl\\nmeson setup build --prefix=/usr/local -Dcompat_symlink=true\\nninja -C build\\nsudo ninja -C build install\\nautotiling-wl --init-config'
            },
            {
              title: '03. Option B: Build and install a native .deb package (/usr)',
              desc: 'Uses packaging/debian metadata to produce an apt-managed .deb package.',
              cmd: 'git clone https://github.com/<your-username>/autotiling-wl.git\\ncd autotiling-wl\\ncp -r packaging/debian debian\\nchmod +x debian/rules\\ndpkg-buildpackage -us -uc -b\\nsudo apt install -y ../autotiling-wl_1.1.0-1_*.deb'
            },
            {
              title: '04. Enable systemd user service or launch directly',
              desc: 'Run via systemd user session (.deb install) or exec_always in Sway.',
              cmd: 'systemctl --user enable --now autotiling-wl.service\\n# Or launch from Sway config:\\n# exec_always autotiling-wl'
            }
          ]
        },
        arch: {
          headline: 'Arch Linux installation',
          summaryHtml: 'Install <code>base-devel</code>, Meson, Wayland, and <code>json-c</code>, then build with Meson or <strong>makepkg</strong>.',
          steps: [
            {
              title: '01. Install Arch Linux toolchain and Wayland packages',
              desc: 'Pulls base-devel, meson, ninja, pkgconf, wayland, wayland-protocols, and json-c.',
              cmd: 'sudo pacman -S --needed base-devel meson ninja pkgconf wayland wayland-protocols json-c'
            },
            {
              title: '02. Option A: Build and install with Meson (/usr/local)',
              desc: 'Direct Meson build with optional autotiling drop-in compatibility symlink.',
              cmd: 'git clone https://github.com/<your-username>/autotiling-wl.git\\ncd autotiling-wl\\nmeson setup build --prefix=/usr/local -Dcompat_symlink=true\\nninja -C build\\nsudo ninja -C build install\\nautotiling-wl --init-config'
            },
            {
              title: '03. Option B: Build and install via PKGBUILD (makepkg)',
              desc: 'Creates and installs a tracked pacman package using packaging/arch/PKGBUILD.',
              cmd: 'git clone https://github.com/<your-username>/autotiling-wl.git\\nmkdir -p autotiling-wl-pkg\\ntar --transform "s,^autotiling-wl,autotiling-wl-1.1.0," -czf autotiling-wl-pkg/autotiling-wl-1.1.0.tar.gz autotiling-wl\\ncp autotiling-wl/packaging/arch/PKGBUILD autotiling-wl-pkg/\\ncd autotiling-wl-pkg\\nmakepkg -si'
            },
            {
              title: '04. Enable systemd user service or launch directly',
              desc: 'Enable autotiling-wl.service after makepkg or run directly in Sway/River.',
              cmd: 'systemctl --user enable --now autotiling-wl.service\\n# Verify installation:\\nautotiling-wl --version && man autotiling-wl'
            }
          ]
        },
        void: {
          headline: 'Void Linux installation',
          summaryHtml: 'Void runs <mark>runit without systemd</mark>; <strong><code>sd_notify</code> gracefully no-ops</strong> when <code>$NOTIFY_SOCKET</code> is unset. Install build deps via <code>xbps-install</code> and <strong>launch directly from Sway or River</strong>.',
          steps: [
            {
              title: '01. Install Void Linux dependencies via xbps-install',
              desc: 'Installs base-devel, meson, ninja, pkg-config, wayland-devel, wayland-protocols, and json-c-devel.',
              cmd: 'sudo xbps-install -Sy base-devel meson ninja pkg-config wayland-devel wayland-protocols json-c-devel'
            },
            {
              title: '02. Option A: Build and install with Meson (/usr/local)',
              desc: 'Compiles autotiling-wl, base config, and man page without requiring systemd.',
              cmd: 'git clone https://github.com/<your-username>/autotiling-wl.git\\ncd autotiling-wl\\nmeson setup build --prefix=/usr/local -Dcompat_symlink=true\\nninja -C build\\nsudo ninja -C build install\\nautotiling-wl --init-config'
            },
            {
              title: '03. Option B: Package with xbps-src (void-packages)',
              desc: 'Optional XBPS package build using packaging/void/template.',
              cmd: 'cp autotiling-wl/packaging/void/template void-packages/srcpkgs/autotiling-wl/template\\n# Update distfiles/checksum in template, then run in void-packages:\\n./xbps-src pkg autotiling-wl\\nsudo xbps-install -R hostdir/binpkgs autotiling-wl'
            },
            {
              title: '04. Launch directly from Sway or River (runit / non-systemd)',
              desc: 'Void starts compositors without systemd; launch directly and toggle pause with SIGUSR1.',
              cmd: '# Sway (~/.config/sway/config):\\nexec_always autotiling-wl\\nbindsym $mod+Shift+t exec pkill -USR1 autotiling-wl\\n\\n# River (~/.config/river/init):\\nautotiling-wl --backend river &\\nriverctl default-layout autotiling-wl'
            }
          ]
        }
      };

      var ORDER = ['fedora', 'debian', 'arch', 'void'];
      var headlineEl = document.getElementById('distro-headline');
      var summaryEl = document.getElementById('distro-summary');
      var containerEl = document.getElementById('steps-container');
      var tabButtons = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));

      function escapeHtml(str) {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      function bindCopyButtons(scope) {
        var btns = scope.querySelectorAll('.copy-btn');
        for (var i = 0; i < btns.length; i++) {
          btns[i].addEventListener('click', function () {
            var btn = this;
            var targetId = btn.getAttribute('data-copy-target');
            var pre = targetId ? document.getElementById(targetId) : btn.nextElementSibling;
            if (!pre) return;
            navigator.clipboard.writeText(pre.textContent || '');
            btn.textContent = 'Copied';
            btn.classList.add('copied');
            setTimeout(function () {
              btn.textContent = 'Copy';
              btn.classList.remove('copied');
            }, 1600);
          });
        }
      }

      function renderDistro(id, updateHash) {
        var cfg = DISTROS[id] || DISTROS.fedora;
        var activeId = DISTROS[id] ? id : 'fedora';
        headlineEl.textContent = cfg.headline;
        summaryEl.innerHTML = cfg.summaryHtml;

        for (var i = 0; i < tabButtons.length; i++) {
          var btn = tabButtons[i];
          btn.setAttribute('aria-selected', btn.getAttribute('data-distro') === activeId ? 'true' : 'false');
        }

        var html = '';
        for (var j = 0; j < cfg.steps.length; j++) {
          var step = cfg.steps[j];
          var stepId = 'step-code-' + activeId + '-' + j;
          html +=
            '<div class="card">' +
              '<div>' +
                '<h3>' + escapeHtml(step.title) + '</h3>' +
                '<p>' + escapeHtml(step.desc) + '</p>' +
              '</div>' +
              '<div class="code-box">' +
                '<button type="button" class="copy-btn" data-copy-target="' + stepId + '">Copy</button>' +
                '<pre id="' + stepId + '">' + escapeHtml(step.cmd) + '</pre>' +
              '</div>' +
            '</div>';
        }
        containerEl.innerHTML = html;
        bindCopyButtons(containerEl);

        if (updateHash && window.history && window.history.replaceState) {
          window.history.replaceState(null, '', '#' + activeId);
        }
      }

      for (var k = 0; k < tabButtons.length; k++) {
        tabButtons[k].addEventListener('click', function () {
          renderDistro(this.getAttribute('data-distro'), true);
        });
        tabButtons[k].addEventListener('keydown', function (ev) {
          var idx = ORDER.indexOf(this.getAttribute('data-distro'));
          if (idx === -1) return;
          if (ev.key === 'ArrowRight') {
            var next = ORDER[(idx + 1) % ORDER.length];
            renderDistro(next, true);
            tabButtons[ORDER.indexOf(next)].focus();
          } else if (ev.key === 'ArrowLeft') {
            var prev = ORDER[(idx + ORDER.length - 1) % ORDER.length];
            renderDistro(prev, true);
            tabButtons[ORDER.indexOf(prev)].focus();
          }
        });
      }

      bindCopyButtons(document);
      var initialHash = (window.location.hash || '').replace('#', '');
      renderDistro(DISTROS[initialHash] ? initialHash : 'fedora', false);
    })();
  </script>
</body>
</html>
`,
  },
];
