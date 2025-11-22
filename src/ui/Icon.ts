// src/ui/Icon.ts
import { html } from 'uhtml';
import {
    Component,
    type ComponentConfig,
    type ComponentProps,
    type ComponentState,
} from './Component';

export interface IconState extends ComponentState {
    icon: string | null;
}

export interface IconProps extends ComponentProps {
    className?: string;
    sizeClass?: string | null;
}

export class Icon extends Component<IconState, IconProps> {

    protected override initialState(): IconState {
        return {
            ...(super.initialState() as ComponentState),
            icon: null,
        } satisfies IconState;
    }

    protected override beforeMount(): void {
        super.beforeMount();
        this.ensureNormalizedIcon();
    }

    protected override view() {
        const s = this.state();
        const p = this.props();
        const cls = normalizeIcon(s.icon, p.sizeClass ?? 'size-5');
        if (!cls) return html``;
        const allCls = [cls, p.className ?? null].filter(Boolean).join(' ');
        return html`<span class=${allCls}></span>`;
    }

    protected override afterMount(): void {
        super.afterMount();
        this._unsubs.push(
            this.state().on('icon', () => this.ensureNormalizedIcon(), { immediate: true })
        );
    }

    private ensureNormalizedIcon(): void {
        const s = this.state();
        const p = this.props();
        const norm = normalizeIcon(s.icon, p.sizeClass ?? 'size-5');
        if (norm !== s.icon) {
            s.icon = norm;
        }
    }
}

export function icon(
    cfg: ComponentConfig<IconState, IconProps> | string = {}
): Icon {
    if (typeof cfg === 'string') {
        return new Icon({ icon: cfg });
    }
    return new Icon(cfg);
}

/** Espande un nome breve di icona Tabler in `icon-[tabler--name]` + size opzionale. */
function normalizeIcon(name?: string | null, sizeClass?: string | null): string | null {
    if (!name) return null;
    if (name.includes('icon-[')) {
        if (sizeClass && !name.includes(sizeClass)) {
            return `${name} ${sizeClass}`;
        }
        return name;
    }
    return [ `icon-[tabler--${name}]`, sizeClass ?? null ].filter(Boolean).join(' ');
}
