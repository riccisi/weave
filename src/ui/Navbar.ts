import {html} from 'uhtml';
import {Container, container, type ContainerProps, type ContainerState} from './Container';
import {Component, type ComponentConfig} from './Component';
import {flexLayout} from './layouts/FlexLayout';

/**
 * Reactive state driving {@link Navbar} presentation.
 */
export interface NavbarState extends ContainerState {
    /** When true the navbar sticks to the top edge of the viewport. */
    sticky: boolean;
    /** Adds a drop shadow to emphasize elevation. */
    shadow: boolean;
    /** When true the background is transparent (no bg-base-100). */
    transparent: boolean;
    /** When true reduces the vertical padding for a compact height. */
    dense: boolean;
}

/**
 * Static configuration accepted by {@link Navbar}.
 */
export interface NavbarProps extends ContainerProps {
    /** Components rendered in the left slot. */
    left?: Array<Component | ComponentConfig>;
    /** Components rendered in the center slot. */
    center?: Array<Component | ComponentConfig>;
    /** Components rendered in the right slot. */
    right?: Array<Component | ComponentConfig>;
    /** Extra classes merged with the managed shell classes. */
    className?: string;
}

/**
 * Responsive navigation bar with three composable slots.
 */
export class Navbar extends Container<NavbarState, NavbarProps> {
    private _leftSlot!: Container;
    private _centerSlot!: Container;
    private _rightSlot!: Container;

    protected override initialState(): NavbarState {
        return {
            ...(super.initialState() as ContainerState),
            sticky: false,
            shadow: false,
            transparent: false,
            dense: false
        } satisfies NavbarState;
    }

    protected override hostTag(): string {
        return 'nav';
    }

    protected override beforeMount(): void {
        const p = this.props as NavbarProps;

        this._leftSlot = container({
            className: 'flex items-center gap-2',
            layout: flexLayout({direction: 'row', align: 'center', gap: '0.5rem'}),
            items: this.normalizeSlot(p.left),
            flex: '0 0 auto'
        });

        this._centerSlot = container({
            className: 'flex items-center justify-center gap-2 w-full',
            layout: flexLayout({direction: 'row', align: 'center', gap: '0.5rem', justify: 'center'}),
            items: this.normalizeSlot(p.center),
            flex: '1 1 auto'
        });

        this._rightSlot = container({
            className: 'flex items-center gap-2 justify-end',
            layout: flexLayout({direction: 'row', align: 'center', gap: '0.5rem', justify: 'end'}),
            items: this.normalizeSlot(p.right),
            flex: '0 0 auto'
        });

        (this.props as any).items = [this._leftSlot, this._centerSlot, this._rightSlot];
        (this.props as any).layout = flexLayout({
            direction: 'row',
            align: 'center',
            justify: 'between',
            gap: '0.5rem'
        });

        super.beforeMount();
    }

    protected override view() {
        const s = this.state();
        const classes = this.hostClasses(
            'navbar',
            'w-full',
            s.dense ? 'py-2' : 'py-3',
            'px-4',
            s.transparent ? null : 'bg-base-100',
            s.transparent ? null : 'backdrop-blur',
            s.transparent ? 'bg-transparent' : null,
            s.shadow ? 'shadow-md' : null,
            s.sticky ? 'sticky top-0 z-40' : null,
            this.propClassNames()
        );

        this.syncHostClasses(classes);

        return html`${super.view()}`;
    }

    private normalizeSlot(items?: Array<Component | ComponentConfig>): Component[] {
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
                'Navbar slot items must be Component instances or configs including a `component` factory.'
            );
        });
    }
}

/** Factory helper producing a {@link Navbar} instance. */
export function navbar(
    cfg: ComponentConfig<NavbarState, NavbarProps> = {} as ComponentConfig<NavbarState, NavbarProps>
): Navbar {
    return new Navbar(cfg);
}
