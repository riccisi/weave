import { html } from 'uhtml';
import { Component, type ComponentConfig, type ComponentProps, type ComponentState } from './Component';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarShape =
    | 'rounded'   // bordi arrotondati standard
    | 'circle'    // pienamente circolare
    | 'square'    // spigoli vivi
    | 'squircle'  // mask squircle
    | 'hexagon'
    | 'triangle';

export interface AvatarState extends ComponentState {
    /** URL immagine; se null mostra placeholder/initials */
    src: string | null;
    /** alt text per l’immagine e per derivare le iniziali se mancanti */
    alt: string;

    /** Iniziali da mostrare nel placeholder (se non date, derivano da alt) */
    initials: string | null;
    /** Icona opzionale per il placeholder (classe Tailwind/Iconify). */
    placeholderIcon: string | null;

    /** Misura dell’avatar */
    size: AvatarSize;

    /** Forma dell’avatar */
    shape: AvatarShape;

    /** Abilita l’anello */
    ring: boolean;
    /** Classe colore ring, es. 'ring-primary' (se null usa una base neutra) */
    ringColor: string | null;
    /** Classe offset ring (es. 'ring-offset-base-100') */
    ringOffset: string | null;
    /** Size offset ring (numero → 'ring-offset-2' ecc.) */
    ringOffsetSize: number | null;

    /** Classi per il placeholder (bg/text) */
    bgClass: string | null;
    textClass: string | null;
}

export interface AvatarProps extends ComponentProps {
}

export class Avatar extends Component<AvatarState, AvatarProps> {

    protected override initialState(): AvatarState {
        return {
            ...(super.initialState() as ComponentState),

            src: null,
            alt: 'Avatar',
            initials: null,
            placeholderIcon: null,

            size: 'md',
            shape: 'circle',

            ring: false,
            ringColor: null,
            ringOffset: 'ring-offset-base-100',
            ringOffsetSize: 2,

            bgClass: 'bg-base-300',
            textClass: 'text-base-content'
        } satisfies AvatarState;
    }

    protected override view() {
        const s = this.state();
        const p = this.props();

        const rootClasses = [
            'avatar',
            s.src ? null : 'avatar-placeholder',
            p.className ?? null,
        ].filter(Boolean).join(' ');

        // Inner box: shape + size + ring
        const sizeCls = this.sizeToClass(s.size);
        const shapeCls = this.shapeToClass(s.shape);

        const innerCls = ['overflow-hidden', sizeCls, shapeCls, ...this.ringClasses(s)]
            .filter(Boolean)
            .join(' ');

        // Contenuto: img oppure placeholder (initials / icona)
        const content = s.src
            ? html`<img src=${s.src} alt=${s.alt ?? ''} />`
            : this.renderPlaceholder(s);

        return html`
          <div class=${rootClasses}>
            <div class=${innerCls}>
              ${content}
            </div>
          </div>
        `;
    }

    // ---- helpers ----------------------------------------------------------------

    private renderPlaceholder(s: AvatarState) {
        const wrapperCls = [
            'flex',
            'items-center',
            'justify-center',
            'uppercase',
            s.bgClass ?? '',
            s.textClass ?? '',
        ].filter(Boolean).join(' ');

        const icon = s.placeholderIcon;
        const payload = icon
            ? html`<span class=${icon}></span>`
            : html`${this.computeInitials(s)}`;

        return html`<span class=${wrapperCls}>${payload}</span>`;
    }

    private ringClasses(s: AvatarState): string[] {
        if (!s.ring) return [];
        const ringClasses: string[] = ['ring'];
        ringClasses.push(s.ringColor ?? 'ring-base-300');
        ringClasses.push(s.ringOffset ?? 'ring-offset-base-100');
        const ro = s.ringOffsetSize ?? 2;
        ringClasses.push(`ring-offset-${ro}`);
        return ringClasses;
    }

    private sizeToClass(size: AvatarSize): string {
        switch (size) {
            case 'xs': return 'size-6';
            case 'sm': return 'size-8';
            case 'md': return 'size-10';
            case 'lg': return 'size-12';
            case 'xl': return 'size-16';
            default:   return 'size-10';
        }
    }

    private shapeToClass(shape: AvatarShape): string {
        switch (shape) {
            case 'rounded':  return 'rounded';
            case 'circle':   return 'rounded-full';
            case 'square':   return 'rounded-none';
            case 'squircle': return 'mask mask-squircle';
            case 'hexagon':  return 'mask mask-hexagon';
            case 'triangle': return 'mask mask-triangle';
            default:         return 'rounded';
        }
    }

    private computeInitials(s: AvatarState): string {
        if (s.initials && s.initials.trim()) return s.initials.trim();
        const alt = (s.alt ?? '').trim();
        if (!alt) return '?';
        const parts = alt.split(/\s+/).filter(Boolean);
        const first = parts[0]?.[0] ?? '';
        const last  = parts.length > 1 ? parts[parts.length - 1][0] : '';
        return (first + last).toUpperCase() || (first.toUpperCase() || '?');
    }

}

export function avatar(
    cfg: ComponentConfig<AvatarState, AvatarProps> | string = {}
): Avatar {
    if (typeof cfg === 'string') {
        return new Avatar({ src: cfg });
    }
    return new Avatar(cfg);
}
