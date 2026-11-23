interface ProtocolRow {
  protocol: string;
  version: string;
  role: string;
  compositors: string;
}

interface CliFlagRow {
  flag: string;
  arg: string;
  defaultVal: string;
  behavior: string;
}

const PROTOCOL_ROWS: ProtocolRow[] = [
  {
    protocol: 'ext_workspace_manager_v1',
    version: 'v1 (staging)',
    role: 'Tracks active workspace IDs, names, urgency, and output group associations without polling.',
    compositors: 'Sway 1.11+, wlroots 0.19+, LabWC, Wayfire',
  },
  {
    protocol: 'ext_foreign_toplevel_list_v1',
    version: 'v1 (staging)',
    role: 'Standardized cross-compositor window creation, title, and app_id tracking.',
    compositors: 'Sway 1.10+, wlroots 0.18+, COSMIC, Hyprland',
  },
  {
    protocol: 'zwlr_foreign_toplevel_manager_v1',
    version: 'v3 (unstable)',
    role: 'Tracks activated, fullscreen, minimized, and output enter/leave states for active windows.',
    compositors: 'Sway, River, LabWC, Wayfire, Cage',
  },
  {
    protocol: 'river_layout_manager_v3',
    version: 'v2 (river-layout-v3)',
    role: 'Computes recursive dwindle and master-stack view rectangles natively via layout_demand.',
    compositors: 'River',
  },
  {
    protocol: 'wl_output + zxdg_output_manager_v1',
    version: 'v4 / v3',
    role: 'Handles live monitor hotplug add/remove events, connector names, and portrait/landscape aspect.',
    compositors: 'All wlroots compositors',
  },
  {
    protocol: '$SWAYSOCK i3-ipc',
    version: 'Binary JSON IPC',
    role: 'Inspects container depth, app_id/title float rules, and executes splith, splitv, or layout tabbed.',
    compositors: 'Sway, i3 (compat fallback)',
  },
  {
    protocol: '$NOTIFY_SOCKET (sd_notify)',
    version: 'AF_UNIX SOCK_DGRAM',
    role: 'Reports READY=1, STATUS= (including SIGUSR1 pause state), and WATCHDOG=1 pings to systemd.',
    compositors: 'Fedora systemd --user sessions',
  },
];

const CLI_PARITY_ROWS: CliFlagRow[] = [
  {
    flag: '-h, --help / -v, --version',
    arg: 'none',
    defaultVal: '1.1.0',
    behavior: 'Prints usage summary or version string and exits cleanly.',
  },
  {
    flag: '-d, --debug',
    arg: 'none',
    defaultVal: 'false',
    behavior: 'Logs Wayland registry binds, hotplug events, and split decisions to stderr.',
  },
  {
    flag: '-c, --config / --init-config',
    arg: 'PATH',
    defaultVal: '~/.config/autotiling-wl/config',
    behavior: 'Loads INI config (with $PREFIX/share/autotiling-wl/config fallback) or initializes user file.',
  },
  {
    flag: '-o, --outputs',
    arg: 'OUT...',
    defaultVal: 'all',
    behavior: 'Restricts split switching to listed Wayland output names (e.g. DP-1 HDMI-A-1).',
  },
  {
    flag: '-w, --workspaces',
    arg: 'WS...',
    defaultVal: 'all',
    behavior: 'Restricts split switching to listed workspace numbers or names.',
  },
  {
    flag: '-l, --limit',
    arg: 'N',
    defaultVal: '0 (dwindle)',
    behavior: 'Default 0 enables unlimited recursive dwindle splitting; set N > 0 (e.g. 2) to cap depth.',
  },
  {
    flag: '-sw, --splitwidth / -sh, --splitheight',
    arg: 'PX',
    defaultVal: '0',
    behavior: 'Minimum width/height thresholds before splitting stops (or switches to tabbed with --tabbed-on-min).',
  },
  {
    flag: '-sr, --splitratio / --splitratio-portrait',
    arg: 'R',
    defaultVal: '1.0 / 0.80',
    behavior: 'Height/width ratio threshold; portrait override activates automatically on vertical monitors.',
  },
  {
    flag: '--tabbed-on-min',
    arg: 'none',
    defaultVal: 'false',
    behavior: 'Issues layout tabbed instead of skipping when container is smaller than min thresholds.',
  },
  {
    flag: '--float-rule',
    arg: 'RULE',
    defaultVal: 'none',
    behavior: 'Matches app_id: or title: substring and runs floating enable automatically.',
  },
  {
    flag: '--ws-layout',
    arg: 'WS:MODE',
    defaultVal: 'dwindle',
    behavior: 'Assigns per-workspace modes (dwindle, master-stack, or tabbed).',
  },
  {
    flag: '-e, --events / --backend',
    arg: 'EV... / MODE',
    defaultVal: 'window / auto',
    behavior: 'Configures Sway IPC subscriptions or forces auto, sway, river, or wlroots backend.',
  },
];

