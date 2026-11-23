export type ContainerLayout = 'splith' | 'splitv' | 'tabbed' | 'stacked';
export type WorkspaceMode = 'dwindle' | 'master-stack' | 'center-master' | 'tabbed';
export type ForceSplitSide = 'auto' | 'left' | 'right';
export type NewWindowStatus = 'slave' | 'master';

export interface FloatRule {
  id: string;
  field: 'app_id' | 'title' | 'any';
  pattern: string;
  actions?: string;
}

export interface ParsedRuleActions {
  float: boolean;
  sticky: boolean;
  center: boolean;
  sizePct?: [number, number];
  movePct?: [number, number];
  opacity?: number;
  borderNone: boolean;
}

export interface SimConfig {
  limit: number;
  paused: boolean;
  splitRatio: number;
  dynamicOrientationRatio: boolean;
  splitRatioLandscape: number;
  splitRatioPortrait: number;
  mfact: number;
  forceSplit: ForceSplitSide;
  newStatus: NewWindowStatus;
  singleWindowAspect: string;
  smartGaps: boolean;
  innerGap: number;
  outerGap: number;
  enableSwallow: boolean;
  swallowTerminals: string[];
  splitWidth: number;
  splitHeight: number;
  tabbedOnMin: boolean;
  outputsFilter: string[];
  workspacesFilter: string[];
  events: string[];
  workspaceModes: Record<number, WorkspaceMode>;
  floatRules: FloatRule[];
  debug: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TreeNode {
  id: string;
  kind: 'container' | 'window';
  layout?: ContainerLayout;
  children?: TreeNode[];
  appId?: string;
  title?: string;
  floating?: boolean;
  fullscreen?: boolean;
  sticky?: boolean;
  sizePct?: [number, number];
  movePct?: [number, number];
  opacity?: number;
  borderNone?: boolean;
  swallowed?: TreeNode;
}

export interface ComputedWindow {
  id: string;
  appId: string;
  title: string;
  rect: Rect;
  depth: number;
  parentId: string;
  parentLayout: ContainerLayout;
  floating: boolean;
  fullscreen: boolean;
  sticky?: boolean;
  opacity?: number;
  borderNone?: boolean;
  aspectCentered?: boolean;
  hasSwallowed?: boolean;
}

export interface SplitEvaluation {
  decision: 'splith' | 'splitv' | 'tabbed' | 'floating' | 'skip';
  skipReason: string | null;
  focusedRect: Rect | null;
  depth: number;
  parentLayout: ContainerLayout | null;
  ratioMetric: string;
  effectiveMode: WorkspaceMode;
  auxCommand: string | null;
}

export interface ProtocolLogEntry {
  id: string;
  timestamp: string;
  channel: 'wayland' | 'sway-ipc' | 'river' | 'systemd' | 'autotile';
  message: string;
}

export interface MonitorPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  outputName: string;
}

export const MONITOR_PRESETS: MonitorPreset[] = [
  { id: 'fhd', label: '1920 × 1080 (FHD)', width: 1920, height: 1080, outputName: 'eDP-1' },
  { id: 'qhd', label: '2560 × 1440 (QHD)', width: 2560, height: 1440, outputName: 'DP-1' },
  { id: 'uwqhd', label: '3440 × 1440 (Ultrawide)', width: 3440, height: 1440, outputName: 'DP-1' },
  { id: 'vertical', label: '1080 × 1920 (Vertical)', width: 1080, height: 1920, outputName: 'HDMI-A-1' },
];

export const SAMPLE_APPS: Array<{ appId: string; title: string }> = [
  { appId: 'foot', title: 'foot — zsh ~/projects/autotiling-wl' },
  { appId: 'org.mozilla.firefox', title: 'Fedora 45 — Wayland Protocol Docs' },
  { appId: 'nvim', title: 'nvim src/autotile.c' },
  { appId: 'btop', title: 'btop — System Monitor' },
  { appId: 'pavucontrol', title: 'Volume Control' },
  { appId: 'org.mozilla.firefox', title: 'Picture-in-Picture' },
  { appId: 'Alacritty', title: 'meson compile -C build' },
  { appId: 'org.gnome.Calculator', title: 'Calculator' },
];

