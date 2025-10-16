import type {Attribute} from './Attribute';
import type {State} from './State';
import {ListAttribute} from './ListAttribute';
import {MapAttribute} from './MapAttribute';
import {IndexAttribute} from './IndexAttribute';
import {MapKeyAttribute} from './MapKeyAttribute';
import {tokenize, type Token} from './PathTokenizer';

export type FinalKind = 'prop' | 'index' | 'mapKey';

export interface ResolvedPath {
    final: Attribute<any>;
    intermediates: Attribute<any>[];
    finalKind: FinalKind;
}

export interface PreflightHop {
    token: Token | { kind: 'top', name: string };
    holderType: 'state' | 'list' | 'map' | 'value';
    exists: boolean;
    message?: string;
}

export interface PreflightResult {
    ok: boolean;
    error?: string;
    finalKind?: FinalKind;
    hops: PreflightHop[];
}

/** Esito interno del walker unificato. */
interface WalkOutcome {
    ok: boolean;
    error?: string;
    final?: Attribute<any>;
    finalKind?: FinalKind;
    intermediates: Attribute<any>[];
    hops?: PreflightHop[];
}

/** Opzioni del walker. */
interface WalkOpts {
    /** Se true crea gli Attribute terminali (Index/MapKey), altrimenti non alloca nulla. */
    buildFinal: boolean;
    /** Se true colleziona hops per la diagnosi (usato da preflight). */
    collectHops: boolean;
    /** Se true lancia eccezioni su errore, altrimenti rientra con ok:false. */
    raise: boolean;
}

/**
 * PathResolver con walker unificato:
 * - resolve(...) → buildFinal=true, raise=true, collectHops=false
 * - preflight(...) → buildFinal=false, raise=false, collectHops=true
 */
export class PathResolver {

    static resolve(owner: State, path: string): ResolvedPath {
        const o = this.walk(owner, path, {buildFinal: true, collectHops: false, raise: true});
        // con raise=true, qui siamo sempre ok
        return {final: o.final!, intermediates: o.intermediates, finalKind: o.finalKind!};
    }

    static preflight(owner: State, path: string): PreflightResult {
        const o = this.walk(owner, path, {buildFinal: false, collectHops: true, raise: false});
        return {ok: o.ok, error: o.error, finalKind: o.finalKind, hops: o.hops ?? []};
    }

    // ---------- Walker DRY ----------

