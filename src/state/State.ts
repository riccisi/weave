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
import Ajv, {type Ajv as AjvInstance, type ErrorObject, type Options as AjvOptions, type ValidateFunction} from 'ajv';

const BRACED = /^\{\s*(.+?)\s*\}$/;
const DEFAULT_AJV_OPTIONS: AjvOptions = {
    allErrors: true,
    useDefaults: true,
    removeAdditional: false,
};
const GLOBAL_AJV = new Ajv(DEFAULT_AJV_OPTIONS);

const buildAjv = (extra?: AjvOptions): AjvInstance => {
    if (!extra) return GLOBAL_AJV;
    return new Ajv({ ...DEFAULT_AJV_OPTIONS, ...extra });
};

export interface StateOptions<TSchema extends Record<string, any> = Record<string, any>> {
    schema?: Record<string, any>;
    ajv?: AjvInstance;
    ajvOptions?: AjvOptions;
    validateOnWrite?: boolean;
    parent?: State<any>;
    runtime?: ReactiveRuntime;
    validators?: Record<string, (value: any, state: State<any>) => string | void>;
}

export interface ValidationChangeEvent {
    target: State<any>;
    valid: boolean;
    errors: SchemaErrorEntry[];
}

export interface SchemaErrorEntry {
    context: string;
    path: string;
    key?: string;
    errors: ErrorObject[];
}

export interface StateSchemaHandle {
    normalize(value: any, contextLabel: string, opts?: { emitErrors?: boolean, inPlace?: boolean }): any;
    child(key: string): StateSchemaHandle | undefined;
    items(): StateSchemaHandle | undefined;
    stateOptions(): StateOptions<any>;
    validator(): ValidateFunction;
}

type CustomValidator = (value: any, state: State<any>) => string | void;

class SchemaHandle implements StateSchemaHandle {
    private readonly ajv: AjvInstance;
    private readonly validateFn: ValidateFunction;
    private readonly children = new Map<string, SchemaHandle>();
    private readonly arrayItems?: SchemaHandle;
    private readonly validateWrites: boolean;

    constructor(
        private readonly schema: Record<string, any>,
        opts: StateOptions,
        sharedAjv?: AjvInstance,
        private onError?: (context: string, errors?: ErrorObject[] | null) => void
    ) {
        this.validateWrites = !!opts.validateOnWrite;
        this.ajv = sharedAjv
            ?? opts.ajv
            ?? (opts.ajvOptions ? buildAjv(opts.ajvOptions) : GLOBAL_AJV);
        this.validateFn = this.ajv.compile(schema ?? {});

        const props = schema?.properties;
        if (props && typeof props === 'object') {
            for (const [key, childSchema] of Object.entries(props)) {
                if (childSchema && typeof childSchema === 'object') {
                    this.children.set(key, new SchemaHandle(childSchema as Record<string, any>, opts, this.ajv, this.onError));
                }
            }
        }

        const itemsSchema = this.resolveItemsSchema(schema);
        if (itemsSchema) {
            this.arrayItems = new SchemaHandle(itemsSchema, opts, this.ajv, this.onError);
        }
    }

    normalize(value: any, contextLabel: string, opts?: { emitErrors?: boolean, inPlace?: boolean }): any {
        const emit = opts?.emitErrors !== false;
        const payload = opts?.inPlace ? prepareInPlaceValue(value) : cloneForSchema(value);
        const ok = this.validateFn(payload);
        if (!ok) {
            if (emit) this.dispatchErrors(contextLabel, this.validateFn.errors ?? []);
            return value;
        }
        if (emit) this.dispatchErrors(contextLabel, null);
        return payload;
    }

    child(key: string): StateSchemaHandle | undefined {
        return this.children.get(key);
    }

    items(): StateSchemaHandle | undefined {
        return this.arrayItems;
    }

    stateOptions(): StateOptions<any> {
        return {
            schema: this.schema,
            ajv: this.ajv,
            validateOnWrite: this.validateWrites
        };
    }

    validator(): ValidateFunction {
        return this.validateFn;
    }

    private resolveItemsSchema(schema: Record<string, any>): Record<string, any> | undefined {
        if (!schema) return undefined;
        const items = schema.items;
        if (!items) return undefined;
        if (Array.isArray(items)) {
            return typeof items[0] === 'object' ? items[0] as Record<string, any> : undefined;
        }
        return typeof items === 'object' ? items as Record<string, any> : undefined;
    }

