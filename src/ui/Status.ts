import { html } from 'uhtml';
import {
    Component,
    type ComponentConfig,
    type ComponentProps,
} from './Component';
import { mergeSchemas } from './schemaUtils';

export type StatusColor = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'neutral' | 'error';
export type StatusSize = 'xs' | 'sm' | 'md' | 'lg';
export type StatusAnimation = 'none' | 'bounce' | 'ping' | 'pulse';

export interface StatusState extends ComponentState {
    color: StatusColor;
    size: StatusSize;
    animation: StatusAnimation;
}

export interface StatusProps extends ComponentProps {}

export class Status extends Component<StatusState, StatusProps> {
    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), {
            properties: {
                color: { type: 'string', default: 'success' },
                size: { type: 'string', default: 'md' },
                animation: { type: 'string', default: 'none' }
            }
        });
    }

    protected override view() {
        const s = this.state();
        const classes = [
            'status',
            `status-${s.color}`,
            s.size !== 'md' ? `status-${s.size}` : null,
            s.animation === 'bounce' ? 'animate-bounce' : null,
            s.animation === 'pulse' ? 'animate-pulse' : null,
        ].filter(Boolean);
        const baseClass = classes.join(' ') || null;

        if (s.animation === 'ping') {
            const dot = html`<span class=${baseClass}></span>`;
            const waveCls = [baseClass, 'animate-ping'].filter(Boolean).join(' ') || 'animate-ping';
            const wave = html`<span class=${waveCls}></span>`;
            return html`
        <span class="inline-grid *:[grid-area:1/1]">${dot}${wave}</span>`;
        }

        return html`<span class=${baseClass}></span>`;
    }
}

export function status(cfg: ComponentConfig<StatusState, StatusProps> = {}): Status {
    return new Status(cfg);
}