export function ArchitectureSection() {
  return (
    <section id="architecture" className="py-12 border-b border-slate-200 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Dual-bus Wayland, River &amp; Sway IPC architecture
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              <code className="font-mono text-slate-800">autotiling-wl</code> multiplexes <code className="font-mono text-slate-800">wl_display_get_fd()</code>, <code className="font-mono text-slate-800">$SWAYSOCK</code>, and <code className="font-mono text-slate-800">$NOTIFY_SOCKET</code> inside a single <code className="font-mono text-slate-800">poll()</code> loop with <code className="font-mono text-slate-800">SIGUSR1</code> pause handling.
            </p>
            <div className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-sm">
              <div>
                <div className="font-semibold text-slate-900">01. Dwindle Default + Workspace Overrides</div>
                <p className="text-slate-600 mt-0.5">
                  Splits recursively by default (<code className="font-mono text-xs">--limit 0</code>), while supporting per-workspace <code className="font-mono text-xs">master-stack</code> or <code className="font-mono text-xs">tabbed</code> overrides and min-size tabbed fallbacks.
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-900">02. Live Output Hotplug &amp; Orientation Awareness</div>
                <p className="text-slate-600 mt-0.5">
                  Listens to <code className="font-mono text-xs">wl_registry</code> global add/remove events and automatically adapts <code className="font-mono text-xs">splitratio</code> for portrait vs landscape displays.
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-900">03. Native Systemd &amp; River Integration</div>
                <p className="text-slate-600 mt-0.5">
                  Speaks <code className="font-mono text-xs">river-layout-v3</code> natively on River and reports readiness, status, and watchdog heartbeats over <code className="font-mono text-xs">sd_notify</code>.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70">
              <h3 className="text-sm font-semibold text-slate-900">
                Wayland Protocol, Signal &amp; IPC Bindings
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-4 font-medium">Interface</th>
                    <th className="py-2.5 px-3 font-medium">Revision</th>
                    <th className="py-2.5 px-3 font-medium">Responsibility</th>
                    <th className="py-2.5 px-4 font-medium">Compositors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PROTOCOL_ROWS.map((row) => (
                    <tr key={row.protocol} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {row.protocol}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {row.version}
                      </td>
                      <td className="py-3 px-3 text-slate-600 min-w-[220px]">{row.role}</td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {row.compositors}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <h3 className="text-sm font-semibold text-slate-900">
              CLI Flag &amp; Signal Compatibility Matrix
            </h3>
            <span className="text-xs text-slate-500">
              Send SIGUSR1 to pause/resume · Legacy -sw, -sh, -sr supported
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-4 font-medium">Flag</th>
                  <th className="py-2.5 px-3 font-medium">Argument</th>
                  <th className="py-2.5 px-3 font-medium">Default</th>
                  <th className="py-2.5 px-4 font-medium">Behavior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CLI_PARITY_ROWS.map((row) => (
                  <tr key={row.flag} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {row.flag}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {row.arg}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {row.defaultVal}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{row.behavior}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
