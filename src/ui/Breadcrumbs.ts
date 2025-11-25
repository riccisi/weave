import {html}from 'uhtml';
import {Component, type ComponentConfig, type ComponentProps} from './Component';
import { mergeSchemas } from './schemaUtils';

/** Represents a single breadcrumb item. */
export interface Crumb {
    /** Visible label for the crumb. */
    label: string;
    /** Optional URL to navigate to when activated. */
    href?: string;
    /** Optional click handler invoked when the crumb is activated. */
    onClick?: (ev: MouseEvent) => void;
    /** When true the crumb is rendered as disabled text. */
    disabled?: boolean;
}

/** Reactive state for {@link Breadcrumbs}. */
export interface BreadcrumbsState extends ComponentState {
    /** Separator style between crumbs. */
    separator: 'slash' | 'chevron' | 'dot';
}

/** Static configuration for {@link Breadcrumbs}. */
export interface BreadcrumbsProps extends ComponentProps {
    /** Ordered list of crumbs to render. */
    items: Crumb[];
    /** Extra classes appended to the host. */
    className?: string;
}

/** Accessible breadcrumb trail implementation. */
export class Breadcrumbs extends Component<BreadcrumbsState, BreadcrumbsProps> {
    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), {
            properties: {
                separator: { type: 'string', default: 'slash' }
            }
        });
    }

    protected override hostTag(): string {
        return 'nav';
    }

    protected override afterMount(): void {
        super.afterMount();
        this.el().setAttribute('aria-label', 'Breadcrumb');
    }

    protected override view() {
        const s = this.state();
        const p = this.props as BreadcrumbsProps;
        const classes = this.hostClasses('breadcrumbs', 'text-sm', this.propClassNames());
        this.syncHostClasses(classes);

        const items = Array.isArray(p.items) ? p.items : [];
        const sep = this.separatorSymbol(s.separator);

        const list = items.map((crumb, idx) => {
            const isLast = idx === items.length - 1;
            const separatorNode = idx === 0 ? null : html`<span class="mx-2 opacity-60">${sep}</span>`;
            return html`
                <li class="flex items-center">${separatorNode}${this.renderCrumb(crumb, isLast)}</li>`;
        });

        return html`
            <ol class="flex flex-wrap items-center">${list}</ol>`;
    }

    private renderCrumb(crumb: Crumb, isLast: boolean) {
        const baseClasses = 'inline-flex items-center gap-1';

        if (crumb.disabled) {
            return html`<span class=${`${baseClasses} opacity-60 cursor-not-allowed`}>${crumb.label}</span>`;
        }

        if (isLast) {
            return html`<span class=${`${baseClasses} font-semibold`} aria-current="page">${crumb.label}</span>`;
        }

        const interactiveClasses = `${baseClasses} text-primary hover:underline focus:outline-none focus-visible:ring`;
        const handleClick = crumb.onClick
            ? (ev: MouseEvent) => {
                crumb.onClick?.(ev);
            }
            : undefined;

        if (crumb.href) {
            return html`<a
                    href=${crumb.href}
                    class=${interactiveClasses}
                    onclick=${handleClick}
            >
                ${crumb.label}
            </a>`;
        }

        if (crumb.onClick) {
            return html`
                <button
                        type="button"
                        class=${interactiveClasses}
                        onclick=${handleClick}
                >
                    ${crumb.label}
                </button>`;
        }

        return html`<span class=${baseClasses}>${crumb.label}</span>`;
    }

    private separatorSymbol(type: BreadcrumbsState['separator']): string {
        switch (type) {
            case 'chevron':
                return '›';
            case 'dot':
                return '·';
            case 'slash':
            default:
                return '/';
        }
    }
}

/** Factory helper for {@link Breadcrumbs}. */
export function breadcrumbs(
    cfg: ComponentConfig<BreadcrumbsState, BreadcrumbsProps> = {} as ComponentConfig<
        BreadcrumbsState,
        BreadcrumbsProps
    >
): Breadcrumbs {
    return new Breadcrumbs(cfg);
}
