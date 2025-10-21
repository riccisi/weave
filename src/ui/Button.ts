// src/ui/Button.ts
import { html } from 'uhtml';
import { Component, StateInit } from './Component';
import { ComponentRegistry } from './Registry';

/** FlyonUI palette mapped to `btn-{color}` classes. */
type FlyonColor =
    | 'default' | 'primary' | 'secondary' | 'accent'
    | 'info' | 'success' | 'warning' | 'error';

/** Visual variants (see FlyonUI docs). */
type Variant = 'solid' | 'soft' | 'outline' | 'text' | 'gradient';

/** Sizes (FlyonUI: btn-xs/sm/(md)/lg/xl). */
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Shapes (rounded default, pill = rounded-full). */
type Shape = 'rounded' | 'pill' | 'circle' | 'square';

export interface ButtonState {
    /** Label text (if empty + icon-only, provide ariaLabel via props). */
    text: string;
    /** Disable button (HTML + visual). */
    disabled: boolean;
    /** Visual variant. */
    variant: Variant;
    /** Semantic color. */
    color: FlyonColor;
    /** Size. */
    size: Size;
    /** Extra horizontal padding. */
    wide: boolean;
    /** Full width. */
    block: boolean;
    /** Glass effect. */
    glass: boolean;
    /** Force active state. */
    active: boolean;
    /** Inline loading spinner. */
    loading: boolean;
    /** Shape. */
    shape: Shape;

    /** Left icon class (e.g. 'icon-[tabler--star] size-4.5'). */
    iconLeft: string | null;
    /** Right icon class. */
    iconRight: string | null;

    /** Custom color via CSS var --btn-color (e.g. '#1877F2'). */
    customColor: string | null;

    /** DX alias (deprecated) — mapped to `color`. */
    kind?: 'primary' | 'secondary' | 'neutral';
}

/**
 * FlyonUI Button
 * - Host element is a real <button> (no wrapper).
 * - Classes/attributes are applied to the host in a differential way
 *   (external classes like `join-item` are preserved).
 * - The inner content (icons/spinner/text) is rendered by `view()`.
 */
export class Button extends Component<ButtonState> {
    static wtype = 'button';

    /** Track last-applied classes to avoid wiping external classes (e.g., layout). */
    private _appliedClasses: Set<string> = new Set();
    /** Bound click handler for proper cleanup. */
    private _onClickBound?: (ev: MouseEvent) => void;

    protected stateInit: StateInit = {
        text: 'Button',
        disabled: false,
        variant: 'solid',
        color: 'default',
        size: 'md',
        wide: false,
        block: false,
        glass: false,
        active: false,
        loading: false,
        shape: 'rounded',
        iconLeft: null,
        iconRight: null,
        customColor: null,
    };

    /** Use a native <button> as host. */
    protected hostTag(): string { return 'button'; }

    /** Map deprecated `kind` prop to `color` (back-compat). */
    protected beforeMount(): void {
        const s = this.state();
        const k = this.props.kind as ButtonState['kind'] | undefined;
        if (k) s.color = k === 'neutral' ? 'default' : (k as FlyonColor);
    }

    /**
     * Render only the inner content (icons/spinner/text).
     * Classes/attributes are applied to the host here in a differential way.
     */
    protected view() {
        const s = this.state();
        const host = this.el();

        // --- compute class set (only the ones we own) ---------------------------
        const cls = new Set<string>(['btn']);

        // variant
        switch (s.variant) {
            case 'soft':     cls.add('btn-soft'); break;
            case 'outline':  cls.add('btn-outline'); break;
            case 'text':     cls.add('btn-text'); break;
            case 'gradient': cls.add('btn-gradient'); break;
            case 'solid':
            default: break;
        }

        // color
        const COLOR: Record<FlyonColor, string | null> = {
            default: null,
            primary: 'btn-primary',
            secondary: 'btn-secondary',
            accent: 'btn-accent',
            info: 'btn-info',
            success: 'btn-success',
            warning: 'btn-warning',
            error: 'btn-error',
        };
        const colorCls = COLOR[s.color];
        if (colorCls) cls.add(colorCls);

        // size
        if (s.size !== 'md') cls.add(`btn-${s.size}`);

        // shape
        if (s.shape === 'pill') cls.add('rounded-full');
        else if (s.shape === 'circle') cls.add('btn-circle');
        else if (s.shape === 'square') cls.add('btn-square');

        // layout modifiers
        if (s.wide)  cls.add('btn-wide');
        if (s.block) cls.add('btn-block');
        if (s.glass) cls.add('glass');

        // states
        if (s.active)   cls.add('btn-active');
        if (s.disabled) cls.add('btn-disabled'); // visual; real disabled below

        // waves (optional plugin)
        const waves = this.props.waves as boolean | undefined;
        const wavesTone = (this.props.wavesTone as string | undefined) ?? 'light';
        if (waves) {
            cls.add('waves');
            if (wavesTone) cls.add(`waves-${wavesTone}`);
        }

        // merge extra classes from props.className
        const extra = typeof this.props.className === 'string'
            ? this.props.className.split(/\s+/).filter(Boolean)
            : [];
        for (const c of extra) cls.add(c);

        // --- apply classes to host (diff: remove only what we applied before) ---
        for (const c of this._appliedClasses) host.classList.remove(c);
        for (const c of cls) host.classList.add(c);
        this._appliedClasses = cls; // track for next diff

        // --- attributes ----------------------------------------------------------
        const isDisabled = s.disabled || s.loading;
        host.toggleAttribute('disabled', !!isDisabled);
        if (s.loading) host.setAttribute('aria-busy', 'true'); else host.removeAttribute('aria-busy');

        // aria-label fallback if icon-only
        const ariaLabel: string | undefined =
            (this.props.ariaLabel as string | undefined) || (s.text ? undefined : 'Button');
        if (ariaLabel) host.setAttribute('aria-label', ariaLabel); else host.removeAttribute('aria-label');

        // custom color via CSS var
        const custom = s.customColor ?? (this.props.customColor as string | undefined) ?? null;
        if (!colorCls && custom) host.style.setProperty('--btn-color', custom);
        else host.style.removeProperty('--btn-color');

        // --- events (bound once) -------------------------------------------------
        if (!this._onClickBound) {
            const onClick = this.props.onClick as ((btn: Button, ev: MouseEvent) => void) | undefined;
            if (onClick) {
                this._onClickBound = (ev: MouseEvent) => onClick(this, ev);
                host.addEventListener('click', this._onClickBound);
            }
        }

        // --- inner content -------------------------------------------------------
        const spinner = s.loading ? html`<span class="loading loading-spinner"></span>` : null;
        const leftIcon = s.iconLeft ? html`<span class=${s.iconLeft}></span>` : null;
        const rightIcon = s.iconRight ? html`<span class=${s.iconRight}></span>` : null;
        const textNode = s.text ? html`${s.text}` : null;

        return html`${leftIcon} ${spinner} ${textNode} ${rightIcon}`;
    }

    /** Cleanup event listeners. */
    protected beforeUnmount(): void {
        if (this._onClickBound) {
            this.el().removeEventListener('click', this._onClickBound);
            this._onClickBound = undefined;
        }
    }
}

// AUTO-REGISTER on module import
ComponentRegistry.registerClass(Button);
