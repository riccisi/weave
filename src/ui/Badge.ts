// src/ui/Badge.ts
import { html } from 'uhtml';
import { Component, type ComponentConfig, type ComponentProps } from './Component';
import { icon, type Icon } from './Icon';
import { mergeSchemas } from './schemaUtils';

/** Toni semantici supportati da FlyonUI */
export type BadgeColor =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'info'
    | 'success'
    | 'warning'
    | 'error';

/** Varianti di superficie */
export type BadgeVariant = 'solid' | 'soft' | 'outline' | 'ghost';

/** Taglie (md = default, nessuna classe extra) */
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Stato reattivo del Badge (solo visuale) */
export interface BadgeState extends ComponentState {
    text: string;
    color: BadgeColor;
    variant: BadgeVariant;
    size: BadgeSize;
    pill: boolean;
    dot: boolean;
    icon: string | null;
    iconPosition: 'left' | 'right';
}

/** Props non-reattive (estese in futuro se serve) */
export interface BadgeProps extends ComponentProps {}

/** Mappa colori → classi FlyonUI */
const COLOR_CLASS: Record<BadgeColor, string | null> = {
    default: null,
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    accent: 'badge-accent',
    info: 'badge-info',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
};

export class Badge extends Component<BadgeState, BadgeProps> {
    public static readonly displayName = 'Badge';
    private _icon?: Icon;
    private _iconMountedSide: 'left' | 'right' | null = null;

    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), {
            properties: {
                text: { type: 'string', default: 'Badge' },
                color: { type: 'string', default: 'default' },
                variant: { type: 'string', default: 'solid' },
                size: { type: 'string', default: 'md' },
                pill: { type: 'boolean', default: false },
                dot: { type: 'boolean', default: false },
                icon: { type: ['string', 'null'], default: null },
                iconPosition: { type: 'string', enum: ['left', 'right'], default: 'left' }
            }
        });
    }

    protected override afterMount(): void {
        super.afterMount();
        const s = this.state();
        this._unsubs.push(
            s.on('icon', () => this.syncIcon(), { immediate: false }),
            s.on('iconPosition', () => this.syncIcon(), { immediate: false }),
        );
        this.syncIcon();
    }

    protected override beforeUnmount(): void {
        this._icon?.unmount();
        this._icon = undefined;
        this._iconMountedSide = null;
        super.beforeUnmount();
    }

    /** Rende un unico root `<span>` con tutte le classi già pronte */
    protected override view() {
        const s = this.state();
        const p = this.props();

        const cls: string[] = ['badge'];

        // variant
        if (s.variant === 'soft') cls.push('badge-soft');
        else if (s.variant === 'outline') cls.push('badge-outline');
        else if (s.variant === 'ghost') cls.push('badge-ghost');

        // color
        const colorCls = COLOR_CLASS[s.color];
        if (colorCls) cls.push(colorCls);

        // size
        if (s.size && s.size !== 'md') cls.push(`badge-${s.size}`);

        // pill & dot
        if (s.pill) cls.push('rounded-full');
        if (s.dot) cls.push('badge-dot');

        // opzionale: className passato dal chiamante (ok anche se duplicato: il base class fa merge set)
        if (p.className) cls.push(p.className);

        // contenuto interno: icone + testo
        const textNode  = s.text ? html`${s.text}` : null;

        return html`
        <span class=${cls.join(' ')}>
             <span data-slot="icon-left" style="display: contents"></span>
             ${textNode}
             <span data-slot="icon-right" style="display: contents"></span>
        </span>`;
    }

    private syncIcon(): void {
        const s = this.state();
        const val = s.icon;
        const side = s.iconPosition ?? 'left';
        const slotName = side === 'right' ? 'icon-right' : 'icon-left';

        if (val) {
            if (!this._icon) {
                this._icon = icon({ icon: val, sizeClass: 'size-4' });
                this._icon.mount(this.slotEl(slotName), this);
                this._iconMountedSide = side;
            } else {
                if (this._iconMountedSide !== side) {
                    this._icon.unmount();
                    this._icon.mount(this.slotEl(slotName), this);
                    this._iconMountedSide = side;
                }
                this._icon.state().icon = val;
            }
        } else if (this._icon) {
            this._icon.unmount();
            this._icon = undefined;
            this._iconMountedSide = null;
        }
    }
}

/** Factory ergonomica */
export function badge(cfg: ComponentConfig<BadgeState, BadgeProps> = {}): Badge {
    return new Badge(cfg);
}