export const DEFAULT_FLOAT_RULES: FloatRule[] = [
  { id: 'fr-1', field: 'app_id', pattern: 'pavucontrol', actions: 'float, size 55% 65%, center' },
  { id: 'fr-2', field: 'app_id', pattern: 'org.gnome.Calculator', actions: 'float, center' },
  { id: 'fr-3', field: 'title', pattern: 'Picture-in-Picture', actions: 'float, sticky, size 28% 28%, move 70% 68%' },
];

export function parseRuleActions(actions?: string): ParsedRuleActions {
  const parsed: ParsedRuleActions = {
    float: true,
    sticky: false,
    center: false,
    borderNone: false,
  };
  if (!actions || !actions.trim()) return parsed;

  const tokens = actions
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  for (const tok of tokens) {
    const low = tok.toLowerCase();
    if (low === 'float') parsed.float = true;
    else if (low === 'sticky') parsed.sticky = true;
    else if (low === 'center') parsed.center = true;
    else if (low === 'border none' || low === 'noborder') parsed.borderNone = true;
    else if (low.startsWith('size ')) {
      const m = low.match(/size\s+(\d+)%\s+(\d+)%/);
      if (m) parsed.sizePct = [Number(m[1]), Number(m[2])];
    } else if (low.startsWith('move ')) {
      const m = low.match(/move\s+(\d+)%\s+(\d+)%/);
      if (m) parsed.movePct = [Number(m[1]), Number(m[2])];
    } else if (low.startsWith('opacity ')) {
      const val = Number(low.replace('opacity', '').trim());
      if (!Number.isNaN(val) && val > 0 && val <= 1) parsed.opacity = val;
    }
  }
  return parsed;
}

export function formatRuleString(rule: FloatRule): string {
  const prefix = rule.field === 'any' ? '' : `${rule.field}:`;
  const actions = rule.actions?.trim();
  return actions ? `${prefix}${rule.pattern} -> ${actions}` : `${prefix}${rule.pattern}`;
}

export function matchesFloatRule(
  appId: string,
  title: string,
  rules: FloatRule[]
): FloatRule | null {
  for (const r of rules) {
    const p = r.pattern.trim();
    if (!p) continue;
    if (r.field === 'app_id' && appId.includes(p)) return r;
    if (r.field === 'title' && title.includes(p)) return r;
    if (r.field === 'any' && (appId.includes(p) || title.includes(p))) return r;
  }
  return null;
}

