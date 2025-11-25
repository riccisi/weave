import {html} from 'uhtml';
import {Container, container, type ContainerProps, type ContainerState} from './Container';
import {Component, type ComponentConfig} from './Component';
import {flexLayout} from './layouts/FlexLayout';
import {Drawer, drawer} from './Drawer';
import type {Navbar} from './Navbar';
import { mergeSchemas } from './schemaUtils';

/** Reactive state for {@link AppShell}. */
export interface AppShellState extends ContainerState {
    /** Controls the drawer on mobile viewports. */
    sidebarOpen: boolean;
    /** When true renders the sidebar statically on desktop viewports. */
    sidebarStatic: boolean;
}

/** Static props for {@link AppShell}. */
export interface AppShellProps extends ContainerProps {
    /** Optional header component (typically a {@link Navbar}). */
    header?: Navbar | Component | ComponentConfig;
    /** Sidebar content rendered either statically or inside the drawer. */
    sidebar?: Array<Component | ComponentConfig>;
    /** Main content components rendered in the page area. */
    content?: Array<Component | ComponentConfig>;
    /** Width applied to the sidebar (and drawer) in static layouts. */
    sidebarWidth?: string;
    /** Breakpoint (px) switching between static and drawer sidebar. */
    responsiveBreakpoint?: number;
    /** Extra classes appended to the host. */
    className?: string;
}

/** Layout orchestrator composing navbar + sidebar + content areas. */
export class AppShell extends Container<AppShellState, AppShellProps> {
    private _header?: Component;
    private _sidebarContainer!: Container;
    private _contentContainer!: Container;
    private _drawer!: Drawer;
    private _isDesktopViewport = false;
    private readonly _onResize = () => this.handleResize();

    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), {
            properties: {
                sidebarOpen: { type: 'boolean', default: false },
                sidebarStatic: { type: 'boolean', default: true }
            }
        });
    }

    protected override beforeMount(): void {
        const p = this.props as AppShellProps;
        this._header = this.instantiateHeader(p.header);

        this._sidebarContainer = container({
            className: 'flex flex-col gap-4 p-4',
            layout: flexLayout({direction: 'column', gap: '0.75rem'}),
            items: this.normalizeItems(p.sidebar)
        });

        this._contentContainer = container({
            className: 'flex flex-col gap-6 p-6 grow',
            layout: flexLayout({direction: 'column', gap: '1rem'}),
            items: this.normalizeItems(p.content),
            flex: '1 1 auto'
        });

        const drawerWidth = p.sidebarWidth ?? '16rem';
        this._drawer = drawer({
            placement: 'left',
            backdrop: true,
            closeOnBackdrop: true,
            closeOnEsc: true,
            width: drawerWidth,
            content: [this._sidebarContainer]
        });

        const items: Component[] = [];
        if (this._header) items.push(this._header);
        items.push(this._contentContainer, this._drawer);
        (this.props as any).items = items;

        super.beforeMount();
    }

    protected override afterMount(): void {
        super.afterMount();
        const st = this.state();
        this._unsubs.push(
            st.on('sidebarOpen', (open) => {
                if (this._drawer.state().open !== open) {
                    this._drawer.state().open = open;
                }
            }, {immediate: true})
        );
        this._unsubs.push(
            this._drawer.state().on('open', (open: boolean) => {
                if (st.sidebarOpen !== open) {
                    st.sidebarOpen = open;
                }
            })
        );

        window.addEventListener('resize', this._onResize);
        this.handleResize();
    }

    protected override beforeUnmount(): void {
        window.removeEventListener('resize', this._onResize);
        super.beforeUnmount();
    }

    protected override view() {
        const p = this.props as AppShellProps;
        const isStaticSidebar = this.shouldRenderStaticSidebar();
        const sidebarWidth = p.sidebarWidth ?? '16rem';

        const classes = this.hostClasses(
            'relative',
            'flex',
            'min-h-screen',
            'w-full',
            'flex-col',
            'bg-base-200',
            this.propClassNames()
        );
        this.syncHostClasses(classes);

        if (!isStaticSidebar && this._drawer.state().width !== sidebarWidth) {
            this._drawer.state().width = sidebarWidth;
        }

        const headerEl = this._header ? this._header.el() : null;
        const sidebarEl = this._sidebarContainer.el();
        const contentEl = this._contentContainer.el();

        const main = isStaticSidebar
            ? html`
                    <div class="flex flex-1 min-h-0 w-full">
                        <aside
                                class="flex shrink-0 flex-col border-r border-base-300 bg-base-100"
                                style=${`width:${sidebarWidth}`}
                        >
                            ${sidebarEl}
                        </aside>
                        <main class="flex-1 min-h-0 overflow-auto">
                            ${contentEl}
                        </main>
                    </div>`
            : html`
                    <div class="flex flex-1 min-h-0 w-full">
                        <main class="flex-1 min-h-0 overflow-auto">
                            ${contentEl}
                        </main>
                    </div>`;

        return html`${headerEl ?? null}${main}${this._drawer.el()}`;
    }

    /** Toggle the sidebar drawer (mobile). */
    public toggleSidebar(force?: boolean): void {
        const st = this.state();
        const next = typeof force === 'boolean' ? force : !st.sidebarOpen;
        st.sidebarOpen = next;
    }

    /** Open the sidebar drawer explicitly. */
    public openSidebar(): void {
        this.state().sidebarOpen = true;
    }

    /** Close the sidebar drawer explicitly. */
    public closeSidebar(): void {
        this.state().sidebarOpen = false;
    }

    private shouldRenderStaticSidebar(): boolean {
        return this._isDesktopViewport && this.state().sidebarStatic;
    }

    private handleResize(): void {
        const breakpoint = (this.props as AppShellProps).responsiveBreakpoint ?? 1024;
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : breakpoint;
        const isDesktop = viewportWidth >= breakpoint;
        if (this._isDesktopViewport !== isDesktop) {
            this._isDesktopViewport = isDesktop;
            if (isDesktop) {
                this.state().sidebarOpen = false;
            }
            this.requestRender();
        }
    }

    private instantiateHeader(header?: Navbar | Component | ComponentConfig): Component | undefined {
        if (!header) return undefined;
        if (header instanceof Component) {
            return header;
        }
        const factory = (header as any)?.component;
        if (typeof factory === 'function') {
            return factory(header);
        }
        throw new Error('AppShell.header must be a Component instance or config providing a `component` factory.');
    }

    private normalizeItems(items?: Array<Component | ComponentConfig>): Component[] {
        if (!items) return [];
        return items.map((entry) => {
            if (entry instanceof Component) {
                return entry;
            }
            const factory = (entry as any)?.component;
            if (typeof factory === 'function') {
                return factory(entry);
            }
            throw new Error('AppShell slots require Component instances or configs with a `component` factory.');
        });
    }
}

/** Factory helper for {@link AppShell}. */
export function appShell(
    cfg: ComponentConfig<AppShellState, AppShellProps> = {} as ComponentConfig<AppShellState, AppShellProps>
): AppShell {
    return new AppShell(cfg);
}
