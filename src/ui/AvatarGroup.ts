// src/ui/AvatarGroup.ts
import { html } from 'uhtml';
import { avatar, Avatar, type AvatarProps, type AvatarState } from './Avatar';
import { content, type Content } from './Content';
import { Component, type ComponentConfig, type ComponentProps, type ComponentState } from './Component';

type Overlap = 'none' | 'xs' | 'sm' | 'md' | 'lg';

export interface AvatarGroupState extends ComponentState {
    /** Numero massimo di avatar visibili (null = tutti). Reattivo. */
    max: number | null;
}

export interface AvatarGroupProps extends ComponentProps {
    /** Istanze Avatar o config per crearle. */
    avatars?: Array<Avatar | ComponentConfig<AvatarState, AvatarProps>>;
    /** Defaults applicati agli avatar (se non override sull’item). */
    defaults?: Partial<AvatarState>;
    /** Densità overlap (Tailwind -space-x-*). */
    overlap?: Overlap;
    /** Direzione RTL per overlap. */
    rtl?: boolean;
    /** Classi extra per il badge overflow +N. */
    overflowBadgeClass?: string;
}

export class AvatarGroup extends Component<AvatarGroupState, AvatarGroupProps> {
    private _avatars: Avatar[] = [];
    private _overflow?: Content;

    protected override initialState(): AvatarGroupState {
        return {
            ...(super.initialState() as ComponentState),
            max: null,
        };
    }

    /** Costruisce i figli (nessun mount qui). */
    protected override beforeMount(): void {
        super.beforeMount();

        const p = this.props();
        this._avatars  = this.buildAvatars(p);
        this._overflow = this.buildOverflowBadge();

        // Reattività su `max`
        this._unsubs.push(
            this.state().on('max', () => this.updateVisibility(), { immediate: true })
        );
    }

    /** Monta i figli direttamente sull’host del gruppo (DOM piatto, senza slot). */
    protected override afterMount(): void {
        // monta avatar
        for (const av of this._avatars) av.mount(this);
        // monta badge overflow
        this._overflow?.mount(this);

        // allinea visibilità iniziale
        this.updateVisibility();

        super.afterMount();
    }

    protected override beforeUnmount(): void {
        for (const av of this._avatars) av.unmount();
        this._avatars = [];
        this._overflow?.unmount();
        this._overflow = undefined;
        super.beforeUnmount();
    }

    /** Root minimale: solo contenitore del gruppo con classi di layout. */
    protected override view() {
        const p = this.props();
        const cls = [
            'avatar-group',
            this.overlapToClass(p.overlap ?? 'md'),
            p.rtl ? 'rtl:space-x-reverse' : null,
            p.className ?? null,
        ].filter(Boolean).join(' ');

        // Nessun child nel template: i figli vengono montati programmaticamente in afterMount()
        return html`<div class=${cls}></div>`;
    }

    // ---------- helpers ----------------------------------------------------------

    private buildAvatars(p: AvatarGroupProps): Avatar[] {
        const list = Array.isArray(p.avatars) ? p.avatars : [];
        const defaults = p.defaults ?? {};

        const toAvatar = (it: Avatar | ComponentConfig<AvatarState, AvatarProps>): Avatar => {
            if (it instanceof Avatar) return it;

            const cfg = { ...(it as any) };
            // applica defaults solo dove mancano valori
            for (const [k, v] of Object.entries(defaults)) {
                if (!(k in cfg)) cfg[k] = v as any;
            }
            return avatar(cfg);
        };

        return list.map(toAvatar);
    }

    /** Badge overflow (+N) come Content; legge `max` tramite la catena di stato. */
    private buildOverflowBadge(): Content {
        const p = this.props();
        const sizeCls  = this.sizeToClass((p.defaults?.size  ?? 'md') as AvatarState['size']);
        const shapeCls = this.shapeToClass((p.defaults?.shape ?? 'rounded') as AvatarState['shape']);
        const extraCls = p.overflowBadgeClass ?? '';

        // Content con render function reattiva: singolo root <div class="avatar">…
        return content((st) => {
            const max    = st.max ?? this._avatars.length;
            const extra  = Math.max(0, this._avatars.length - max);
            const hidden = extra <= 0;

            return html`
            <div class=${['avatar', 'avatar-placeholder', hidden ? 'hidden' : ''].filter(Boolean).join(' ')}>
              <div class=${[
                        'flex',
                        'items-center',
                        'justify-center',
                        'uppercase',
                        sizeCls,
                        shapeCls,
                        'bg-base-300',
                        'text-base-content',
                        extraCls
                    ]
                    .filter(Boolean)
                    .join(' ')}>
                +${extra}
              </div>
            </div>
          `;
        });
    }

    /** Mostra i primi `max` avatar, nasconde gli altri; il badge si aggiorna da solo. */
    private updateVisibility(): void {
        const max = this.state().max ?? this._avatars.length;
        this._avatars.forEach((av, i) => {
            av.state().hidden = i >= max;
        });
    }

    private overlapToClass(overlap: Overlap): string {
        switch (overlap) {
            case 'none': return 'space-x-2';
            case 'xs':   return '-space-x-1';
            case 'sm':   return '-space-x-2';
            case 'md':   return '-space-x-3';
            case 'lg':   return '-space-x-4';
            default:     return '-space-x-3';
        }
    }

    private sizeToClass(size: AvatarState['size']): string {
        switch (size) {
            case 'xs': return 'size-6';
            case 'sm': return 'size-8';
            case 'md': return 'size-10';
            case 'lg': return 'size-12';
            case 'xl': return 'size-16';
            default:   return 'size-10';
        }
    }

    private shapeToClass(shape: AvatarState['shape']): string {
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
}

// Factory
export function avatarGroup(
    cfg: ComponentConfig<AvatarGroupState, AvatarGroupProps> = {}
): AvatarGroup {
    return new AvatarGroup(cfg);
}