    private dispatchErrors(contextLabel: string, errors: ErrorObject[] | null): void {
        if (!this.onError) return;
        if (!errors || errors.length === 0) {
            this.onError(contextLabel, null);
            return;
        }
        const grouped = this.groupErrorsByPath(contextLabel, errors);
        if (!grouped.size) {
            this.onError(contextLabel, errors);
            return;
        }
        for (const [ctx, list] of grouped) {
            this.onError(ctx, list);
        }
    }

    private groupErrorsByPath(baseContext: string, errors: ErrorObject[]): Map<string, ErrorObject[]> {
        const grouped = new Map<string, ErrorObject[]>();
        for (const err of errors) {
            const rel = this.relativePathForError(err);
            const ctx = this.joinContext(baseContext, rel);
            const bucket = grouped.get(ctx) ?? [];
            bucket.push(err);
            grouped.set(ctx, bucket);
        }
        return grouped;
    }

    private joinContext(base: string, relative: string): string {
        if (!relative) return base;
        if (relative.startsWith('[')) return `${base}${relative}`;
        if (base === 'State') return `State.${relative}`;
        return `${base}.${relative}`;
    }

    private relativePathForError(err: ErrorObject): string {
        const pointer = (err as any).instancePath ?? err.dataPath ?? '';
        let rel = this.pointerToPath(pointer);
        if (err.keyword === 'required' && typeof (err.params as any)?.missingProperty === 'string') {
            const missing = (err.params as any).missingProperty;
            rel = rel ? `${rel}.${missing}` : missing;
        }
        if (err.keyword === 'additionalProperties' && typeof (err.params as any)?.additionalProperty === 'string') {
            const extra = (err.params as any).additionalProperty;
            rel = rel ? `${rel}.${extra}` : extra;
        }
        return rel;
    }

    private pointerToPath(pointer: string): string {
        if (!pointer) return '';
        const segments = pointer.split('/').filter(Boolean).map(seg => seg.replace(/~1/g, '/').replace(/~0/g, '~'));
        let path = '';
        for (const seg of segments) {
            if (/^\d+$/.test(seg)) path += `[${seg}]`;
            else path += path ? `.${seg}` : seg;
        }
        return path;
    }
}

class StateSchemaError extends Error {
    constructor(context: string, errors?: ErrorObject[] | null) {
        super(StateSchemaError.buildMessage(context, errors));
    }

    private static buildMessage(context: string, errors?: ErrorObject[] | null): string {
        if (!errors?.length) return `${context} failed schema validation.`;
        const first = errors[0];
        const path = first.dataPath || '/';
        const detail = first.message ?? first.keyword;
        return `${context} failed schema validation at '${path}': ${detail}`;
    }
}

function cloneForSchema(value: any): any {
    if (Array.isArray(value)) return value.map(cloneForSchema);
    if (value && typeof value === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
            if (typeof v === 'function') continue;
            out[k] = cloneForSchema(v);
        }
        return out;
    }
    return value;
}

function cloneNormalizedValue(value: any): any {
    if (Array.isArray(value)) return value.map(cloneNormalizedValue);
    if (value && typeof value === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) out[k] = cloneNormalizedValue(v);
        return out;
    }
    return value;
}

function prepareInPlaceValue(value: any): any {
    if (!value) return value;
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') return value;
    return value;
}

/**
 * Represents a reactive state management system. This class allows for defining,
 * subscribing to, and working with reactive attributes and derived values, organized
 * in a hierarchical parent-child structure.
 */
export class State<TSchema extends Record<string, any> = Record<string, any>> {

    [key: string]: any;

    readonly _runtime: ReactiveRuntime;
    private parent?: State<any>;
    private attrs = new Map<string, Attribute<any>>();
    private declared = new Set<string>();
    private proxy!: State<TSchema>;
    private schemaHandle?: SchemaHandle;
    private _validationListeners = new Set<(evt: ValidationChangeEvent) => void>();
    private _customValidators = new Map<string, CustomValidator[]>();
    private _children: Set<State<any>> = new Set();
    private _schemaErrors = new Map<string, SchemaErrorEntry>();

