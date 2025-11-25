import {AbstractAttribute} from './AbstractAttribute';
import {State} from './State';
import {ListAttribute} from './ListAttribute';
import type {Unsub} from './Attribute';

/**
 * Represents an attribute that manages a collection of key-value pairs using a map.
 * This class provides reactive capabilities for managing map-like structures.
 * It tracks changes and emits events when modifications occur, ensuring updates are
 * appropriately propagated within the system.
 *
 * Key functionalities of the `MapAttribute` class include:
 * - Support for wrapping object and array values into reactive structures.
 * - Providing API methods to manipulate the map reactively, such as getting, setting, deleting keys, and clearing the map.
 * - Lazy initialization of a map-like proxy object to provide a more object-oriented interface.
 *
 * This class is suitable for handling reactive collections where changes to data need to be tracked and propagated.
 *
 * @template V The type of values stored in the map, defaulting to any.
 * @extends AbstractAttribute
 */
export class MapAttribute extends AbstractAttribute<any> {

    public map = new Map<string, any>();
    private proxyObj?: any;

    constructor(key: string, rt: any, initial: Record<string, any> | Map<string, any>) {
        super(key, rt);
        if (initial instanceof Map) {
            for (const [k, v] of initial.entries()) this.map.set(k, this.wrap(k, v));
        } else {
            for (const k of Object.keys(initial)) this.map.set(k, this.wrap(k, (initial as any)[k]));
        }
    }

    /** Wrappa array/oggetti in strutture reattive. */
    private wrap(k: string, v: any): any {
        if (Array.isArray(v)) {
            const la = new ListAttribute(`${this.key()}.${k}`, this.runtime, v);
            return la.get(); // restituisce il Proxy dell'array
        }
        if (v && typeof v === 'object' && !(v instanceof State)) {
            return new State(v, { runtime: this.runtime });
        }
        return v;
    }

    /** API di convenienza per accesso diretto (partecipano al tracking). */
    getValue(key: string): any {
        this.collect();
        return this.map.get(key);
    }

    setValue(key: string, v: any): void {
        const wrapped = this.wrap(key, v);
        const prev = this.map.get(key);
        if (prev !== wrapped) {
            this.map.set(key, wrapped);
            this.emit();
        }
    }

    deleteKey(key: string): void {
        if (this.map.delete(key)) this.emit();
    }

    clearAll(): void {
        if (this.map.size) {
            this.map.clear();
            this.emit();
        }
    }

    /** Costruisce il Proxy dell'oggetto Map-like una sola volta. */
    private ensureProxy(): any {
        if (this.proxyObj) return this.proxyObj;

        const api = {
            get: (key: string) => this.map.get(key),
            set: (key: string, value: any) => {
                this.setValue(key, value);
                return api;
            },
            delete: (key: string) => {
                this.deleteKey(key);
                return api;
            },
            clear: () => {
                this.clearAll();
                return api;
            },
            has: (key: string) => this.map.has(key),
            keys: () => this.map.keys(),
            values: () => this.map.values(),
            entries: () => this.map.entries(),
            forEach: (cb: (v: any, k: string, m: any) => void, thisArg?: any) => this.map.forEach(cb, thisArg),
            keysRef: () => new MapKeysAttribute(this),
            sizeRef: () => new MapSizeAttribute(this)
        } as const;

        Object.defineProperty(api, 'size', {
            get: () => this.map.size
        });

        this.proxyObj = new Proxy(api as any, {
            get: (_t, p) => (api as any)[p as any]
        });
        return this.proxyObj;
    }

    // ---------- Attribute API ----------

    get(): any {
        this.collect();
        return this.ensureProxy();
    }

    set(v: any): void {
        if (v instanceof Map) {
            this.map.clear();
            for (const [k, val] of v.entries()) this.map.set(k, this.wrap(k, val));
            this.emit();
            return;
        }
        if (v && typeof v === 'object') {
            this.map.clear();
            for (const k of Object.keys(v)) this.map.set(k, this.wrap(k, v[k]));
            this.emit();
            return;
        }
        throw new Error(`'${this.key()}' must be Map or Object`);
    }

    isWritable(): boolean {
        return true;
    }
}

/**
 * MapKeysAttribute is a class that extends the AbstractAttribute class,
 * representing an attribute that provides the keys of a MapAttribute instance.
 * It observes the parent MapAttribute for changes and emits updates when the keys change.
 *
 * The key of this attribute is derived from the parent's key with a ":keys" suffix.
 *
 * It provides functionality to retrieve the current keys of the parent map and
 * ensures proper cleanup of resources when disposed.
 *
 * The lifecycle of this class is tied to that of the parent MapAttribute and must
 * be properly disposed of to avoid potential memory leaks.
 *
 * Methods:
 * - get(): Retrieves the current list of keys from the parent MapAttribute.
 * - dispose(): Cleans up resources associated with the attribute, including unsubscribing
 *              from the parent MapAttribute updates.
 *
 * Dependencies:
 * - AbstractAttribute: The base class that this attribute extends.
 * - MapAttribute: The parent map attribute from which this class retrieves keys.
 */
class MapKeysAttribute extends AbstractAttribute<string[]> {

    private off?: Unsub;

    constructor(private parent: MapAttribute) {
        super(`${parent.key()}:keys`, (parent as any).runtime);
        this.off = parent.subscribe(() => this.emit(), {immediate: false});
    }

    get(): string[] {
        this.collect();
        return Array.from((this.parent as any).map.keys());
    }

    dispose(): void {
        super.dispose();
        this.off?.();
        this.off = undefined;
    }
}

/**
 * Represents an attribute that keeps track of the size of a map
 * in a `MapAttribute` instance. This class extends `AbstractAttribute`
 * with a type parameter of `number`.
 *
 * It subscribes to changes in the parent `MapAttribute` and updates
 * its value whenever the parent map is modified.
 *
 * @template T - The type of the `MapAttribute` object to which this size attribute is linked.
 * @extends AbstractAttribute<number>
 */
class MapSizeAttribute extends AbstractAttribute<number> {
    private off?: Unsub;

    constructor(private parent: MapAttribute) {
        super(`${parent.key()}:size`, (parent as any).runtime);
        this.off = parent.subscribe(() => this.emit(), {immediate: false});
    }

    get(): number {
        this.collect();
        return (this.parent as any).map.size;
    }

    dispose(): void {
        super.dispose();
        this.off?.();
        this.off = undefined;
    }
}
