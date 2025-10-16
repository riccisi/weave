import {AbstractAttribute} from './AbstractAttribute';
import {State} from './State';

/**
 * Represents a list attribute that maintains reactivity and ensures immutability
 * by wrapping elements and providing Proxy-based internal handling.
 *
 * This class extends `AbstractAttribute`, managing an array of values, enabling
 * reactive state management and safe mutation operations. It provides helper
 * methods for manipulating the list (e.g., `update`, `replaceAll`, `insertAt`),
 * and overrides the behavior of fundamental Array operations (e.g., `push`, `pop`,
 * `splice`) for ensuring consistent wrapping of elements and emitting change
 * events when necessary.
 *
 * Uses Proxies to provide virtual reactivity to the list operations, ensuring
 * changes are tracked and broadcasted through the `emit()` method.
 *
 * Generic parameter `T` is used to type the list elements, defaulting to `any`
 * if not specified.
 *
 * @template T - The type of elements in the ListAttribute.
 */
export class ListAttribute<T = any> extends AbstractAttribute<T[]> {

    private items: any[];
    private proxyArr?: any[];

    constructor(key: string, rt: any, initial: any[]) {
        super(key, rt);
        this.items = initial.map(v => this.wrap(v));
    }

    /** Wrap plain objects into State to keep deep reactivity for list elements. */
    private wrap(v: any): any {
        if (v && typeof v === 'object' && !(v instanceof State)) {
            return new State(v, undefined, this.runtime);
        }
        return v;
    }

    /** Ensure we return a stable Proxy instance with a clean, small handler. */
    private ensureProxy(): any[] {
        if (this.proxyArr) return this.proxyArr;
        this.proxyArr = new Proxy([] as any[], this.buildHandler());
        return this.proxyArr;
    }

    // ---------- Proxy handler construction ----------

    /** Build the Proxy handler by delegating per-concern methods. */
    private buildHandler(): ProxyHandler<any[]> {
        return {
            get: (_target, prop) => this.onGet(prop),
            set: (_target, prop, value) => this.onSet(prop, value),
            ownKeys: () => Reflect.ownKeys(this.items),
            getOwnPropertyDescriptor: (_t, p) => Object.getOwnPropertyDescriptor(this.items, p as any),
        };
    }

    /** Handle property reads on the proxy (length, helpers, mutators, index, delegation). */
    private onGet(prop: PropertyKey): any {
        // length is derived
        if (prop === 'length') return this.items.length;

        // helpers first (chainable)
        const helper = this.helperFor(prop);
        if (helper) return helper;

        // mutating array operations
        if (typeof prop === 'string') {
            const mutator = this.mutatorFor(prop);
            if (mutator) return mutator;

            // numeric index read
            const idxVal = this.indexRead(prop);
            if (idxVal !== undefined) return idxVal;

            // non-mutating methods/properties → delegate to snapshot
            return this.delegateNonMutating(prop);
        }

        // fallback (rare)
        return (this.items as any)[prop as any];
    }

    /** Handle property writes on the proxy (length, numeric index, fallback). */
    private onSet(prop: PropertyKey, value: any): boolean {
        if (prop === 'length') return this.setLength(value);
        if (typeof prop === 'string') {
            const idx = Number(prop);
            if (!Number.isNaN(idx) && Number.isInteger(idx)) {
                const wrapped = this.wrap(value);
                if (this.items[idx] !== wrapped) {
                    this.items[idx] = wrapped;
                    this.emit();
                }
                return true;
            }
        }
        // generic property write on the backing array (extremely uncommon)
        (this.items as any)[prop as any] = value;
        this.emit();
        return true;
    }

    // ---------- Helpers (chainable) ----------

