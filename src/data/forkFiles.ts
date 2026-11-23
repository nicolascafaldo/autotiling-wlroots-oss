export interface ForkFile {
  path: string;
  language: 'c' | 'meson' | 'xml' | 'spec' | 'ini' | 'markdown' | 'troff';
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

# Dynamic orientation-aware split ratios
split_ratio = 1.00
split_ratio_landscape = 1.00
split_ratio_portrait = 0.80

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
# Per-workspace layout modes: dwindle | master-stack | tabbed
# 1 = dwindle
# 2 = master-stack
# 3 = tabbed

[float_rules]
# Substring rules matched against Wayland app_id or window title.
# Prefix with app_id: or title: to target a single property.
rule = app_id:pavucontrol
rule = app_id:org.gnome.Calculator
rule = app_id:nm-connection-editor
rule = title:Picture-in-Picture
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
.BR \-\-tabbed\-on\-min
Switch container layout to \fBtabbed\fR when below \fB--splitwidth\fR or \fB--splitheight\fR.
.TP
.BR \-\-float\-rule " " \fIRULE\fR
Add an auto-float rule (\fIapp_id:foo\fR or \fItitle:bar\fR). May be repeated.
.TP
.BR \-\-ws\-layout " " \fIWS:MODE\fR
Set per-workspace layout mode (\fIdwindle\fR, \fImaster-stack\fR, or \fItabbed\fR).
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
  WS_MODE_TABBED,
} WorkspaceLayoutMode;

typedef enum {
  FLOAT_MATCH_ANY = 0,
  FLOAT_MATCH_APP_ID,
  FLOAT_MATCH_TITLE,
} FloatMatchField;

typedef struct {
  FloatMatchField field;
  char pattern[128];
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
  AutotileBackend backend;

  char *outputs[MAX_FILTER_ITEMS];
  size_t outputs_count;

  char *workspaces[MAX_FILTER_ITEMS];
  size_t workspaces_count;

  char *events[MAX_EVENT_ITEMS];
  size_t events_count;

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
  ContainerRect rect;
  int output_width;
  int output_height;
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
} SplitDecision;

