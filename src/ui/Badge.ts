// src/ui/Badge.ts
import { html } from 'uhtml';
import { Component } from './Component';
import type {
    ComponentConfig,
    ComponentProps,
    ComponentState
} from './Component';

/**
 * Supported semantic colors for FlyonUI badges.
 * Update this map if FlyonUI changes naming (badge-primary, etc.).
 */
export type BadgeColor =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'info'
    | 'success'
    | 'warning'
    | 'error';

/**
 * Visual style / surface of the badge.
 * "solid" is the classic filled pill.
 * "soft" is a lighter tone.
 * "outline" is bordered.
 * "ghost" is super-light / transparent-ish.
 */
export type BadgeVariant =
    | 'solid'
    | 'soft'
    | 'outline'
    | 'ghost';

/**
 * Badge size. FlyonUI exposes badge-sm / badge-lg etc.
 * We treat "md" as default (no extra class).
 */
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Reactive state of a Badge.
 *
 * Extends ComponentState so we keep `hidden`, `hiddenInert`, etc.
 * NOTE: we intentionally do NOT mix in "disabled" semantics –
 * Badge is purely visual, not interactive.
 */
export interface BadgeState extends ComponentState {
    /** Main text content shown inside the badge. */
    text: string;

    /** Semantic color tone. */
    color: BadgeColor;

    /** Surface style (solid / soft / outline / ghost). */
    variant: BadgeVariant;

    /** Dimensions density. */
    size: BadgeSize;

    /** If true, force a fully-rounded pill shape. */
    pill: boolean;

    /**
     * If true, render as a "dot badge".
     * In FlyonUI this typically adds a colored dot style.
     * We express that as a 'badge-dot' class.
     */
    dot: boolean;

    /**
     * Optional icon class to render before the text.
     * Example: "icon-[tabler--bell] size-4.5"
     */
    iconLeft: string | null;

    /**
     * Optional icon class to render after the text.
     */
    iconRight: string | null;
}

/**
 * Non-reactive props for Badge.
 * For now we just inherit ComponentProps (id, className, etc.).
 * We keep a dedicated interface so we can extend it later
 * without touching the reactive surface.
 */
export interface BadgeProps extends ComponentProps {
    // future static / a11y-only props would go here
}

/**
 * FlyonUI-style badge (status chip).
 *
 * - Host element is a <span>.
 * - We diff/manage only the classes we "own" so external classes
 *   (e.g. from layouts) are preserved.
 * - Rendering is internal content (icons, text); outer <span> is the host.
 */
export class Badge extends Component<BadgeState, BadgeProps> {
    /** Useful label for debugging / storybook. */
    public static readonly displayName = 'Badge';

    /**
     * Track the last set of classes we applied so we can remove outdated ones
     * without blowing away user-supplied classes.
     */
    private _managedClasses: Set<string> = new Set();

    /** Host element for Badge should be a <span>. */
    protected override hostTag(): string {
        return 'span';
    }

    /**
     * Default reactive state.
     * This replaces the old `stateInit`/`schema()` pattern.
     */
    protected override initialState(): BadgeState {
        return {
            ...(super.initialState() as ComponentState),
            text: 'Badge',
            color: 'default',
            variant: 'solid',
            size: 'md',
            pill: false,
            dot: false,
            iconLeft: null,
            iconRight: null
        } satisfies BadgeState;
    }

    /**
     * view() is called each render.
     * We:
     *   1. compute + diff CSS classes on the host,
     *   2. compute ARIA/fallback attrs if needed,
     *   3. return the INNER TEMPLATE (icons + text).
     */
    protected override view() {
        const s = this.state();
        const host = this.el();

        // ---- build class set that WE control --------------------
        const classes = new Set<string>();

        // base
        classes.add('badge');

        // variant
        switch (s.variant) {
            case 'soft':
                classes.add('badge-soft');
                break;
            case 'outline':
                classes.add('badge-outline');
                break;
            case 'ghost':
                classes.add('badge-ghost');
                break;
            case 'solid':
            default:
                // solid is just "badge" plus color class
                break;
        }

        // color mapping
        const COLOR_MAP: Record<BadgeColor, string | null> = {
            default: null,
            primary: 'badge-primary',
            secondary: 'badge-secondary',
            accent: 'badge-accent',
            info: 'badge-info',
            success: 'badge-success',
            warning: 'badge-warning',
            error: 'badge-error'
        };
        const colorClass = COLOR_MAP[s.color];
        if (colorClass) classes.add(colorClass);

        // size
        if (s.size && s.size !== 'md') {
            classes.add(`badge-${s.size}`);
        }

        // pill
        if (s.pill) {
            // FlyonUI badges sono già abbastanza arrotondati,
            // ma per forzare pill completa aggiungiamo rounded-full.
            classes.add('rounded-full');
        }

        // dot mode
        if (s.dot) {
            classes.add('badge-dot');
        }

        // Merge explicit className from props.
        // `className` should be preserved across renders.
        const extraFromProps =
            typeof this.props.className === 'string'
                ? this.props.className.split(/\s+/).filter(Boolean)
                : [];
        for (const c of extraFromProps) classes.add(c);

        // ---- apply diff to host -------------------------------
        // remove classes we managed last time that we no longer need
        for (const oldCls of this._managedClasses) {
            if (!classes.has(oldCls)) {
                host.classList.remove(oldCls);
            }
        }
        // add any new classes we didn't manage yet
        for (const newCls of classes) {
            if (!this._managedClasses.has(newCls)) {
                host.classList.add(newCls);
            }
        }
        // update snapshot
        this._managedClasses = classes;

        // Accessibility: if the badge is purely decorative (e.g. dot only w/out text),
        // consumers *might* pass `ariaLabel` via props later. We won't force one here.

        // ---- inner content template ---------------------------
        // Left icon (if provided)
        const leftIcon = s.iconLeft
            ? html`<span class=${s.iconLeft}></span>`
            : null;

        // Right icon
        const rightIcon = s.iconRight
            ? html`<span class=${s.iconRight}></span>`
            : null;

        // Text node (can be empty if user wants icon-only or pure dot)
        const textNode = s.text ? html`${s.text}` : null;

        // Render order: [leftIcon] [text/dot] [rightIcon]
        // The "dot" style in FlyonUI is usually handled by CSS pseudo-elements,
        // so we don't add extra markup just for the dot here — the 'badge-dot'
        // class above is responsible for visuals.
        return html`${leftIcon} ${textNode} ${rightIcon}`;
    }
}

/**
 * Ergonomic factory:
 *
 *   const b = badge({
 *     text: "New",
 *     color: "primary",
 *     variant: "soft",
 *     pill: true,
 *   });
 *   b.mount(someEl);
 *
 * `cfg` can include both reactive state keys (BadgeState)
 * and non-reactive props (BadgeProps).
 */
export function badge(
    cfg: ComponentConfig<BadgeState, BadgeProps> = {}
): Badge {
    return new Badge(cfg);
}
