// src/ui/Badge.ts
import { html } from 'uhtml';
import { Component, type ComponentConfig, type ComponentProps, type ComponentState } from './Component';

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
    iconLeft: string | null;
    iconRight: string | null;
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
            iconRight: null,
        };
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
        const leftIcon  = s.iconLeft  ? html`<span class=${s.iconLeft}></span>`   : null;
        const rightIcon = s.iconRight ? html`<span class=${s.iconRight}></span>`  : null;
        const textNode  = s.text ? html`${s.text}` : null;

        return html`
        <span class=${cls.join(' ')}>
             ${leftIcon} ${textNode} ${rightIcon}
        </span>`;
    }
}

/** Factory ergonomica */
export function badge(cfg: ComponentConfig<BadgeState, BadgeProps> = {}): Badge {
    return new Badge(cfg);
}