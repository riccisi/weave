import type { Layout, LayoutApplyContext } from './Layout';

/**
 * Public configuration for a flexbox layout.
 * Mirrors standard CSS flexbox concepts.
 */
export interface FlexLayoutConfig {
  type: 'flex';

  /** flex-direction */
  direction?: 'row' | 'column';

  /** flex-wrap */
  wrap?: boolean;

  /** gap between items (inline style gap). */
  gap?: string;

  /** align-items */
  align?: 'start' | 'center' | 'end' | 'stretch';

  /** justify-content */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' | 'stretch';

  /**
   * Default per-child style hints. Can be overridden by each child's props.
   */
  defaultItem?: {
    flex?: string;
    alignSelf?: 'start' | 'center' | 'end' | 'stretch';
  };
}

/**
 * A flexbox layout that:
 * - sets display:flex etc. on the container host
 * - applies per-child style overrides (flex, alignSelf)
 *   from either layout.defaultItem or child._props.flex / child._props.alignSelf
 */
export class FlexLayout implements Layout {
  constructor(private cfg: FlexLayoutConfig) {}

  apply(ctx: LayoutApplyContext): void {
    const { host, children } = ctx;
    const c = this.cfg;

    // Container base
    host.classList.add('flex');
    host.style.display = 'flex';

    // direction
    if (c.direction === 'column') {
      host.classList.add('flex-col');
      host.style.flexDirection = 'column';
    } else {
      host.classList.add('flex-row'); // default row
      host.style.flexDirection = 'row';
    }

    // wrap
    if (c.wrap) {
      host.classList.add('flex-wrap');
      host.style.flexWrap = 'wrap';
    } else {
      host.classList.add('flex-nowrap');
      host.style.flexWrap = 'nowrap';
    }

    // gap
    if (c.gap) {
      host.style.gap = c.gap;
    }

    // align-items
    if (c.align) {
      host.style.alignItems = mapAlignItems(c.align);
    }

    // justify-content
    if (c.justify) {
      host.style.justifyContent = mapJustifyContent(c.justify);
    }

    // Per-child overrides
    for (const child of children) {
      const el = child.el();
      if (!el) continue;

      // default from layout
      if (c.defaultItem?.flex) {
        el.style.flex = c.defaultItem.flex;
      }
      if (c.defaultItem?.alignSelf) {
        el.style.alignSelf = mapAlignSelf(c.defaultItem.alignSelf);
      }

      // child-level overrides from child._props
      const p = (child as any)._props ?? {};
      if (p.flex) {
        el.style.flex = p.flex;
      }
      if (p.alignSelf) {
        el.style.alignSelf = mapAlignSelf(p.alignSelf);
      }
    }
  }

  dispose(_ctx: LayoutApplyContext): void {
    // optional cleanup if we ever support dynamic layout swaps
  }
}

// helpers ----------------------------------------------------------------------

function mapAlignItems(v: FlexLayoutConfig['align']): string {
  switch (v) {
    case 'start':
      return 'flex-start';
    case 'center':
      return 'center';
    case 'end':
      return 'flex-end';
    case 'stretch':
      return 'stretch';
    default:
      return '';
  }
}

function mapAlignSelf(v: NonNullable<FlexLayoutConfig['defaultItem']>['alignSelf']): string {
  switch (v) {
    case 'start':
      return 'flex-start';
    case 'center':
      return 'center';
    case 'end':
      return 'flex-end';
    case 'stretch':
      return 'stretch';
    default:
      return '';
  }
}

function mapJustifyContent(v: FlexLayoutConfig['justify']): string {
  switch (v) {
    case 'start':
      return 'flex-start';
    case 'center':
      return 'center';
    case 'end':
      return 'flex-end';
    case 'between':
      return 'space-between';
    case 'around':
      return 'space-around';
    case 'evenly':
      return 'space-evenly';
    case 'stretch':
      return 'stretch';
    default:
      return '';
  }
}

/**
 * Factory helper for user code:
 *
 *   layout: flexLayout({ direction: 'column', gap: '1rem' })
 */
export function flexLayout(
  cfg: Omit<FlexLayoutConfig, 'type'>
): FlexLayout {
  return new FlexLayout({ type: 'flex', ...cfg });
}