void autotile_config_init(AutotileConfig *cfg);
void autotile_config_free(AutotileConfig *cfg);
bool autotile_add_float_rule(AutotileConfig *cfg, const char *spec);
bool autotile_add_ws_mode(AutotileConfig *cfg, const char *spec);

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
    summary: 'Implements recursive dwindle splits, auto-float rules, per-workspace layout modes, dynamic orientation ratio, and tabbed fallback.',
    content: `#include "autotile.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

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
  cfg->backend = BACKEND_AUTO;
}

void autotile_config_free(AutotileConfig *cfg) {
  for (size_t i = 0; i < cfg->outputs_count; i++) free(cfg->outputs[i]);
  for (size_t i = 0; i < cfg->workspaces_count; i++) free(cfg->workspaces[i]);
  for (size_t i = 0; i < cfg->events_count; i++) free(cfg->events[i]);
}

bool autotile_add_float_rule(AutotileConfig *cfg, const char *spec) {
  if (!spec || !*spec || cfg->float_rules_count >= MAX_FLOAT_RULES) {
    return false;
  }
  AutoFloatRule *rule = &cfg->float_rules[cfg->float_rules_count++];
  memset(rule, 0, sizeof(*rule));
  if (strncmp(spec, "app_id:", 7) == 0) {
    rule->field = FLOAT_MATCH_APP_ID;
    snprintf(rule->pattern, sizeof(rule->pattern), "%s", spec + 7);
  } else if (strncmp(spec, "title:", 6) == 0) {
    rule->field = FLOAT_MATCH_TITLE;
    snprintf(rule->pattern, sizeof(rule->pattern), "%s", spec + 6);
  } else {
    rule->field = FLOAT_MATCH_ANY;
    snprintf(rule->pattern, sizeof(rule->pattern), "%s", spec);
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

static bool match_float_rules(const AutotileConfig *cfg, const FocusedContainer *focused) {
  for (size_t i = 0; i < cfg->float_rules_count; i++) {
    const AutoFloatRule *r = &cfg->float_rules[i];
    if (!r->pattern[0]) continue;
    if (r->field == FLOAT_MATCH_APP_ID && strstr(focused->app_id, r->pattern)) return true;
    if (r->field == FLOAT_MATCH_TITLE && strstr(focused->title, r->pattern)) return true;
    if (r->field == FLOAT_MATCH_ANY &&
        (strstr(focused->app_id, r->pattern) || strstr(focused->title, r->pattern))) {
      return true;
    }
  }
  return false;
}

static WorkspaceLayoutMode resolve_ws_mode(
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

SplitDecision autotile_evaluate_split(
  const AutotileConfig *cfg,
  const FocusedContainer *focused
) {
  SplitDecision decision = {
    .direction = SPLIT_NONE,
    .command = NULL,
    .skip_reason = NULL,
  };

  if (cfg->paused) {
    decision.skip_reason = "autotiling paused via SIGUSR1";
    return decision;
  }

  if (!focused) {
    decision.skip_reason = "no focused container";
    return decision;
  }

  if (!focused->floating && match_float_rules(cfg, focused)) {
    decision.direction = SPLIT_FLOAT_ENABLE;
    decision.command = "floating enable";
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

  WorkspaceLayoutMode ws_mode = resolve_ws_mode(
    cfg, focused->workspace_num, focused->workspace_name);

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
  if (ws_mode == WS_MODE_MASTER_STACK && (effective_limit == 0 || effective_limit > 2)) {
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
      else if (strcmp(key, "split_width") == 0) cfg->split_width = atoi(val);
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
  bool horizontal = ((double)h <= ((double)w / ratio));

  if (at_limit) {
    int slice_h = h / (int)count;
    for (uint32_t i = 0; i < count; i++) {
      int ch = (i == count - 1) ? (h - slice_h * (int)i) : slice_h;
      river_layout_v3_push_view_dimensions(layout, x, y + slice_h * (int)i, w, ch, serial);
    }
    return;
  }

  if (horizontal) {
    int left_w = w / 2;
    river_layout_v3_push_view_dimensions(layout, x, y, left_w, h, serial);
    push_dwindle_rect(layout, serial, x + left_w, y, w - left_w, h,
                      count - 1, split_ratio, limit, depth + 1);
  } else {
    int top_h = h / 2;
    river_layout_v3_push_view_dimensions(layout, x, y, w, top_h, serial);
    push_dwindle_rect(layout, serial, x, y + top_h, w, h - top_h,
                      count - 1, split_ratio, limit, depth + 1);
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

  double ratio = cfg->split_ratio > 0.0 ? cfg->split_ratio : 1.0;
  if (usable_height > usable_width && cfg->split_ratio_portrait > 0.0) {
    ratio = cfg->split_ratio_portrait;
  } else if (usable_width >= usable_height && cfg->split_ratio_landscape > 0.0) {
    ratio = cfg->split_ratio_landscape;
  }

  push_dwindle_rect(layout, serial, 0, 0, (int)usable_width, (int)usable_height,
                    view_count, ratio, cfg->limit, 1);

  const char *name = (cfg->limit == 2) ? "autotiling-wl (master-stack)" : "autotiling-wl (dwindle)";
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
    summary: 'Sway/i3 IPC Unix domain socket client interface.',
    content: `#ifndef AUTOTILING_WL_SWAY_IPC_H
#define AUTOTILING_WL_SWAY_IPC_H

#include "autotile.h"
#include <stdbool.h>

typedef struct {
  int event_fd;
  int cmd_fd;
  char socket_path[256];
  bool debug;
} SwayIpcClient;

bool sway_ipc_connect(SwayIpcClient *client, bool debug);
void sway_ipc_disconnect(SwayIpcClient *client);
bool sway_ipc_subscribe(SwayIpcClient *client, const char *const *events, size_t count);
bool sway_ipc_read_event(SwayIpcClient *client);
bool sway_ipc_get_focused(SwayIpcClient *client, FocusedContainer *out_focused);
bool sway_ipc_run_command(SwayIpcClient *client, const char *cmd);