    constructor(initial: TSchema = {} as TSchema, options: StateOptions<TSchema> = {}) {
        this.parent = options.parent;
        if (this.parent) {
            (this.parent as State<any>)._children.add(this);
        }
        const inheritedRuntime = this.parent ? (this.parent as any)._runtime : undefined;
        const runtime = options.runtime ?? inheritedRuntime ?? new ReactiveRuntime();
        this._runtime = runtime;

        if (options.validators) this.registerValidators(options.validators);

        if (options.schema) {
            this.schemaHandle = new SchemaHandle(options.schema, options, undefined, (ctx, errors) => this.emitValidationChange(ctx, errors));
            const payload = this.extractSchemaPayload(initial as Record<string, any>);
            const normalized = this.schemaHandle.normalize(payload, 'State');
            initial = this.applySchemaDefaults(initial as Record<string, any>, normalized) as TSchema;
        }

        this.recordSchema(initial as Record<string, any>);
        this.proxy = this.createProxy();

        const {aliasExprs, deriveds} = this.buildConcrete(initial as Record<string, any>);
        this.resolveAliases(aliasExprs);
        this.createDerived(deriveds);
        this.applyInitialValidators(initial as Record<string, any>);

        return this.proxy as State<TSchema> & TSchema & Record<string, any>;
    }

    // ---------- Lifecycle (3-pass build) ----------

    /** Registra lo schema: le chiavi dichiarate a questo livello. */
    private recordSchema(initial: Record<string, any>) {
        for (const k of Object.keys(initial)) this.declared.add(k);
    }