    private static walk(owner: State, path: string, opts: WalkOpts): WalkOutcome {
        const hops: PreflightHop[] | undefined = opts.collectHops ? [] : undefined;
        const intermediates: Attribute<any>[] = [];

        const fail = (msg: string): WalkOutcome => {
            if (opts.raise) throw new Error(msg);
            return {ok: false, error: msg, intermediates, hops};
        };

        const {top, rest} = tokenize(path);
        let ctx: any = owner;

        // top-level
        const topAttr = (ctx as any).__resolveTop(top);
        if (opts.collectHops) {
            hops!.push({
                token: {kind: 'top', name: top},
                holderType: topAttr ? 'state' : 'value',
                exists: !!topAttr,
                message: topAttr ? undefined : `'${top}' not found`
            });
        }
        if (!topAttr) return fail(`'${top}' not found`);

        let attr: Attribute<any> = topAttr;
        intermediates.push(attr);

        for (let t = 0; t < rest.length; t++) {
            const token = rest[t] as Token;
            const currentVal = attr.get();

            // ----- INDEX -----
            if (token.kind === 'index') {
                const isList = attr instanceof ListAttribute;
                if (opts.collectHops) {
                    hops!.push({
                        token, holderType: isList ? 'list' : typeof currentVal as any,
                        exists: isList, message: isList ? undefined : `Index on non-list`
                    });
                }
                if (!isList) return fail(`'${path}': index on non-list`);

                const idx = token.index;
                const isTerminal = (t === rest.length - 1);
                if (isTerminal) {
                    const finalKind: FinalKind = 'index';
                    if (opts.buildFinal) {
                        const idxAttr = new IndexAttribute(attr as ListAttribute<any>, idx);
                        intermediates.push(idxAttr as any);
                        return {
                            ok: true,
                            final: idxAttr as any,
                            finalKind,
                            intermediates: intermediates.slice(0, -1),
                            hops
                        };
                    } else {
                        return {ok: true, finalKind, intermediates, hops};
                    }
                }

                // non-terminal: bisogna entrare nell'elemento e poi consumare un .prop
                const elem = (currentVal as any[])[idx];
                const next = rest[++t] as Token | undefined;
                const navigable = !!(elem && typeof elem === 'object');
                if (opts.collectHops) {
                    hops!.push({
                        token: next && next.kind === 'prop' ? next : ({kind: 'prop', name: '(missing)'} as any),
                        holderType: 'state',
                        exists: navigable && !!next && next.kind === 'prop',
                        message: !navigable
                            ? `List element not navigable`
                            : (!next || next.kind !== 'prop')
                                ? `After [${idx}] a .prop is required`
                                : undefined
                    });
                }
                if (!navigable) return fail(`List element not navigable in '${path}'`);
                if (!next || next.kind !== 'prop') return fail(`After [${idx}] a .prop is required in '${path}'`);

                ctx = elem as State;
                const nextAttr = (ctx as any).__resolveTop(next.name);
                if (!nextAttr) {
                    if (opts.collectHops) {
                        hops![hops!.length - 1].exists = false;
                        hops![hops!.length - 1].message = `'${next.name}' not found in element schema`;
                    }
                    return fail(`'${next.name}' not found in element schema`);
                }
                attr = nextAttr;
                intermediates.push(attr);
                continue;
            }

            // ----- MAP KEY -----
            if (token.kind === 'mapKey') {
                const isMap = attr instanceof MapAttribute;
                if (opts.collectHops) {
                    hops!.push({
                        token, holderType: isMap ? 'map' : typeof currentVal as any,
                        exists: isMap, message: isMap ? undefined : `Key on non-map`
                    });
                }
                if (!isMap) return fail(`'${path}': key on non-map`);

                const isTerminal = (t === rest.length - 1);
                if (isTerminal) {
                    const finalKind: FinalKind = 'mapKey';
                    if (opts.buildFinal) {
                        const keyAttr = new MapKeyAttribute(attr as MapAttribute, token.key);
                        intermediates.push(keyAttr as any);
                        return {
                            ok: true,
                            final: keyAttr as any,
                            finalKind,
                            intermediates: intermediates.slice(0, -1),
                            hops
                        };
                    } else {
                        return {ok: true, finalKind, intermediates, hops};
                    }
                }

                const value = (attr as MapAttribute).getValue(token.key);
                const next = rest[++t] as Token | undefined;
                const navigable = !!(value && typeof value === 'object');
                if (opts.collectHops) {
                    hops!.push({
                        token: next && next.kind === 'prop' ? next : ({kind: 'prop', name: '(missing)'} as any),
                        holderType: 'state',
                        exists: navigable && !!next && next.kind === 'prop',
                        message: !navigable
                            ? `Map value not navigable`
                            : (!next || next.kind !== 'prop')
                                ? `After ["${token.key}"] a .prop is required`
                                : undefined
                    });
                }
                if (!navigable) return fail(`Map value not navigable in '${path}'`);
                if (!next || next.kind !== 'prop') return fail(`After ["${token.key}"] a .prop is required in '${path}'`);

                ctx = value as State;
                const nextAttr = (ctx as any).__resolveTop(next.name);
                if (!nextAttr) {
                    if (opts.collectHops) {
                        hops![hops!.length - 1].exists = false;
                        hops![hops!.length - 1].message = `'${next.name}' not found in value schema`;
                    }
                    return fail(`'${next.name}' not found in value schema`);
                }
                attr = nextAttr;
                intermediates.push(attr);
                continue;
            }

            // ----- PROP -----
            const val = currentVal;
            const navigable = !!(val && typeof val === 'object');
            if (opts.collectHops) {
                hops!.push({
                    token, holderType: 'state',
                    exists: navigable, message: navigable ? undefined : `Segment '${token.name}' not navigable`
                });
            }
            if (!navigable) return fail(`Segment '${token.name}' not navigable in '${path}'`);

            ctx = val as State;
            const nextAttr = (ctx as any).__resolveTop(token.name);
            if (!nextAttr) {
                if (opts.collectHops) {
                    hops![hops!.length - 1].exists = false;
                    hops![hops!.length - 1].message = `'${token.name}' not found in schema`;
                }
                return fail(`'${token.name}' not found in schema`);
            }
            attr = nextAttr;
            intermediates.push(attr);
        }

        // Nessun token terminale speciale: terminale è una prop
        const finalKind: FinalKind = 'prop';
        if (opts.buildFinal) {
            return {
                ok: true,
                final: intermediates[intermediates.length - 1],
                finalKind,
                intermediates: intermediates.slice(0, -1),
                hops
            };
        }
        return {ok: true, finalKind, intermediates, hops};
    }
}
