import type {Layout, LayoutApplyContext} from './Layout';

/**
 * Public configuration for a CSS Grid layout.
 *
 * This layout is theme-agnostic:
 * - We DO NOT apply Tailwind/Flyon class names.
 * - We ONLY set inline styles on the container and on each child.
 *
 * Rationale:
 *   The layout is purely structural (grid tracks, gaps, placement).
 *   Visual skinning (colors, typography, shadows...) belongs to components
 *   like Card, Button, etc. and to the design system (FlyonUI in our case),
 *   not to the layout engine.
 */
export interface GridLayoutConfig {
    type: 'grid';

    /**
     * grid-template-columns, e.g.:
     *   "repeat(auto-fit,minmax(16rem,1fr))"
     *   "200px 1fr"
     *   "1fr 2fr"
     */
    columns?: string;

    /**
     * grid-template-rows, e.g.:
     *   "auto 1fr auto"
     *   "repeat(3, minmax(0,auto))"
     */
    rows?: string;

    /**
     * Shorthand gap applied to both row/column:
     *   "1rem" / "8px" / "0.5em" / etc.
     */
    gap?: string;

    /** row-gap override */
    rowGap?: string;

    /** column-gap override */
    colGap?: string;

    /**
     * align-items on the grid container:
     *   "start" | "center" | "end" | "stretch"
     */
    alignItems?: 'start' | 'center' | 'end' | 'stretch';

    /**
     * justify-items on the grid container:
     *   "start" | "center" | "end" | "stretch"
     */
    justifyItems?: 'start' | 'center' | 'end' | 'stretch';

    /**
     * Default placement hints for each child item.
     * These are applied first; an individual child can override them
     * via its own props (gridColumn / gridRow / placeSelf).
     */
    defaultItem?: {
        /** e.g. "1 / 3", "2 / span 2", etc. */
        gridColumn?: string;
        /** e.g. "1 / 2", "auto / span 3", etc. */
        gridRow?: string;
        /**
         * place-self shorthand, e.g. "center stretch" or just "center".
         * Useful for per-item alignment without touching the rest of the grid.
         */
        placeSelf?: string;
    };
}

/**
 * GridLayout:
 *
 * - Sets `display: grid` and standard CSS Grid properties on the container.
 * - Applies default per-child placement hints (gridColumn, gridRow, placeSelf)
 *   from `config.defaultItem`.
 * - Allows each child to override those hints via its own props.
 *
 * NOTE:
 * We intentionally do NOT inject utility classes here.
 * The goal is to make GridLayout completely independent from Tailwind/Flyon.
 */
export class GridLayout implements Layout {
    constructor(private cfg: GridLayoutConfig) {
    }

    /**
     * Apply the layout to a container + its children.
     * Called by Container after it has mounted/updated its children in the DOM.
     */
    apply(ctx: LayoutApplyContext): void {
        const {host, children} = ctx;
        const c = this.cfg;

        // ----------------------------
        // Container-wide grid styles
        // ----------------------------
        host.style.display = 'grid';

        if (c.columns) {
            host.style.gridTemplateColumns = c.columns;
        }
        if (c.rows) {
            host.style.gridTemplateRows = c.rows;
        }

        // Gap logic:
        // - If `gap` is provided, we set `gap`.
        // - rowGap / colGap can further refine.
        if (c.gap) {
            host.style.gap = c.gap;
        }
        if (c.rowGap) {
            host.style.rowGap = c.rowGap;
        }
        if (c.colGap) {
            host.style.columnGap = c.colGap;
        }

        // Alignment on the grid container
        if (c.alignItems) {
            host.style.alignItems = c.alignItems;
        }
        if (c.justifyItems) {
            host.style.justifyItems = c.justifyItems;
        }

        // ----------------------------
        // Per-child overrides
        // ----------------------------
        //
        // Priority for each child element:
        //   1. layout.defaultItem.* (if provided)
        //   2. child.props.gridColumn / gridRow / placeSelf (if provided)
        //
        // NOTE:
        //  - We assume every Weave Component exposes its incoming config
        //    (non-reactive props) on `child.props`.
        //  - This matches what Container + Component are doing oggi.
        //
        for (const child of children) {
            const el = child.el();
            if (!el) continue;

            // Step 1: layout defaults
            if (c.defaultItem?.gridColumn) {
                el.style.gridColumn = c.defaultItem.gridColumn;
            }
            if (c.defaultItem?.gridRow) {
                el.style.gridRow = c.defaultItem.gridRow;
            }
            if (c.defaultItem?.placeSelf) {
                el.style.placeSelf = c.defaultItem.placeSelf;
            }

            // Step 2: child-level overrides
            const p: Record<string, any> = (child as any).props ?? {};

            if (p.gridColumn != null) {
                el.style.gridColumn = String(p.gridColumn);
            }
            if (p.gridRow != null) {
                el.style.gridRow = String(p.gridRow);
            }
            if (p.placeSelf != null) {
                el.style.placeSelf = String(p.placeSelf);
            }
        }
    }

    /**
     * Optional cleanup hook if we ever want to "swap out"
     * layouts on the same container at runtime.
     * For now, we intentionally do not roll back inline styles.
     */
    dispose(_ctx: LayoutApplyContext): void {
        /* no-op */
    }
}

/**
 * Convenience factory for user code:
 *
 *   layout: gridLayout({
 *     columns: 'repeat(auto-fit,minmax(16rem,1fr))',
 *     gap: '1rem',
 *     defaultItem: { placeSelf: 'stretch' }
 *   })
 */
export function gridLayout(
    cfg: Omit<GridLayoutConfig, 'type'>
): GridLayout {
    return new GridLayout({type: 'grid', ...cfg});
}