    private helperFor(prop: PropertyKey) {
        if (prop === 'update') {
            return (idx: number, fn: (current: any, idx: number) => any) => {
                if (idx < 0 || idx >= this.items.length) return this.proxyArr as any;
                const next = this.wrap(fn(this.items[idx], idx));
                if (this.items[idx] !== next) {
                    this.items[idx] = next;
                    this.emit();
                }
                return this.proxyArr as any;
            };
        }
        if (prop === 'replaceAll') {
            return (fn: (current: any, idx: number) => any) => {
                let changed = false;
                for (let i = 0; i < this.items.length; i++) {
                    const next = this.wrap(fn(this.items[i], i));
                    if (this.items[i] !== next) {
                        this.items[i] = next;
                        changed = true;
                    }
                }
                if (changed) this.emit();
                return this.proxyArr as any;
            };
        }
        if (prop === 'insertAt') {
            return (idx: number, value: any) => {
                const i = Math.max(0, Math.min(idx, this.items.length));
                this.items.splice(i, 0, this.wrap(value));
                this.emit();
                return this.proxyArr as any;
            };
        }
        if (prop === 'removeAt') {
            return (idx: number, count: number = 1) => {
                if (idx < 0 || idx >= this.items.length || count <= 0) return this.proxyArr as any;
                this.items.splice(idx, count);
                this.emit();
                return this.proxyArr as any;
            };
        }
        if (prop === 'move') {
            return (from: number, to: number) => {
                if (from === to) return this.proxyArr as any;
                if (from < 0 || from >= this.items.length) return this.proxyArr as any;
                const item = this.items.splice(from, 1)[0];
                const i = Math.max(0, Math.min(to, this.items.length));
                this.items.splice(i, 0, item);
                this.emit();
                return this.proxyArr as any;
            };
        }
        return undefined;
    }

    // ---------- Mutators (Array API) ----------

    private mutatorFor(prop: string) {
        if (prop === 'push') {
            return (...args: any[]) => {
                const r = this.items.push(...args.map(a => this.wrap(a)));
                this.emit();
                return r;
            };
        }
        if (prop === 'pop') {
            return () => {
                const r = this.items.pop();
                this.emit();
                return r;
            };
        }
        if (prop === 'splice') {
            return (start: number, deleteCount?: number, ...args: any[]) => {
                const r = this.items.splice(start, deleteCount as any, ...args.map(a => this.wrap(a)));
                this.emit();
                return r;
            };
        }
        if (prop === 'shift') {
            return () => {
                const r = this.items.shift();
                this.emit();
                return r;
            };
        }
        if (prop === 'unshift') {
            return (...a: any[]) => {
                const r = this.items.unshift(...a.map(b => this.wrap(b)));
                this.emit();
                return r;
            };
        }
        if (prop === 'reverse') {
            return () => {
                this.items.reverse();
                this.emit();
                return this.proxyArr as any;
            };
        }
        if (prop === 'sort') {
            return (cmp?: (a: any, b: any) => number) => {
                this.items.sort(cmp);
                this.emit();
                return this.proxyArr as any;
            };
        }
        if (prop === 'copyWithin') {
            return (...args: any[]) => {
                (this.items as any).copyWithin(...args);
                this.emit();
                return this.proxyArr as any;
            };
        }
        if (prop === 'fill') {
            return (val: any, start?: number, end?: number) => {
                this.items.fill(this.wrap(val), start as any, end as any);
                this.emit();
                return this.proxyArr as any;
            };
        }
        return undefined;
    }

    // ---------- Index & delegation ----------

    /** Numeric index read (returns undefined when `prop` is not a valid index). */
    private indexRead(prop: string): any | undefined {
        const idx = Number(prop);
        if (!Number.isNaN(idx) && Number.isInteger(idx)) {
            return this.items[idx];
        }
        return undefined;
        // intentional: do not emit on read; reads are tracked via AbstractAttribute.collect()
    }

    /** Delegate non-mutating methods/properties to a snapshot of the backing array. */
    private delegateNonMutating(prop: string): any {
        const snapshot = this.items;
        const val = (snapshot as any)[prop];
        return typeof val === 'function' ? val.bind(snapshot) : val;
    }

    /** Handle writes to `.length`. */
    private setLength(value: any): boolean {
        const newLen = Number(value);
        if (Number.isInteger(newLen) && newLen >= 0 && newLen !== this.items.length) {
            this.items.length = newLen;
            this.emit();
        }
        return true;
    }

    // ---------- Attribute API ----------

    get(): T[] {
        this.collect();
        return this.ensureProxy();
    }

    set(v: any[]): void {
        if (!Array.isArray(v)) throw new Error(`'${this.key()}' must be an array`);
        this.items = v.map(x => this.wrap(x));
        this.emit();
    }

    isWritable(): boolean {
        return true;
    }
}
