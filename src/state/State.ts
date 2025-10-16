import {ReactiveRuntime} from './ReactiveRuntime';
import type {Attribute, Unsub} from './Attribute';
import {MutableAttribute} from './MutableAttribute';
import {DerivedAttribute} from './DerivedAttribute';
import {AliasAttribute} from './AliasAttribute';
import {NestedAttribute} from './NestedAttribute';
import {ListAttribute} from './ListAttribute';
import {MapAttribute} from './MapAttribute';
import {PathAttribute} from './PathAttribute';
import {StateConfig} from './StateConfig';

const BRACED = /^\{\s*(.+?)\s*\}$/;

/**
 * Represents a reactive state management system. This class allows for defining,
 * subscribing to, and working with reactive attributes and derived values, organized
 * in a hierarchical parent-child structure.
 */
export class State {

    readonly _runtime: ReactiveRuntime;
    private attrs = new Map<string, Attribute<any>>();
    private declared = new Set<string>();
    private proxy!: State;

    constructor(initial: Record<string, any> = {}, private parent?: State, runtime?: ReactiveRuntime) {
        this._runtime = runtime ?? (parent ? (parent as any)._runtime : new ReactiveRuntime());

        this.recordSchema(initial);
        this.proxy = this.createProxy();

        const {aliasExprs, deriveds} = this.pass1_buildConcrete(initial);
        this.pass2_resolveAliases(aliasExprs);
        this.pass3_createDerived(deriveds);

        return this.proxy;
    }

    // ---------- Lifecycle (3-pass build) ----------

    /** Registra lo schema: le chiavi dichiarate a questo livello. */
    private recordSchema(initial: Record<string, any>) {
        for (const k of Object.keys(initial)) this.declared.add(k);
    }

    /** Crea il Proxy pubblico (necessario prima di costruire le derivate). */
    private createProxy(): State {
        return new Proxy(this as any, {
            get: (t, prop, r) => {
                if (typeof prop !== 'string') return Reflect.get(t, prop, r);
                if (prop in t) {
                    const val = (t as any)[prop];
                    return typeof val === 'function' ? val.bind(t) : val;
                }
                return this.read(prop);
            },
            set: (_t, prop, value) => {
                if (typeof prop !== 'string') return false;
                this.write(prop, value);
                return true;
            }
        }) as any;
    }

    /** Passo 1: crea attributi concreti; colleziona alias e derivate. */
    private pass1_buildConcrete(initial: Record<string, any>) {
        const aliasExprs: Array<[string, string]> = [];
        const deriveds: Array<[string, (s: State) => any]> = [];

        for (const [k, v] of Object.entries(initial)) {
            if (typeof v === 'function') {
                deriveds.push([k, v as any]);
                continue;
            }
            if (typeof v === 'string' && BRACED.test(v)) {
                aliasExprs.push([k, v]);
                continue;
            }
            this.attrs.set(k, this.createAttributeFor(k, v));
        }
        return {aliasExprs, deriveds};
    }

    /** Passo 2: risolve alias via StateConfig (global). */
    private pass2_resolveAliases(aliasExprs: Array<[string, string]>) {
        for (const [k, raw] of aliasExprs) {
            const expr = raw.match(BRACED)![1];
            const binding = this.resolveAlias(expr);
            this.attrs.set(k, new AliasAttribute(k, this._runtime, () => this.attribute(binding.path), binding.mapper as any));
        }
    }

    /** Passo 3: crea attributi derivati. */
    private pass3_createDerived(deriveds: Array<[string, (s: State) => any]>) {
        for (const [k, fn] of deriveds) {
            this.attrs.set(k, new DerivedAttribute(k, this._runtime, () => this.public(), fn));
        }
    }

    // ---------- Public API ----------

    /** Subscribe a una chiave o path. */
    on<T = any>(key: string, fn: (v: T) => void, opts?: { immediate?: boolean }): Unsub {
        const needsPath = key.includes('.') || key.includes('[');
        const attr = needsPath ? this.attribute(key) : this.attrForRead<T>(key);
        return attr.subscribe(fn, opts);
    }

    /** Proxy pubblico di questo State. */
    public(): State {
        return this.proxy;
    }

    // ---------- Read/Write ----------

    private read<T = any>(key: string): T {
        return this.attrForRead<T>(key).get();
    }

    private write<T = any>(key: string, v: T): void {
        if (this.declared.has(key)) {
            const local = this.attrs.get(key);
            if (!local) throw new Error(`Invariant: declared key '${key}' has no attribute`);
            local.set(v as any);
            return;
        }
        let cur: State | undefined = this.parent;
        while (cur) {
            if ((cur as any).declared?.has(key)) {
                const a: Attribute<any> | undefined = (cur as any).attrs.get(key);
                if (!a) throw new Error(`Invariant: ancestor declares '${key}' but has no attribute`);
                a.set(v as any);
                return;
            }
            cur = (cur as any).parent;
        }
        throw new Error(`Cannot set unknown property '${key}' (no schema in chain)`);
    }

    // ---------- Attribute resolution ----------

    /** Risolve una chiave di primo livello risalendo la catena dei parent. */
    __resolveTop(key: string): Attribute<any> | null {
        if (this.attrs.has(key)) return this.attrs.get(key)!;
        let cur = this.parent;
        while (cur) {
            if ((cur as any).attrs.has(key)) return (cur as any).attrs.get(key)!;
            cur = (cur as any).parent;
        }
        return null;
    }

    /** Risolve un path (dot/bracket) o una chiave semplice. */
    attribute(path: string): Attribute<any> {
        if (path.includes('.') || path.includes('[')) return new PathAttribute(this, path);
        const top = this.__resolveTop(path);
        if (!top) throw new Error(`'${path}' not found in schema chain`);
        return top;
    }

    /**
     * Per i read:
     * - se dichiarato localmente → attr locale
     * - altrimenti risale fino al primo ancestor che lo dichiara
     * - altrimenti errore (schema immutabile)
     */
    private attrForRead<T = any>(key: string): Attribute<T> {
        if (this.declared.has(key)) return this.attrs.get(key)! as Attribute<T>;
        let cur: State | undefined = this.parent;
        while (cur) {
            if ((cur as any).declared?.has(key)) return ((cur as any).attrs.get(key) as Attribute<T>);
            cur = (cur as any).parent;
        }
        throw new Error(`Unknown property '${key}' (no schema in chain)`);
    }

    /** Sceglie l'implementazione di Attribute in base al valore iniziale. */
    private createAttributeFor(key: string, v: any): Attribute<any> {
        if (Array.isArray(v)) return new ListAttribute(key, this._runtime, v);
        if (v instanceof Map) return new MapAttribute(key, this._runtime, v);
        if (v && typeof v === 'object') return new NestedAttribute(key, this._runtime, v);
        return new MutableAttribute(key, this._runtime, v);
    }

    /** Parsing alias via risolutori globali. */
    private resolveAlias(expr: string): { path: string, mapper?: any } {
        const resolvers = StateConfig.getAliasResolvers();
        for (const r of resolvers) {
            if (r.match(expr)) {
                return r.build({
                    resolvePath: (p: string) => this.attribute(p),
                    getMapper: (n: string, a: string[]) => StateConfig.getMapper(n, a)
                }, expr);
            }
        }
        return {path: expr.trim()};
    }
}