import type { Layout, LayoutApplyContext } from './Layout';

/**
 * Configuration for a CSS Grid layout container.
 * Mirrors common CSS Grid properties.
 */
export interface GridLayoutConfig {
  type: 'grid';

  /** grid-template-columns */
  columns?: string;

  /** grid-template-rows */
  rows?: string;

  /** unified gap for rows+cols */
  gap?: string;

  /** row-gap / column-gap overrides */
  rowGap?: string;
  colGap?: string;

  /** align-items on grid container */
  alignItems?: 'start' | 'center' | 'end' | 'stretch';

  /** justify-items on grid container */
  justifyItems?: 'start' | 'center' | 'end' | 'stretch';

  /**
   * default placement hints for each child item
   */
  defaultItem?: {
    gridColumn?: string;
    gridRow?: string;
    placeSelf?: string;
  };
}

/**
 * GridLayout sets display:grid on the container, applies grid-template-*
 * and assigns per-child CSS grid placement (gridColumn, gridRow, placeSelf).
 */
export class GridLayout implements Layout {
  constructor(private cfg: GridLayoutConfig) {}

  apply(ctx: LayoutApplyContext): void {
    const { host, children } = ctx;
    const c = this.cfg;

    host.style.display = 'grid';

    if (c.columns) host.style.gridTemplateColumns = c.columns;
    if (c.rows) host.style.gridTemplateRows = c.rows;

    if (c.gap) {
      host.style.gap = c.gap;
    }
    if (c.rowGap) {
      host.style.rowGap = c.rowGap;
    }
    if (c.colGap) {
      host.style.columnGap = c.colGap;
    }

    if (c.alignItems) {
      host.style.alignItems = c.alignItems;
    }
    if (c.justifyItems) {
      host.style.justifyItems = c.justifyItems;
    }

    // per-child placement
    for (const child of children) {
      const el = child.el();
      if (!el) continue;

      // defaults from layout
      if (c.defaultItem?.gridColumn) el.style.gridColumn = c.defaultItem.gridColumn;
      if (c.defaultItem?.gridRow) el.style.gridRow = c.defaultItem.gridRow;
      if (c.defaultItem?.placeSelf) el.style.placeSelf = c.defaultItem.placeSelf;

      // overrides from child's props
      const p = (child as any)._props ?? {};
      if (p.gridColumn) el.style.gridColumn = p.gridColumn;
      if (p.gridRow) el.style.gridRow = p.gridRow;
      if (p.placeSelf) el.style.placeSelf = p.placeSelf;
    }
  }

  dispose(_ctx: LayoutApplyContext): void {
    // optional cleanup for hot-swapping layouts
  }
}

/**
 * Factory helper for user code:
 *
 *   layout: gridLayout({
 *     columns: 'repeat(auto-fit,minmax(16rem,1fr))',
 *     gap: '1rem'
 *   })
 */
export function gridLayout(
  cfg: Omit<GridLayoutConfig, 'type'>
): GridLayout {
  return new GridLayout({ type: 'grid', ...cfg });
}