    /** Crea il Proxy pubblico (necessario prima di costruire le derivate). */
    private createProxy(): State<TSchema> {
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
    private buildConcrete(initial: Record<string, any>) {
        const aliasExprs: Array<{ key: string; expr: string; schema?: StateSchemaHandle }> = [];
        const deriveds: Array<[string, (s: State) => any]> = [];

        for (const [k, v] of Object.entries(initial)) {
            const childSchema = this.schemaHandle?.child(k);
            if (typeof v === 'function') {
                deriveds.push([k, v as any]);
                continue;
            }
            if (typeof v === 'string' && BRACED.test(v)) {
                aliasExprs.push({key: k, expr: v, schema: childSchema});
                continue;
            }
            this.attrs.set(k, this.createAttributeFor(k, v, childSchema));
        }
        return {aliasExprs, deriveds};
    }

    /** Passo 2: risolve alias via StateConfig (global). */
    private resolveAliases(aliasExprs: Array<{ key: string; expr: string; schema?: StateSchemaHandle }>) {
        for (const {key, expr: raw, schema} of aliasExprs) {
            const expr = raw.match(BRACED)![1];
            const binding = this.resolveAlias(expr);
            const resolver = () => {
                // Evita ricorsioni: alias verso se stesso devono “saltare” il livello corrente.
                if (binding.path === key) {
                    const ancestor = this.__resolveTop(binding.path, { skipSelf: true });
                    if (!ancestor) {
                        throw new Error(`Alias '${key}' cannot resolve path '${binding.path}' (self-referential)`);
                    }
                    return ancestor;
                }
                return this.attribute(binding.path);
            };
            const normalize = schema
                ? (value: any) => schema.normalize(value, `State.${key}`, {emitErrors: false, inPlace: true})
                : undefined;
            this.attrs.set(key, new AliasAttribute(key, this._runtime, resolver, binding.mapper as any, normalize));
        }
    }

    /** Passo 3: crea attributi derivati. */
    private createDerived(deriveds: Array<[string, (s: State<any>) => any]>) {
        for (const [k, fn] of deriveds) {
            this.attrs.set(k, new DerivedAttribute(k, this._runtime, () => this.public(), fn));
        }
    }

    // ---------- Public API ----------

    /** Subscribe a una chiave o path. */
    on<T = any>(key: string, fn: (v: T) => void, opts?: {
        immediate?: boolean,
        buffer?: number,
        delay?: number
    }): Unsub {
        const needsPath = key.includes('.') || key.includes('[');
        const attr = needsPath ? this.attribute(key) : this.attrForRead<T>(key);
        return attr.subscribe(fn, opts);
    }

    /** Proxy pubblico di questo State. */
    public(): State<TSchema> & TSchema & Record<string, any> {
        return this.proxy as State<TSchema> & TSchema & Record<string, any>;
    }

    /** Subscribe to schema validation changes (fired only when the error set toggles). */
    public onValidationChange(fn: (evt: ValidationChangeEvent) => void): () => void {
        this._validationListeners.add(fn);
        return () => {
            this._validationListeners.delete(fn);
        };
    }

    public schemaErrors(path?: string): ErrorObject[] | boolean | undefined {
        if (!path) return this._schemaErrors.size ? [] : undefined;
        const entry = this._schemaErrors.get(path);
        return entry ? entry.errors : undefined;
    }

    public allSchemaErrors(): SchemaErrorEntry[] {
        if (!this._schemaErrors.size) return [];
        const entries: SchemaErrorEntry[] = [];
        for (const entry of this._schemaErrors.values()) {
            if (!entry.errors?.length) continue;
            entries.push({
                context: entry.context,
                path: entry.path,
                key: entry.key,
                errors: [...entry.errors]
            });
        }
        return entries;
    }

    /**
     * Tracks dependencies accessed during the execution of the given computation function.
     *
     * @param {function(): T} compute - A function that computes a value and whose dependencies will be tracked.
     * @return {{ value: T, deps: Set<string> }} An object containing the computed value and a set of accessed dependencies.
     */
    public track<T>(compute: () => T): { value: T; deps: Set<string> } {
        const deps = new Set<string>();
        const origRead = this.read.bind(this);
        (this as any).read = (k: string) => {
            deps.add(k);
            return origRead(k);
        };
        try {
            const value = compute();
            return {value, deps};
        } finally {
            (this as any).read = origRead;
        }
    }

    // ---------- Read/Write ----------

    private read<T = any>(key: string): T {
        return this.attrForRead<T>(key).get();
    }

    private write<T = any>(key: string, v: T): void {
        if (this.declared.has(key)) {
            this.setLocalAttr(key, v);
            return;
        }
        let cur: State | undefined = this.parent;
        while (cur) {
            if ((cur as any).declared?.has(key)) {
                (cur as State<any>).__acceptChildWrite(key, v);
                return;
            }
            cur = (cur as any).parent;
        }
        throw new Error(`Cannot set unknown property '${key}' (no schema in chain)`);
    }

    private setLocalAttr<T = any>(key: string, value: T): void {
        const local = this.attrs.get(key);
        if (!local) throw new Error(`Invariant: declared key '${key}' has no attribute`);
        const next = this.normalizeForSchema(key, value);
        this.applyCustomValidators(key, next);
        local.set(next as any);
    }

    public __acceptChildWrite(key: string, value: any): void {
        this.setLocalAttr(key, value);
    }

    // ---------- Attribute resolution ----------

    /** Risolve una chiave di primo livello risalendo la catena dei parent. */
    __resolveTop(key: string, opts?: { skipSelf?: boolean }): Attribute<any> | null {
        if (!opts?.skipSelf && this.attrs.has(key)) return this.attrs.get(key)!;
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
    private createAttributeFor(key: string, v: any, childSchema?: StateSchemaHandle): Attribute<any> {
        const effectiveSchema = childSchema ?? this.schemaHandle?.child(key);
        let attr: Attribute<any>;
        if (Array.isArray(v)) {
            attr = new ListAttribute(key, this._runtime, v, effectiveSchema?.items());
        } else if (v instanceof Map) {
            attr = new MapAttribute(key, this._runtime, v);
        } else if (v && typeof v === 'object') {
            attr = new NestedAttribute(key, this._runtime, v, this as State, effectiveSchema);
        } else {
            attr = new MutableAttribute(key, this._runtime, v);
        }
        return this.attachOwnerMetadata(attr, key);
    }

    private attachOwnerMetadata(attr: Attribute<any>, key: string): Attribute<any> {
        Object.defineProperty(attr, '__ownerState', {
            value: this,
            configurable: true,
            enumerable: false,
            writable: false
        });
        Object.defineProperty(attr, '__ownerKey', {
            value: key,
            configurable: true,
            enumerable: false,
            writable: false
        });
        return attr;
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

    private normalizeForSchema<T = any>(key: string, value: T): T {
        if (!this.schemaHandle) return value;
        const child = this.schemaHandle.child(key);
        if (!child) return value;
        if (typeof value === 'function' || this.isAliasToken(value)) return value;
        if (value && typeof value === 'object') return value;
        return child.normalize(value, `${this.constructor.name}.${key}`);
    }

    private extractSchemaPayload(initial: Record<string, any>): Record<string, any> {
        const payload: Record<string, any> = {};
        for (const [key, value] of Object.entries(initial)) {
            if (typeof value === 'function' || this.isAliasToken(value)) continue;
            const sanitized = this.sanitizeValueForSchema(value);
            if (sanitized !== undefined) payload[key] = sanitized;
        }
        return payload;
    }

    private sanitizeValueForSchema(value: any): any {
        if (value == null) return value;
        if (typeof value === 'function' || this.isAliasToken(value)) return undefined;
        if (Array.isArray(value)) {
            return value
                .map(entry => this.sanitizeValueForSchema(entry))
                .filter(entry => entry !== undefined);
        }
        if (value && typeof value === 'object') {
            const out: Record<string, any> = {};
            for (const [k, v] of Object.entries(value)) {
                if (typeof v === 'function' || this.isAliasToken(v)) continue;
                const sanitized = this.sanitizeValueForSchema(v);
                if (sanitized !== undefined) out[k] = sanitized;
            }
            return out;
        }
        return value;
    }

    private applySchemaDefaults(initial: Record<string, any>, normalized: any): Record<string, any> {
        if (!normalized || typeof normalized !== 'object') return initial;
        const result: Record<string, any> = {...initial};
        for (const [key, value] of Object.entries(normalized)) {
            result[key] = this.mergeDefaultValue(result[key], value);
        }
        return result;
    }

    private mergeDefaultValue(existing: any, normalized: any): any {
        if (existing === undefined) return cloneNormalizedValue(normalized);
        if (typeof existing === 'function' || this.isAliasToken(existing)) return existing;
        if (Array.isArray(normalized)) return Array.isArray(existing) ? existing : cloneNormalizedValue(normalized);
        if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
            if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
                const merged: Record<string, any> = {...existing};
                for (const [childKey, childValue] of Object.entries(normalized)) {
                    merged[childKey] = this.mergeDefaultValue(existing[childKey], childValue);
                }
                return merged;
            }
            return existing;
        }
        return existing;
    }

    private isAliasToken(value: any): boolean {
        return typeof value === 'string' && BRACED.test(value);
    }

    private emitValidationChange(context: string, errors?: ErrorObject[] | null): void {
        const path = context.replace(/^State\./, '');
        const changed = this.updateValidationEntry(context, path, errors);
        if (!changed) return;
        this.dispatchValidationEvent();
        for (const child of this._children) {
            child.emitValidationChange(context, errors);
        }
    }

    private dispatchValidationEvent(): void {
        if (!this._validationListeners.size) return;
        const snapshot = this.allSchemaErrors();
        const evt: ValidationChangeEvent = {
            target: this,
            valid: snapshot.length === 0,
            errors: snapshot
        };
        for (const listener of this._validationListeners) {
            try {
                listener(evt);
            } catch {
                /* swallow */
            }
        }
    }

    private updateValidationEntry(context: string, path: string, errors?: ErrorObject[] | null): boolean {
        if (!errors || errors.length === 0) {
            if (!this._schemaErrors.has(path)) return false;
            this._schemaErrors.delete(path);
            return true;
        }
        const prev = this._schemaErrors.get(path);
        if (prev && this.sameErrorSet(prev.errors, errors)) return false;
        this._schemaErrors.set(path, {
            context,
            path,
            key: context.split('.').pop(),
            errors: [...errors]
        });
        return true;
    }

    private sameErrorSet(a: ErrorObject[], b: ErrorObject[]): boolean {
        if (a === b) return true;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!this.sameError(a[i], b[i])) return false;
        }
        return true;
    }

    private sameError(a: ErrorObject, b: ErrorObject): boolean {
        if (a.keyword !== b.keyword) return false;
        if (this.errorPath(a) !== this.errorPath(b)) return false;
        if ((a.message ?? '') !== (b.message ?? '')) return false;
        return JSON.stringify(a.params ?? {}) === JSON.stringify(b.params ?? {});
    }

    private errorPath(err: ErrorObject): string {
        return (err as any).instancePath ?? err.dataPath ?? '';
    }

    private registerValidators(map?: Record<string, CustomValidator>): void {
        if (!map) return;
        for (const [key, fn] of Object.entries(map)) {
            if (typeof fn !== 'function') continue;
            const list = this._customValidators.get(key) ?? [];
            list.push(fn);
            this._customValidators.set(key, list);
        }
    }

    private applyInitialValidators(initial: Record<string, any>): void {
        for (const key of Object.keys(initial)) {
            const val = (initial as any)[key];
            this.applyCustomValidators(key, val);
        }
    }

    private applyCustomValidators(key: string, value: any): void {
        if (typeof value === 'function') return;
        if (this.isAliasToken(value)) return;
        const validators = this._customValidators.get(key);
        if (!validators?.length) return;
        const errors: ErrorObject[] = [];
        for (const fn of validators) {
            const message = fn(value, this);
            if (typeof message === 'string') {
                errors.push({
                    keyword: 'custom',
                    dataPath: key,
                    schemaPath: '',
                    params: {},
                    message
                });
            }
        }
        this.emitValidationChange(`State.${key}`, errors.length ? errors : null);
    }

    public dispose(): void {
        if (this.parent) {
            (this.parent as State<any>)._children.delete(this);
        }
        this._validationListeners.clear();
    }
}
