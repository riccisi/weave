import {AbstractAttribute} from './AbstractAttribute';
import type {Attribute, Unsub} from './Attribute';
import type {State} from './State';
import {PathResolver} from './PathResolver';

/**
 * Represents a path-based attribute that enables dynamic resolution and binding
 * of attributes within a hierarchical structure. This class provides an API
 * for retrieving, updating, subscribing to, and disposing of attributes
 * resolved through a specified path.
 *
 * @template T The type of the attribute's value. Defaults to `any`.
 * @extends AbstractAttribute<T>
 */
export class PathAttribute<T = any> extends AbstractAttribute<T> {

    private unsubs: Unsub[] = [];

    constructor(private owner: State, private path: string) {
        super(`$path:${path}`, (owner as any)._runtime);
    }

    // ---------- Subscriptions (rewire) ----------

    private clearSubscriptions(): void {
        for (const off of this.unsubs) off();
        this.unsubs = [];
    }

    private bindSubscriptions(final: Attribute<any>, intermediates: Attribute<any>[]) {
        const indexFinal = (final as any).constructor?.name === 'IndexAttribute';

        for (const a of intermediates) {
            const cb = indexFinal
                ? () => {
                    this.rewire();
                }            // evita doppie emit quando finale è index
                : () => {
                    this.rewire();
                    this.emit();
                };
            this.unsubs.push(a.subscribe(cb, {immediate: false}));
        }
        this.unsubs.push(final.subscribe(() => this.emit(), {immediate: false}));
    }

    private rewire() {
        this.clearSubscriptions();
        const {final, intermediates} = PathResolver.resolve(this.owner, this.path);
        this.bindSubscriptions(final, intermediates);
    }

    // ---------- Attribute API ----------

    get(): T {
        if (this.watchers.size > 0 && this.unsubs.length === 0) this.rewire();
        const {final} = PathResolver.resolve(this.owner, this.path);
        this.collect();
        return final.get();
    }

    set(v: T): void {
        const {final} = PathResolver.resolve(this.owner, this.path);
        final.set(v as any);
    }

    isWritable(): boolean {
        const {final} = PathResolver.resolve(this.owner, this.path);
        return final.isWritable();
    }

    subscribe(fn: (v: T) => void, opts?: { immediate?: boolean }) {
        const off = super.subscribe(fn, opts);
        if (this.unsubs.length === 0) this.rewire();
        return off;
    }

    dispose(): void {
        super.dispose();
        this.clearSubscriptions();
    }
}
