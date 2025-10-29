import type { Layout, LayoutApplyContext } from './Layout';

/**
 * Public configuration for a flexbox layout.
 * Mirrors standard CSS flexbox concepts.
 *
 * NOTE:
 * - This layout is theme-agnostic.
 * - We DO NOT add Tailwind / Flyon classes.
 * - We ONLY touch inline style on the container host and its children.
 */
export interface FlexLayoutConfig {
    type: 'flex';

    /** flex-direction */
    direction?: 'row' | 'column';

    /** flex-wrap: true => wrap, false => nowrap (default false) */
    wrap?: boolean;

    /**
     * Gap between items, e.g. '0.5rem', '8px', '1ch'.
     * Applied as `host.style.gap`.
     */
    gap?: string;

    /** align-items */
    align?: 'start' | 'center' | 'end' | 'stretch';

    /** justify-content */
    justify?:
        | 'start'
        | 'center'
        | 'end'
        | 'between'
        | 'around'
        | 'evenly'
        | 'stretch';

    /**
     * Default per-child style hints.
     * Each child can override via its own props
     * (e.g. child.props.flex / alignSelf).
     */
    defaultItem?: {
        /** child.style.flex (e.g. "1 1 auto" or "0 0 auto") */
        flex?: string;
        /** child.style.alignSelf */
        alignSelf?: 'start' | 'center' | 'end' | 'stretch';
    };
}

/**
 * A flexbox layout that:
 * - sets display:flex, flex-direction, wrap, gap, align-items, justify-content
 *   on the container host;
 * - applies per-child overrides for flex / alignSelf
 *   coming from layout.defaultItem and/or child.props.
 *
 * It is intentionally "CSS only":
 *   - no Tailwind classes are injected;
 *   - no design tokens are assumed.
 *
 * This gives Weave layouts full portability:
 * swapping Flyon/Tailwind/etc. won't break layout semantics.
 */
export class FlexLayout implements Layout {
    constructor(private cfg: FlexLayoutConfig) {}

    apply(ctx: LayoutApplyContext): void {
        const { host, children } = ctx;
        const c = this.cfg;

        // ----- container styles -------------------------------------------------
        host.style.display = 'flex';

        // flex-direction
        host.style.flexDirection = c.direction === 'column' ? 'column' : 'row';

        // flex-wrap
        host.style.flexWrap = c.wrap ? 'wrap' : 'nowrap';

        // gap
        if (c.gap) {
            host.style.gap = c.gap;
        } else {
            // leave host.style.gap as-is if not provided
        }

        // align-items
        if (c.align) {
            host.style.alignItems = mapAlignItems(c.align);
        } else {
            // leave host.style.alignItems as-is
        }

        // justify-content
        if (c.justify) {
            host.style.justifyContent = mapJustifyContent(c.justify);
        } else {
            // leave host.style.justifyContent as-is
        }

        // ----- per-child overrides ---------------------------------------------
        //
        // Order of precedence for each child:
        // 1. layout.defaultItem.flex / defaultItem.alignSelf
        // 2. child.props.flex / child.props.alignSelf
        //
        // NOTE: in Weave ogni componente conserva `props` normalizzate
        //       (non reattive) accessibili come `child.props` o `_props`
        //       a seconda dello stile attuale del codice sorgente.
        //
        for (const child of children) {
            const el = child.el();
            if (!el) continue;

            // 1. defaults from the layout
            if (c.defaultItem?.flex) {
                el.style.flex = c.defaultItem.flex;
            }
            if (c.defaultItem?.alignSelf) {
                el.style.alignSelf = mapAlignSelf(c.defaultItem.alignSelf);
            }

            // 2. child-level overrides (props attached to the component instance)
            //    NB: qui assumiamo che ogni child esponga le sue props
            //    in `child.props` (design più recente di Weave).
            const p: Record<string, any> = (child as any).props ?? {};

            if (p.flex != null) {
                el.style.flex = String(p.flex);
            }

            if (p.alignSelf != null) {
                el.style.alignSelf = mapAlignSelf(
                    p.alignSelf as NonNullable<
                        FlexLayoutConfig['defaultItem']
                    >['alignSelf']
                );
            }
        }
    }

    /**
     * Called if/when the container (or its layout) is being destroyed.
     * For now we don't try to "undo" inline styles — that's intentional.
     * If we later support switching layouts at runtime,
     * we could add cleanup/restore logic here.
     */
    dispose(_ctx: LayoutApplyContext): void {
        /* no-op for now */
    }
}

// -----------------------------------------------------------------------------
// Internal helpers to translate friendly enums to actual CSS values.
// -----------------------------------------------------------------------------

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
            return ''; // let browser fallback
    }
}

function mapAlignSelf(
    v: NonNullable<FlexLayoutConfig['defaultItem']>['alignSelf']
): string {
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
            return ''; // let browser fallback
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
            // 'stretch' is valid for align-content, not justify-content,
            // but some devs expect it → fallback to 'space-between' OR empty.
            return 'stretch';
        default:
            return ''; // let browser fallback
    }
}

/**
 * Factory for nicer DX:
 *
 *   layout: flexLayout({
 *     direction: 'column',
 *     gap: '1rem',
 *     defaultItem: { flex: '0 0 auto' }
 *   })
 */
export function flexLayout(
    cfg: Omit<FlexLayoutConfig, 'type'>
): FlexLayout {
    return new FlexLayout({ type: 'flex', ...cfg });
}