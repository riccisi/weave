import type {Layout, LayoutApplyContext} from './Layout';

/**
 * JoinLayout implements FlyonUI "join" groups:
 *   <div class="join join-horizontal rounded-lg drop-shadow-sm">
 *     <button class="btn join-item">A</button>
 *     <button class="btn join-item">B</button>
 *   </div>
 */
export interface JoinLayoutConfig {
    type: 'join';
    orientation?: 'horizontal' | 'vertical';
    rounded?: string; // e.g. "rounded-lg"
    shadow?: boolean; // if true, add "drop-shadow-sm"
}

/**
 * JoinLayout:
 * - Adds "join join-horizontal|vertical" to the container
 * - Adds "join-item" class to each child element
 * - Allows optional rounded/shadow sugar
 */
export class JoinLayout implements Layout {
    constructor(private cfg: JoinLayoutConfig) {
    }

    apply(ctx: LayoutApplyContext): void {
        const {host, children} = ctx;
        const {orientation = 'horizontal', rounded, shadow} = this.cfg;

        host.classList.add('join');
        host.classList.add(orientation === 'vertical' ? 'join-vertical' : 'join-horizontal');

        if (rounded) host.classList.add(rounded);
        if (shadow) host.classList.add('drop-shadow-sm');

        for (const child of children) {
            const el = child.el();
            if (!el) continue;
            el.classList.add('join-item');
        }
    }

    dispose(ctx: LayoutApplyContext): void {
        const {host, children} = ctx;
        const {orientation = 'horizontal', rounded, shadow} = this.cfg;

        host.classList.remove('join');
        host.classList.remove(orientation === 'vertical' ? 'join-vertical' : 'join-horizontal');

        if (rounded) host.classList.remove(rounded);
        if (shadow) host.classList.remove('drop-shadow-sm');

        for (const child of children) {
            child.el()?.classList.remove('join-item');
        }
    }
}

/**
 * Factory helper:
 *
 *   layout: joinLayout({
 *     orientation: 'horizontal',
 *     rounded: 'rounded-lg',
 *     shadow: true
 *   })
 */
export function joinLayout(
    cfg: Omit<JoinLayoutConfig, 'type'>
): JoinLayout {
    return new JoinLayout({type: 'join', ...cfg});
}
