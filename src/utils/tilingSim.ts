export type ContainerLayout = 'splith' | 'splitv' | 'tabbed' | 'stacked';
export type WorkspaceMode = 'dwindle' | 'master-stack' | 'tabbed';

export interface FloatRule {
  id: string;
  field: 'app_id' | 'title' | 'any';
  pattern: string;
}

export interface SimConfig {
  limit: number;
  paused: boolean;
  splitRatio: number;
  dynamicOrientationRatio: boolean;
  splitRatioLandscape: number;
  splitRatioPortrait: number;
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
}

export interface SplitEvaluation {
  decision: 'splith' | 'splitv' | 'tabbed' | 'floating' | 'skip';
  skipReason: string | null;
  focusedRect: Rect | null;
  depth: number;
  parentLayout: ContainerLayout | null;
  ratioMetric: string;
  effectiveMode: WorkspaceMode;
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
  { id: 'fr-1', field: 'app_id', pattern: 'pavucontrol' },
  { id: 'fr-2', field: 'app_id', pattern: 'org.gnome.Calculator' },
  { id: 'fr-3', field: 'title', pattern: 'Picture-in-Picture' },
];

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
  };
}

export function computeWindowRects(
  root: TreeNode,
  monitor: { width: number; height: number },
  gap = 12
): ComputedWindow[] {
  const results: ComputedWindow[] = [];

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
        });
        return;
      }

      if (node.floating) {
        const fw = Math.round(monitor.width * 0.44);
        const fh = Math.round(monitor.height * 0.48);
        results.push({
          id: node.id,
          appId: node.appId ?? 'wayland-client',
          title: node.title ?? 'Window',
          rect: {
            x: Math.round((monitor.width - fw) / 2),
            y: Math.round((monitor.height - fh) / 2),
            width: fw,
            height: fh,
          },
          depth,
          parentId,
          parentLayout,
          floating: true,
          fullscreen: false,
        });
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
    if (layout === 'splith') {
      const totalGap = gap * (count - 1);
      const childW = Math.floor((rect.width - totalGap) / count);
      let cursorX = rect.x;
      tiledChildren.forEach((child, idx) => {
        const w = idx === count - 1 ? rect.x + rect.width - cursorX : childW;
        walk(
          child,
          { x: cursorX, y: rect.y, width: Math.max(40, w), height: rect.height },
          depth + 1,
          node.id,
          layout
        );
        cursorX += w + gap;
      });
    } else {
      const totalGap = gap * (count - 1);
      const childH = Math.floor((rect.height - totalGap) / count);
      let cursorY = rect.y;
      tiledChildren.forEach((child, idx) => {
        const h = idx === count - 1 ? rect.y + rect.height - cursorY : childH;
        walk(
          child,
          { x: rect.x, y: cursorY, width: rect.width, height: Math.max(40, h) },
          depth + 1,
          node.id,
          layout
        );
        cursorY += h + gap;
      });
    }
  }

  const rootRect: Rect = {
    x: gap,
    y: gap,
    width: monitor.width - gap * 2,
    height: monitor.height - gap * 2,
  };
  walk(root, rootRect, 0, 'workspace', root.layout ?? 'splith');
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

  if (!focused) {
    return {
      decision: 'skip',
      skipReason: 'No focused container in tree',
      focusedRect: null,
      depth: 0,
      parentLayout: null,
      ratioMetric: '-',
      effectiveMode,
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
    };
  }

  if (!focused.floating) {
    const matchedRule = matchesFloatRule(focused.appId, focused.title, config.floatRules);
    if (matchedRule) {
      return {
        decision: 'floating',
        skipReason: `Auto-float rule matched (${matchedRule.field}:${matchedRule.pattern})`,
        focusedRect: focused.rect,
        depth: focused.depth,
        parentLayout: focused.parentLayout,
        ratioMetric,
        effectiveMode,
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
    };
  }

  let effectiveLimit = config.limit;
  if (effectiveMode === 'master-stack' && (effectiveLimit === 0 || effectiveLimit > 2)) {
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
    };
  }

  const decision = focused.rect.height > scaledW ? 'splitv' : 'splith';
  return {
    decision,
    skipReason: null,
    focusedRect: focused.rect,
    depth: focused.depth,
    parentLayout: focused.parentLayout,
    ratioMetric,
    effectiveMode,
  };
}

export function spawnWindowAtFocus(
  root: TreeNode,
  focusedId: string,
  evaluation: SplitEvaluation,
  nextSeq: number,
  floatRules: FloatRule[] = [],
  overrideApp?: { appId: string; title: string }
): { nextTree: TreeNode; newWindowId: string; autoFloated: FloatRule | null } {
  const tree = cloneTree(root);
  const app = overrideApp ?? SAMPLE_APPS[(nextSeq - 1) % SAMPLE_APPS.length];
  const matchedRule = matchesFloatRule(app.appId, app.title, floatRules);

  const newWindow: TreeNode = {
    id: `win-${nextSeq}`,
    kind: 'window',
    appId: app.appId,
    title: app.title,
    floating: Boolean(matchedRule),
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
        if (evaluation.decision === 'skip' || evaluation.decision === 'floating') {
          node.children.splice(i + 1, 0, newWindow);
          return true;
        }
        if (evaluation.decision === 'tabbed') {
          if (node.layout === 'tabbed') {
            node.children.splice(i + 1, 0, newWindow);
          } else {
            const wrapper: TreeNode = {
              id: `con-${Date.now()}-${nextSeq}`,
              kind: 'container',
              layout: 'tabbed',
              children: [child, newWindow],
            };
            node.children[i] = wrapper;
          }
          return true;
        }
        const targetLayout = evaluation.decision;
        if (node.children.length === 1 && node.layout === targetLayout) {
          node.children.splice(i + 1, 0, newWindow);
        } else if (node.children.length === 1 && node.id !== 'root') {
          node.layout = targetLayout;
          node.children.splice(i + 1, 0, newWindow);
        } else {
          const wrapper: TreeNode = {
            id: `con-${Date.now()}-${nextSeq}`,
            kind: 'container',
            layout: targetLayout,
            children: [child, newWindow],
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

  if (!insertInto(tree)) {
    tree.children = [...(tree.children ?? []), newWindow];
  }

  return { nextTree: tree, newWindowId: newWindow.id, autoFloated: matchedRule };
}

export function closeWindowById(
  root: TreeNode,
  targetId: string
): { nextTree: TreeNode; nextFocusedId: string | null } {
  const tree = cloneTree(root);

  function removeFrom(node: TreeNode): boolean {
    if (!node.children) return false;
    const idx = node.children.findIndex((c) => c.kind === 'window' && c.id === targetId);
    if (idx !== -1) {
      node.children.splice(idx, 1);
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

  return { nextTree: tree, nextFocusedId: findFirstWindow(tree) };
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