export function parseAspectRatio(spec: string): number | null {
  const trimmed = spec.trim();
  if (!trimmed || trimmed === '0' || trimmed === '0:0') return null;
  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;
  const w = Number(parts[0]);
  const h = Number(parts[1]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return w / h;
}

export function createInitialTree(): TreeNode {
  return {
    id: 'root',
    kind: 'container',
    layout: 'splith',
    children: [
      {
        id: 'win-1',
        kind: 'window',
        appId: 'foot',
        title: 'foot — zsh ~/projects/autotiling-wl',
      },
      {
        id: 'con-2',
        kind: 'container',
        layout: 'splitv',
        children: [
          {
            id: 'win-2',
            kind: 'window',
            appId: 'nvim',
            title: 'nvim src/autotile.c',
          },
          {
            id: 'con-3',
            kind: 'container',
            layout: 'splith',
            children: [
              {
                id: 'win-3',
                kind: 'window',
                appId: 'btop',
                title: 'btop — System Monitor',
              },
              {
                id: 'win-4',
                kind: 'window',
                appId: 'org.mozilla.firefox',
                title: 'Fedora 45 — Wayland Protocol Docs',
              },
            ],
          },
        ],
      },
    ],
  };
}

export function cloneTree(node: TreeNode): TreeNode {
  return {
    ...node,
    children: node.children ? node.children.map(cloneTree) : undefined,
    swallowed: node.swallowed ? cloneTree(node.swallowed) : undefined,
  };
}

function collectTiledLeaves(node: TreeNode, out: TreeNode[] = []): TreeNode[] {
  if (node.kind === 'window') {
    if (!node.floating) out.push(node);
    return out;
  }
  for (const child of node.children ?? []) {
    collectTiledLeaves(child, out);
  }
  return out;
}

function collectFloatingLeaves(node: TreeNode, out: TreeNode[] = []): TreeNode[] {
  if (node.kind === 'window') {
    if (node.floating) out.push(node);
    return out;
  }
  for (const child of node.children ?? []) {
    collectFloatingLeaves(child, out);
  }
  return out;
}

function applyAspectCentering(
  rect: Rect,
  aspectSpec: string
): { rect: Rect; centered: boolean } {
  const targetRatio = parseAspectRatio(aspectSpec);
  if (!targetRatio || rect.height <= 0) return { rect, centered: false };

  const currentRatio = rect.width / rect.height;
  if (currentRatio > targetRatio + 0.05) {
    const newW = Math.min(rect.width, Math.round(rect.height * targetRatio));
    return {
      rect: {
        x: rect.x + Math.round((rect.width - newW) / 2),
        y: rect.y,
        width: newW,
        height: rect.height,
      },
      centered: true,
    };
  }
  return { rect, centered: false };
}

export function computeWindowRects(
  root: TreeNode,
  monitor: { width: number; height: number },
  options?: {
    mfact?: number;
    smartGaps?: boolean;
    innerGap?: number;
    outerGap?: number;
    singleWindowAspect?: string;
    workspaceMode?: WorkspaceMode;
  }
): ComputedWindow[] {
  const results: ComputedWindow[] = [];
  const mfact = Math.min(0.9, Math.max(0.1, options?.mfact ?? 0.5));
  const smartGaps = options?.smartGaps ?? true;
  const rawInnerGap = options?.innerGap ?? 10;
  const rawOuterGap = options?.outerGap ?? 0;
  const wsMode = options?.workspaceMode ?? 'dwindle';

  const allTiled = collectTiledLeaves(root);
  const allFloating = collectFloatingLeaves(root);
  const soloMode = allTiled.length === 1 && !allTiled[0].fullscreen;
  const collapseGaps = smartGaps && (allTiled.length <= 1 || wsMode === 'tabbed');

  const innerGap = collapseGaps ? 0 : rawInnerGap;
  const outerGap = collapseGaps ? 0 : rawOuterGap;

  let workspaceRect: Rect = {
    x: outerGap,
    y: outerGap,
    width: Math.max(80, monitor.width - outerGap * 2),
    height: Math.max(80, monitor.height - outerGap * 2),
  };

  if (soloMode && options?.singleWindowAspect) {
    const centered = applyAspectCentering(workspaceRect, options.singleWindowAspect);
    workspaceRect = centered.rect;
    if (centered.centered && allTiled.length === 1) {
      results.push({
        id: allTiled[0].id,
        appId: allTiled[0].appId ?? 'wayland-client',
        title: allTiled[0].title ?? 'Window',
        rect: workspaceRect,
        depth: 1,
        parentId: root.id,
        parentLayout: root.layout ?? 'splith',
        floating: false,
        fullscreen: false,
        aspectCentered: true,
        hasSwallowed: Boolean(allTiled[0].swallowed),
      });
      for (const fw of allFloating) {
        pushFloatingWindow(fw, 1, root.id, root.layout ?? 'splith');
      }
      return results;
    }
  }

  function pushFloatingWindow(
    node: TreeNode,
    depth: number,
    parentId: string,
    parentLayout: ContainerLayout
  ) {
    const wPct = node.sizePct ? node.sizePct[0] / 100 : 0.44;
    const hPct = node.sizePct ? node.sizePct[1] / 100 : 0.48;
    const fw = Math.round(monitor.width * wPct);
    const fh = Math.round(monitor.height * hPct);
    const fx = node.movePct
      ? Math.round((monitor.width * node.movePct[0]) / 100)
      : Math.round((monitor.width - fw) / 2);
    const fy = node.movePct
      ? Math.round((monitor.height * node.movePct[1]) / 100)
      : Math.round((monitor.height - fh) / 2);

    results.push({
      id: node.id,
      appId: node.appId ?? 'wayland-client',
      title: node.title ?? 'Window',
      rect: {
        x: Math.max(0, Math.min(monitor.width - fw, fx)),
        y: Math.max(0, Math.min(monitor.height - fh, fy)),
        width: fw,
        height: fh,
      },
      depth,
      parentId,
      parentLayout,
      floating: true,
      fullscreen: false,
      sticky: node.sticky,
      opacity: node.opacity,
      borderNone: node.borderNone,
      hasSwallowed: Boolean(node.swallowed),
    });
  }

  // Dedicated center-master layout across all tiled leaves
  if (wsMode === 'center-master' && allTiled.length > 0) {
    if (allTiled.some((w) => w.fullscreen)) {
      // fall through to standard walker if a window is fullscreen
    } else {
      if (allTiled.length === 1) {
        results.push({
          id: allTiled[0].id,
          appId: allTiled[0].appId ?? 'wayland-client',
          title: allTiled[0].title ?? 'Window',
          rect: workspaceRect,
          depth: 1,
          parentId: root.id,
          parentLayout: 'splith',
          floating: false,
          fullscreen: false,
          hasSwallowed: Boolean(allTiled[0].swallowed),
        });
      } else if (allTiled.length === 2) {
        const masterW = Math.round((workspaceRect.width - innerGap) * mfact);
        const slaveW = workspaceRect.width - innerGap - masterW;
        results.push(
          {
            id: allTiled[0].id,
            appId: allTiled[0].appId ?? 'wayland-client',
            title: allTiled[0].title ?? 'Window',
            rect: { x: workspaceRect.x, y: workspaceRect.y, width: masterW, height: workspaceRect.height },
            depth: 1,
            parentId: root.id,
            parentLayout: 'splith',
            floating: false,
            fullscreen: false,
            hasSwallowed: Boolean(allTiled[0].swallowed),
          },
          {
            id: allTiled[1].id,
            appId: allTiled[1].appId ?? 'wayland-client',
            title: allTiled[1].title ?? 'Window',
            rect: {
              x: workspaceRect.x + masterW + innerGap,
              y: workspaceRect.y,
              width: slaveW,
              height: workspaceRect.height,
            },
            depth: 2,
            parentId: root.id,
            parentLayout: 'splitv',
            floating: false,
            fullscreen: false,
            hasSwallowed: Boolean(allTiled[1].swallowed),
          }
        );
      } else {
        const masterW = Math.round((workspaceRect.width - innerGap * 2) * mfact);
        const sideTotalW = workspaceRect.width - innerGap * 2 - masterW;
        const leftW = Math.floor(sideTotalW / 2);
        const rightW = sideTotalW - leftW;
        const masterX = workspaceRect.x + leftW + innerGap;
        const rightX = masterX + masterW + innerGap;

        results.push({
          id: allTiled[0].id,
          appId: allTiled[0].appId ?? 'wayland-client',
          title: allTiled[0].title ?? 'Window',
          rect: { x: masterX, y: workspaceRect.y, width: masterW, height: workspaceRect.height },
          depth: 1,
          parentId: root.id,
          parentLayout: 'splith',
          floating: false,
          fullscreen: false,
          hasSwallowed: Boolean(allTiled[0].swallowed),
        });

        const leftSlaves = allTiled.slice(1).filter((_, idx) => idx % 2 === 0);
        const rightSlaves = allTiled.slice(1).filter((_, idx) => idx % 2 === 1);

        const pushColumn = (col: TreeNode[], colX: number, colW: number) => {
          const n = col.length;
          const totalG = innerGap * (n - 1);
          const eachH = Math.floor((workspaceRect.height - totalG) / n);
          let curY = workspaceRect.y;
          col.forEach((win, i) => {
            const h = i === n - 1 ? workspaceRect.y + workspaceRect.height - curY : eachH;
            results.push({
              id: win.id,
              appId: win.appId ?? 'wayland-client',
              title: win.title ?? 'Window',
              rect: { x: colX, y: curY, width: colW, height: h },
              depth: 2,
              parentId: root.id,
              parentLayout: 'splitv',
              floating: false,
              fullscreen: false,
              hasSwallowed: Boolean(win.swallowed),
            });
            curY += h + innerGap;
          });
        };

        pushColumn(leftSlaves, workspaceRect.x, leftW);
        pushColumn(rightSlaves, rightX, rightW);
      }

      for (const fw of allFloating) {
        pushFloatingWindow(fw, 1, root.id, root.layout ?? 'splith');
      }
      return results;
    }
  }

  function walk(
    node: TreeNode,
    rect: Rect,
    depth: number,
    parentId: string,
    parentLayout: ContainerLayout
  ) {
    if (node.kind === 'window') {
      if (node.fullscreen) {
        results.push({
          id: node.id,
          appId: node.appId ?? 'wayland-client',
          title: node.title ?? 'Window',
          rect: { x: 0, y: 0, width: monitor.width, height: monitor.height },
          depth,
          parentId,
          parentLayout,
          floating: Boolean(node.floating),
          fullscreen: true,
          hasSwallowed: Boolean(node.swallowed),
        });
        return;
      }

      if (node.floating) {
        pushFloatingWindow(node, depth, parentId, parentLayout);
        return;
      }

      results.push({
        id: node.id,
        appId: node.appId ?? 'wayland-client',
        title: node.title ?? 'Window',
        rect,
        depth,
        parentId,
        parentLayout,
        floating: false,
        fullscreen: false,
        hasSwallowed: Boolean(node.swallowed),
      });
      return;
    }

    const layout = node.layout ?? 'splith';
    const tiledChildren = (node.children ?? []).filter((c) => !(c.kind === 'window' && c.floating));
    const floatingChildren = (node.children ?? []).filter((c) => c.kind === 'window' && c.floating);

    for (const fc of floatingChildren) {
      walk(fc, rect, depth + 1, node.id, layout);
    }

    if (tiledChildren.length === 0) return;

    if (layout === 'tabbed' || layout === 'stacked') {
      const headerOffset = layout === 'tabbed' ? 32 : 28 * tiledChildren.length;
      const innerRect: Rect = {
        x: rect.x,
        y: rect.y + Math.min(headerOffset, Math.floor(rect.height * 0.25)),
        width: rect.width,
        height: Math.max(40, rect.height - Math.min(headerOffset, Math.floor(rect.height * 0.25))),
      };
      tiledChildren.forEach((child) => {
        walk(child, innerRect, depth + 1, node.id, layout);
      });
      return;
    }

    const count = tiledChildren.length;
    const totalGap = innerGap * (count - 1);
    const applyMfactHere = count >= 2;

    if (layout === 'splith') {
      const usableW = rect.width - totalGap;
      const primaryW = applyMfactHere
        ? Math.max(40, Math.round(usableW * mfact))
        : Math.floor(usableW / count);
      const restEachW =
        count > 1 ? Math.max(40, Math.floor((usableW - primaryW) / (count - 1))) : primaryW;
      let cursorX = rect.x;

      tiledChildren.forEach((child, idx) => {
        const w =
          idx === count - 1
            ? rect.x + rect.width - cursorX
            : idx === 0
              ? primaryW
              : restEachW;
        walk(
          child,
          { x: cursorX, y: rect.y, width: Math.max(40, w), height: rect.height },
          depth + 1,
          node.id,
          layout
        );
        cursorX += w + innerGap;
      });
    } else {
      const usableH = rect.height - totalGap;
      const primaryH = applyMfactHere
        ? Math.max(40, Math.round(usableH * mfact))
        : Math.floor(usableH / count);
      const restEachH =
        count > 1 ? Math.max(40, Math.floor((usableH - primaryH) / (count - 1))) : primaryH;
      let cursorY = rect.y;

      tiledChildren.forEach((child, idx) => {
        const h =
          idx === count - 1
            ? rect.y + rect.height - cursorY
            : idx === 0
              ? primaryH
              : restEachH;
        walk(
          child,
          { x: rect.x, y: cursorY, width: rect.width, height: Math.max(40, h) },
          depth + 1,
          node.id,
          layout
        );
        cursorY += h + innerGap;
      });
    }
  }

  walk(root, workspaceRect, 0, 'workspace', root.layout ?? 'splith');
  return results;
}

export function evaluateSplit(
  windows: ComputedWindow[],
  focusedId: string,
  config: SimConfig,
  monitor: { outputName: string; width: number; height: number },
  workspaceNum: number
): SplitEvaluation {
  const effectiveMode: WorkspaceMode = config.workspaceModes[workspaceNum] ?? 'dwindle';
  const focused = windows.find((w) => w.id === focusedId);
  const tiledCount = windows.filter((w) => !w.floating).length;
  const gapsNote =
    config.smartGaps && (tiledCount <= 1 || effectiveMode === 'tabbed')
      ? 'gaps inner current set 0'
      : `gaps inner current set ${config.innerGap}`;

  if (!focused) {
    return {
      decision: 'skip',
      skipReason: 'No focused container in tree',
      focusedRect: null,
      depth: 0,
      parentLayout: null,
      ratioMetric: '-',
      effectiveMode,
      auxCommand: gapsNote,
    };
  }

  let ratio = config.splitRatio > 0 ? config.splitRatio : 1.0;
  if (config.dynamicOrientationRatio) {
    ratio =
      monitor.height > monitor.width
        ? config.splitRatioPortrait
        : config.splitRatioLandscape;
  }
  const scaledW = focused.rect.width / ratio;
  const ratioMetric = `${focused.rect.height}px vs (${focused.rect.width} / ${ratio.toFixed(2)}) = ${scaledW.toFixed(0)}px`;

  if (config.paused) {
    return {
      decision: 'skip',
      skipReason: 'Autotiling paused via SIGUSR1',
      focusedRect: focused.rect,
      depth: focused.depth,
      parentLayout: focused.parentLayout,
      ratioMetric,
      effectiveMode,
      auxCommand: null,
    };
  }

  if (!focused.floating) {
    const matchedRule = matchesFloatRule(focused.appId, focused.title, config.floatRules);
    if (matchedRule) {
      return {
        decision: 'floating',
        skipReason: `Rule matched (${matchedRule.field}:${matchedRule.pattern})`,
        focusedRect: focused.rect,
        depth: focused.depth,
        parentLayout: focused.parentLayout,
        ratioMetric,
        effectiveMode,
        auxCommand: gapsNote,
      };
    }
  }

  if (focused.floating) {
    return {
      decision: 'skip',
      skipReason: 'Focused container is floating (user_on)',
      focusedRect: focused.rect,
      depth: focused.depth,
      parentLayout: focused.parentLayout,
      ratioMetric,
      effectiveMode,
      auxCommand: gapsNote,
    };
  }

  if (focused.fullscreen) {
    return {
      decision: 'skip',
      skipReason: 'Focused container is fullscreen (fullscreen_mode=1)',
      focusedRect: focused.rect,
      depth: focused.depth,
      parentLayout: focused.parentLayout,
      ratioMetric,
      effectiveMode,
      auxCommand: null,
    };
  }

  if (config.outputsFilter.length > 0 && !config.outputsFilter.includes(monitor.outputName)) {
    return {
      decision: 'skip',
      skipReason: `Output ${monitor.outputName} excluded by --outputs`,
      focusedRect: focused.rect,
      depth: focused.depth,
      parentLayout: focused.parentLayout,
      ratioMetric,
      effectiveMode,
      auxCommand: null,
    };
  }

  if (
    config.workspacesFilter.length > 0 &&
    !config.workspacesFilter.includes(String(workspaceNum))
  ) {
    return {
      decision: 'skip',
      skipReason: `Workspace ${workspaceNum} excluded by --workspaces`,
      focusedRect: focused.rect,
      depth: focused.depth,
      parentLayout: focused.parentLayout,
      ratioMetric,
      effectiveMode,
      auxCommand: null,
    };
  }

  if (effectiveMode === 'tabbed') {
    return {
      decision: focused.parentLayout === 'tabbed' ? 'skip' : 'tabbed',
      skipReason:
        focused.parentLayout === 'tabbed'
          ? `Workspace ${workspaceNum} layout mode is tabbed`
          : `Workspace ${workspaceNum} mode applies layout tabbed`,
      focusedRect: focused.rect,
      depth: focused.depth,
      parentLayout: focused.parentLayout,
      ratioMetric,
      effectiveMode,
      auxCommand: gapsNote,
    };
  }

  if (focused.parentLayout === 'tabbed' || focused.parentLayout === 'stacked') {
    return {
      decision: 'skip',
      skipReason: `Parent container uses ${focused.parentLayout} layout`,
      focusedRect: focused.rect,
      depth: focused.depth,
      parentLayout: focused.parentLayout,
      ratioMetric,
      effectiveMode,
      auxCommand: gapsNote,
    };
  }

  let effectiveLimit = config.limit;
  if (
    (effectiveMode === 'master-stack' || effectiveMode === 'center-master') &&
    (effectiveLimit === 0 || effectiveLimit > 2)
  ) {
    effectiveLimit = 2;
  }

  if (effectiveLimit > 0 && focused.depth >= effectiveLimit) {
    return {
      decision: 'skip',
      skipReason: `Depth ${focused.depth} reached limit ${effectiveLimit} (${effectiveMode})`,
      focusedRect: focused.rect,
      depth: focused.depth,
      parentLayout: focused.parentLayout,
      ratioMetric,
      effectiveMode,
      auxCommand: gapsNote,
    };
  }

  const belowMinW = config.splitWidth > 0 && focused.rect.width < config.splitWidth;
  const belowMinH = config.splitHeight > 0 && focused.rect.height < config.splitHeight;
  if (belowMinW || belowMinH) {
    if (config.tabbedOnMin) {
      return {
        decision: 'tabbed',
        skipReason: `Below min threshold -> fallback layout tabbed`,
        focusedRect: focused.rect,
        depth: focused.depth,
        parentLayout: focused.parentLayout,
        ratioMetric,
        effectiveMode,
        auxCommand: gapsNote,
      };
    }
    return {
      decision: 'skip',
      skipReason: belowMinW
        ? `Width ${focused.rect.width}px < --splitwidth ${config.splitWidth}px`
        : `Height ${focused.rect.height}px < --splitheight ${config.splitHeight}px`,
      focusedRect: focused.rect,
      depth: focused.depth,
      parentLayout: focused.parentLayout,
      ratioMetric,
      effectiveMode,
      auxCommand: gapsNote,
    };
  }

  const decision = focused.rect.height > scaledW ? 'splitv' : 'splith';
  const resizePct = Math.round(config.mfact * 100);
  const mfactCmd =
    config.mfact !== 0.5
      ? decision === 'splith'
        ? `resize set width ${resizePct} ppt`
        : `resize set height ${resizePct} ppt`
      : null;

  return {
    decision,
    skipReason: null,
    focusedRect: focused.rect,
    depth: focused.depth,
    parentLayout: focused.parentLayout,
    ratioMetric,
    effectiveMode,
    auxCommand: [gapsNote, mfactCmd].filter(Boolean).join('; '),
  };
}

export function spawnWindowAtFocus(
  root: TreeNode,
  focusedId: string,
  evaluation: SplitEvaluation,
  nextSeq: number,
  floatRules: FloatRule[] = [],
  overrideApp?: { appId: string; title: string },
  forceSplit: ForceSplitSide = 'auto',
  newStatus: NewWindowStatus = 'slave'
): { nextTree: TreeNode; newWindowId: string; autoFloated: FloatRule | null } {
  const tree = cloneTree(root);
  const app = overrideApp ?? SAMPLE_APPS[(nextSeq - 1) % SAMPLE_APPS.length];
  const matchedRule = matchesFloatRule(app.appId, app.title, floatRules);
  const parsedActions = matchedRule ? parseRuleActions(matchedRule.actions) : null;

  const newWindow: TreeNode = {
    id: `win-${nextSeq}`,
    kind: 'window',
    appId: app.appId,
    title: app.title,
    floating: Boolean(matchedRule),
    sticky: parsedActions?.sticky,
    sizePct: parsedActions?.sizePct,
    movePct: parsedActions?.movePct,
    opacity: parsedActions?.opacity,
    borderNone: parsedActions?.borderNone,
  };

  function insertInto(node: TreeNode): boolean {
    if (!node.children) return false;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.kind === 'window' && child.id === focusedId) {
        if (matchedRule) {
          node.children.splice(i + 1, 0, newWindow);
          return true;
        }
        const prepend = forceSplit === 'left';
        if (evaluation.decision === 'skip' || evaluation.decision === 'floating') {
          node.children.splice(prepend ? i : i + 1, 0, newWindow);
          return true;
        }
        if (evaluation.decision === 'tabbed') {
          if (node.layout === 'tabbed') {
            node.children.splice(prepend ? i : i + 1, 0, newWindow);
          } else {
            const wrapper: TreeNode = {
              id: `con-${Date.now()}-${nextSeq}`,
              kind: 'container',
              layout: 'tabbed',
              children: prepend ? [newWindow, child] : [child, newWindow],
            };
            node.children[i] = wrapper;
          }
          return true;
        }
        const targetLayout = evaluation.decision;
        if (node.children.length === 1 && node.layout === targetLayout) {
          node.children.splice(prepend ? i : i + 1, 0, newWindow);
        } else if (node.children.length === 1 && node.id !== 'root') {
          node.layout = targetLayout;
          node.children.splice(prepend ? i : i + 1, 0, newWindow);
        } else {
          const wrapper: TreeNode = {
            id: `con-${Date.now()}-${nextSeq}`,
            kind: 'container',
            layout: targetLayout,
            children: prepend ? [newWindow, child] : [child, newWindow],
          };
          node.children[i] = wrapper;
        }
        return true;
      }
      if (child.kind === 'container' && insertInto(child)) {
        return true;
      }
    }
    return false;
  }

  if (
    !matchedRule &&
    newStatus === 'master' &&
    tree.children &&
    tree.children.length > 0 &&
    (evaluation.effectiveMode === 'master-stack' || evaluation.effectiveMode === 'center-master')
  ) {
    // Promote new window directly into primary slot
    tree.children.unshift(newWindow);
  } else if (!insertInto(tree)) {
    tree.children = [...(tree.children ?? []), newWindow];
  }

  return { nextTree: tree, newWindowId: newWindow.id, autoFloated: matchedRule };
}

