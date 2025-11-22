import {html} from 'uhtml';
import {Container, type ContainerProps, type ContainerState} from './Container';
import {Component, type ComponentConfig} from './Component';

/**
 * Reactive state driving {@link Drawer} visibility and placement.
 */
export interface DrawerState extends ContainerState {
    /** Controls whether the drawer is visible. */
    open: boolean;
    /** Edge of the viewport anchoring the drawer. */
    placement: 'left' | 'right';
    /** When true shows the backdrop overlay. */
    backdrop: boolean;
    /** When true pressing ESC closes the drawer. */
    closeOnEsc: boolean;
    /** When true clicking the backdrop closes the drawer. */
    closeOnBackdrop: boolean;
    /** Custom width for the drawer (e.g. "18rem"). */
    width: string | null;
}

/**
 * Static configuration for {@link Drawer}.
 */
export interface DrawerProps extends ContainerProps {
    /** Components rendered inside the drawer panel. */
    content?: Array<Component | ComponentConfig>;
    /** Extra CSS classes appended to the host. */
    className?: string;
}

/**
 * Overlay side drawer with optional backdrop and focus trapping.
 */
export class Drawer extends Container<DrawerState, DrawerProps> {
    private _backdropEl: HTMLDivElement | null = null;
    private _boundKeydown: (ev: KeyboardEvent) => void;
    private _boundBackdropClick: (ev: MouseEvent) => void;

    constructor(cfg: ComponentConfig<DrawerState, DrawerProps> = {} as ComponentConfig<
        DrawerState,
        DrawerProps
    >) {
        super(cfg);
        this._boundKeydown = (ev) => this.onKeydown(ev);
        this._boundBackdropClick = (ev) => this.onBackdropClick(ev);
    }

    protected override initialState(): DrawerState {
        return {
            ...(super.initialState() as ContainerState),
            open: false,
            placement: 'left',
            backdrop: false,
            closeOnEsc: true,
            closeOnBackdrop: true,
            width: null
        } satisfies DrawerState;
    }

    protected override hostTag(): string {
        return 'aside';
    }

    protected override beforeMount(): void {
        const p = this.props as DrawerProps;
        (this.props as any).items = this.normalizeContent(p.content);
        super.beforeMount();
    }

    protected override afterMount(): void {
        super.afterMount();
        const host = this.el();
        host.tabIndex = -1;

        const st = this.state();
        this._unsubs.push(
            st.on('open', () => this.applyOpenState(), {immediate: true})
        );
        this._unsubs.push(
            st.on('placement', () => this.applyPlacement(), {immediate: true})
        );
        this._unsubs.push(
            st.on('backdrop', () => this.syncBackdrop(), {immediate: true})
        );
        this._unsubs.push(
            st.on('width', () => this.applyWidth(), {immediate: true})
        );

        host.addEventListener('keydown', this._boundKeydown);
        this.applyPlacement();
        this.applyWidth();
        this.applyOpenState();
    }

    protected override beforeUnmount(): void {
        const host = this.el();
        host.removeEventListener('keydown', this._boundKeydown);
        this.disposeBackdrop();
        super.beforeUnmount();
    }

    protected override view() {
        const s = this.state();
        const classes = this.hostClasses(
            'fixed',
            'inset-y-0',
            'z-50',
            'flex',
            'flex-col',
            'bg-base-100',
            'shadow-xl',
            'transition-transform',
            'duration-200',
            'ease-in-out',
            'focus:outline-none',
            s.open ? 'translate-x-0' : null,
            this.propClassNames()
        );
        this.syncHostClasses(classes);

        return html`${super.view()}`;
    }

    private normalizeContent(items?: Array<Component | ComponentConfig>): Component[] {
        if (!items) return [];
        return items.map((entry) => {
            if (entry instanceof Component) {
                return entry;
            }
            const factory = (entry as any)?.component;
            if (typeof factory === 'function') {
                return factory(entry);
            }
            throw new Error(
                'Drawer content must be Component instances or configs including a `component` factory.'
            );
        });
    }