#endif /* AUTOTILING_WL_SWAY_IPC_H */
`,
  },
  {
    path: 'src/sway_ipc.c',
    language: 'c',
    category: 'Core',
    summary: 'Binary Sway IPC client extracting app_id, title, output rect, depth, and executing split/tabbed/floating commands.',
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

bool sway_ipc_read_event(SwayIpcClient *client) {
  uint32_t ev_type = 0;
  char *payload = recv_ipc_packet(client->event_fd, &ev_type);
  if (!payload) return false;
  free(payload);
  return true;
}

static bool find_focused_recursive(
  struct json_object *node,
  struct json_object *parent,
  const char *output_name,
  int out_w,
  int out_h,
  const char *ws_name,
  int ws_num,
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
    out->output_width = out_w;
    out->output_height = out_h;
    snprintf(out->output_name, sizeof(out->output_name), "%s", output_name ? output_name : "");
    snprintf(out->workspace_name, sizeof(out->workspace_name), "%s", ws_name ? ws_name : "");

    struct json_object *app_obj = NULL, *title_obj = NULL, *rect_obj = NULL;
    if (json_object_object_get_ex(node, "app_id", &app_obj) && json_object_get_string(app_obj)) {
      snprintf(out->app_id, sizeof(out->app_id), "%s", json_object_get_string(app_obj));
    }
    if (json_object_object_get_ex(node, "name", &title_obj) && json_object_get_string(title_obj)) {
      snprintf(out->title, sizeof(out->title), "%s", json_object_get_string(title_obj));
    }
    if (json_object_object_get_ex(node, "rect", &rect_obj)) {
      struct json_object *v = NULL;
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
                                   ws_name, ws_num, depth, out)) {
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
  bool found = find_focused_recursive(root, NULL, "", 0, 0, "", -1, 0, out_focused);
  json_object_put(root);
  return found;
}

bool sway_ipc_run_command(SwayIpcClient *client, const char *cmd) {
  if (!send_ipc_packet(client->cmd_fd, IPC_RUN_COMMAND, cmd)) return false;
  char *reply = recv_ipc_packet(client->cmd_fd, NULL);
  free(reply);
  return reply != NULL;
}
`,
  },
  {
    path: 'src/main.c',
    language: 'c',
    category: 'Core',
    summary: 'Main daemon entrypoint with SIGUSR1 pause toggle, config loader, --init-config, systemd watchdog poll, River + Sway + Wayland event loop.',
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
    "  -h, --help                    Show this help message and exit\\n"
    "  -d, --debug                   Print debug messages to stderr\\n"
    "  -v, --version                 Display version information\\n"
    "  -c, --config PATH             Load config file from PATH\\n"
    "      --init-config             Copy base config to ~/.config/autotiling-wl/config\\n"
    "  -o, --outputs OUT...          Restrict autotiling to specified output names\\n"
    "  -w, --workspaces WS...        Restrict autotiling to specified workspace numbers\\n"
    "  -l, --limit N                 Max split depth (0 = dwindle default, 2 = master-stack)\\n"
    "  -sw, --splitwidth PX          Minimum container width threshold\\n"
    "  -sh, --splitheight PX         Minimum container height threshold\\n"
    "  -sr, --splitratio R           Height/width ratio multiplier (default: 1.0)\\n"
    "      --splitratio-portrait R   Split ratio when monitor height > width\\n"
    "      --tabbed-on-min           Fallback to layout tabbed when below min thresholds\\n"
    "      --float-rule RULE         Auto-float rule (app_id:foo or title:bar)\\n"
    "      --ws-layout WS:MODE       Workspace layout mode (dwindle|master-stack|tabbed)\\n"
    "  -e, --events EV...            Sway IPC events to subscribe to (default: window)\\n"
    "      --backend MODE            auto | sway | river | wlroots (default: auto)\\n",
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

static void process_sway_focus(const AutotileConfig *cfg, SwayIpcClient *ipc) {
  FocusedContainer focused;
  if (!sway_ipc_get_focused(ipc, &focused)) return;

  SplitDecision decision = autotile_evaluate_split(cfg, &focused);
  if (decision.direction != SPLIT_NONE && decision.command) {
    sway_ipc_run_command(ipc, decision.command);
    if (cfg->debug) {
      fprintf(stderr, "[autotile] %s (app=%s %dx%d depth=%d ws=%s out=%s)\\n",
              decision.command, focused.app_id, focused.rect.width,
              focused.rect.height, focused.depth, focused.workspace_name,
              focused.output_name);
    }
  } else if (cfg->debug && decision.skip_reason) {
    fprintf(stderr, "[autotile] skip: %s\\n", decision.skip_reason);
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
  };

  static const struct option long_opts[] = {
    {"help",                no_argument,       NULL, 'h'},
    {"debug",               no_argument,       NULL, 'd'},
    {"version",             no_argument,       NULL, 'v'},
    {"config",              required_argument, NULL, 'c'},
    {"init-config",         no_argument,       NULL, OPT_INIT_CONFIG},
    {"outputs",             required_argument, NULL, 'o'},
    {"workspaces",          required_argument, NULL, 'w'},
    {"limit",               required_argument, NULL, 'l'},
    {"splitwidth",          required_argument, NULL, 'W'},
    {"splitheight",         required_argument, NULL, 'H'},
    {"splitratio",          required_argument, NULL, 'R'},
    {"splitratio-portrait", required_argument, NULL, OPT_RATIO_PORTRAIT},
    {"tabbed-on-min",       no_argument,       NULL, OPT_TABBED_ON_MIN},
    {"float-rule",          required_argument, NULL, OPT_FLOAT_RULE},
    {"ws-layout",           required_argument, NULL, OPT_WS_LAYOUT},
    {"events",              required_argument, NULL, 'e'},
    {"backend",             required_argument, NULL, OPT_BACKEND},
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

  if (use_sway) {
    process_sway_focus(&cfg, &ipc);
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
        process_sway_focus(&cfg, &ipc);
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
        if (use_sway) process_sway_focus(&cfg, &ipc);
      }
    }

    if (use_sway && (fds[1].revents & POLLIN)) {
      if (!sway_ipc_read_event(&ipc)) break;
      process_sway_focus(&cfg, &ipc);
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
    path: 'README.md',
    language: 'markdown',
    category: 'Docs & Config',
    summary: 'User-ready GitHub README covering features, Fedora installation, configuration, and Sway/River setup.',
    content: `# autotiling-wl

Automatic window tiling for **Sway**, **River**, and modern **wlroots** Wayland compositors.

\`autotiling-wl\` automatically switches split direction based on the shape of your focused window to create a **dwindle** layout by default, while keeping drop-in compatibility with original \`autotiling\` flags and configs.

## Features

- **Dwindle layout by default**: Splits windows recursively along their longest edge without requiring manual split shortcuts.
- **Optional master-stack cap**: Limit split depth with \`--limit 2\` globally or per workspace.
- **Per-workspace layout modes**: Assign \`dwindle\`, \`master-stack\`, or \`tabbed\` layouts to specific workspaces.
- **Auto-floating rules**: Automatically float dialogs, mixers, or Picture-in-Picture windows by \`app_id\` or window title.
- **Orientation-aware split ratios**: Use separate split ratios for landscape and portrait/vertical monitors.
- **Minimum-size tabbed fallback**: Switch tiny splits to \`tabbed\` automatically with \`--tabbed-on-min\`.
- **Pause/resume anytime**: Send \`SIGUSR1\` (\`pkill -USR1 autotiling-wl\`) to pause or resume tiling without restarting.
- **Multi-compositor support**: Works seamlessly with Sway, River (\`river-layout-v3\`), and systemd user sessions.

---

## Installation (Fedora Linux 45)

### 1. Install dependencies

\`\`\`bash
sudo dnf install -y gcc meson ninja-build pkgconf-pkg-config wayland-devel wayland-protocols-devel json-c-devel rpm-build redhat-rpm-config rpmdevtools gzip tar systemd-rpm-macros
\`\`\`

### 2. Build and install

#### Option A: Standard install (\`/usr/local\`)

\`\`\`bash
git clone https://github.com/<your-username>/autotiling-wl.git
cd autotiling-wl
meson setup build --prefix=/usr/local -Dcompat_symlink=true
ninja -C build
sudo ninja -C build install
\`\`\`

> Pass \`-Dcompat_symlink=true\` if you want an \`autotiling\` symlink so existing Sway configs work without edits.

#### Option B: Build and install an RPM package (\`/usr\`)

\`\`\`bash
git clone https://github.com/<your-username>/autotiling-wl.git
rpmdev-setuptree
tar --transform 's,^autotiling-wl,autotiling-wl-1.1.0,' -czf ~/rpmbuild/SOURCES/autotiling-wl-1.1.0.tar.gz autotiling-wl
cp autotiling-wl/packaging/fedora/autotiling-wl.spec ~/rpmbuild/SPECS/
rpmbuild -ba ~/rpmbuild/SPECS/autotiling-wl.spec
sudo dnf install -y ~/rpmbuild/RPMS/$(uname -m)/autotiling-wl-1.1.0-1.fc45.$(uname -m).rpm
\`\`\`

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

### Systemd User Service (Optional)

> Note: \`autotiling-wl.service\` runs \`/usr/bin/autotiling-wl\` (the default path when installed via the RPM package or \`--prefix=/usr\`).

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
| \`--tabbed-on-min\` | Switch to \`tabbed\` when below min width/height | \`false\` |
| \`--float-rule RULE\` | Auto-float rule (\`app_id:foo\` or \`title:bar\`) | — |
| \`--ws-layout WS:MODE\` | Per-workspace mode (\`dwindle\`, \`master-stack\`, \`tabbed\`) | \`dwindle\` |
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
];