export function swallowFocusedTerminal(
  root: TreeNode,
  focusedId: string,
  nextSeq: number,
  childApp: { appId: string; title: string } = { appId: 'mpv', title: 'mpv — wayland-demo.mkv' }
): { nextTree: TreeNode; newWindowId: string; swallowedTermApp: string | null } {
  const tree = cloneTree(root);
  let swallowedTermApp: string | null = null;
  const newWindowId = `win-${nextSeq}`;

  function replaceTerminal(node: TreeNode): boolean {
    if (!node.children) return false;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.kind === 'window' && child.id === focusedId) {
        swallowedTermApp = child.appId ?? 'foot';
        node.children[i] = {
          id: newWindowId,
          kind: 'window',
          appId: childApp.appId,
          title: childApp.title,
          swallowed: child,
        };
        return true;
      }
      if (child.kind === 'container' && replaceTerminal(child)) return true;
    }
    return false;
  }

  replaceTerminal(tree);
  return { nextTree: tree, newWindowId, swallowedTermApp };
}

export function closeWindowById(
  root: TreeNode,
  targetId: string
): { nextTree: TreeNode; nextFocusedId: string | null; restoredTermApp: string | null } {
  const tree = cloneTree(root);
  let restoredId: string | null = null;
  let restoredTermApp: string | null = null;

  function removeFrom(node: TreeNode): boolean {
    if (!node.children) return false;
    const idx = node.children.findIndex((c) => c.kind === 'window' && c.id === targetId);
    if (idx !== -1) {
      const target = node.children[idx];
      if (target.swallowed) {
        node.children[idx] = target.swallowed;
        restoredId = target.swallowed.id;
        restoredTermApp = target.swallowed.appId ?? 'terminal';
      } else {
        node.children.splice(idx, 1);
      }
      return true;
    }
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.kind === 'container' && removeFrom(child)) {
        if (child.children && child.children.length === 1) {
          node.children[i] = child.children[0];
        } else if (child.children && child.children.length === 0) {
          node.children.splice(i, 1);
        }
        return true;
      }
    }
    return false;
  }

  removeFrom(tree);

  function findFirstWindow(node: TreeNode): string | null {
    if (node.kind === 'window') return node.id;
    for (const c of node.children ?? []) {
      const found = findFirstWindow(c);
      if (found) return found;
    }
    return null;
  }

  return {
    nextTree: tree,
    nextFocusedId: restoredId ?? findFirstWindow(tree),
    restoredTermApp,
  };
}

export function mutateFocusedWindow(
  root: TreeNode,
  focusedId: string,
  mutator: (win: TreeNode, parent: TreeNode) => void
): TreeNode {
  const tree = cloneTree(root);
  function walk(node: TreeNode) {
    if (!node.children) return;
    for (const child of node.children) {
      if (child.kind === 'window' && child.id === focusedId) {
        mutator(child, node);
        return;
      }
      if (child.kind === 'container') {
        walk(child);
      }
    }
  }
  walk(tree);
  return tree;
}