    private applyOpenState(): void {
        const host = this.el();
        const st = this.state();
        const placement = st.placement === 'right' ? 'right' : 'left';

        host.style.pointerEvents = st.open ? 'auto' : 'none';
        host.setAttribute('aria-hidden', st.open ? 'false' : 'true');

        if (st.open) {
            host.setAttribute('role', 'dialog');
            host.setAttribute('aria-modal', 'true');
            this.focusInitial();
        } else {
            host.removeAttribute('role');
            host.removeAttribute('aria-modal');
        }

        const translate = st.open
            ? 'translateX(0)'
            : placement === 'left'
                ? 'translateX(-100%)'
                : 'translateX(100%)';
        host.style.transform = translate;

        this.syncBackdrop();
    }

    private applyPlacement(): void {
        const host = this.el();
        const placement = this.state().placement === 'right' ? 'right' : 'left';
        host.style.left = placement === 'left' ? '0' : '';
        host.style.right = placement === 'right' ? '0' : '';
    }

    private applyWidth(): void {
        const host = this.el();
        const width = this.state().width;
        host.style.width = width ?? '16rem';
    }

    private focusInitial(): void {
        queueMicrotask(() => {
            if (!this.state().open) return;
            const host = this.el();
            const focusable = this.focusableElements();
            if (focusable.length > 0) {
                focusable[0].focus();
            } else {
                host.focus();
            }
        });
    }

    private onKeydown(ev: KeyboardEvent): void {
        if (!this.state().open) return;
        if (ev.key === 'Escape' && this.state().closeOnEsc) {
            this.state().open = false;
            ev.stopPropagation();
            return;
        }

        if (ev.key === 'Tab') {
            this.trapFocus(ev);
        }
    }

    private trapFocus(ev: KeyboardEvent): void {
        const focusable = this.focusableElements();
        if (focusable.length === 0) {
            ev.preventDefault();
            this.el().focus();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (ev.shiftKey) {
            if (!active || active === first) {
                ev.preventDefault();
                last.focus();
            }
        } else {
            if (!active || active === last) {
                ev.preventDefault();
                first.focus();
            }
        }
    }

    private focusableElements(): HTMLElement[] {
        const host = this.el();
        const selectors =
            'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
        const nodes = Array.from(host.querySelectorAll<HTMLElement>(selectors));
        return nodes.filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
    }

    private ensureBackdrop(): HTMLDivElement {
        if (this._backdropEl) return this._backdropEl;
        const el = document.createElement('div');
        el.className = 'fixed inset-0 z-40 bg-base-content/40 transition-opacity duration-200';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.addEventListener('click', this._boundBackdropClick);
        this._backdropEl = el;
        return el;
    }

    private syncBackdrop(): void {
        const st = this.state();
        const shouldShow = st.open && st.backdrop;
        const el = this.ensureBackdrop();

        if (shouldShow) {
            if (!el.parentElement) {
                const parent = this.el().parentElement ?? document.body;
                parent.appendChild(el);
            }
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
        } else {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            if (el.parentElement) {
                // Delay removal slightly so opacity transition can run.
                setTimeout(() => {
                    if (!this.state().open || !this.state().backdrop) {
                        const parent = el.parentElement;
                        if (parent) parent.removeChild(el);
                    }
                }, 200);
            }
        }
    }

    private onBackdropClick(ev: MouseEvent): void {
        if (!this.state().open) return;
        if (!this.state().closeOnBackdrop) return;
        ev.preventDefault();
        this.state().open = false;
    }

    private disposeBackdrop(): void {
        if (!this._backdropEl) return;
        this._backdropEl.removeEventListener('click', this._boundBackdropClick);
        if (this._backdropEl.parentElement) {
            this._backdropEl.parentElement.removeChild(this._backdropEl);
        }
        this._backdropEl = null;
    }
}

/** Factory helper for {@link Drawer}. */
export function drawer(
    cfg: ComponentConfig<DrawerState, DrawerProps> = {} as ComponentConfig<DrawerState, DrawerProps>
): Drawer {
    return new Drawer(cfg);
}
