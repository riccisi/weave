// src/ui/decorators/Decorator.ts
import type { State } from '../../state/State';
import type { Component } from '../Component';

export type DecoratorCtx<DState = any, DProps = undefined> = {
    cmp: Component<any, any>;
    state: State;
    deco: DState;
    ns: string;
    props: DProps extends undefined ? undefined : DProps;
};

export interface ComponentDecorator<DState = any, DProps = undefined> {
    readonly ns: string;
    readonly priority: number;
    defaults(): Partial<DState>;
    props(): DProps extends undefined ? undefined : DProps;

    wrap(hole: any, ctx: DecoratorCtx<DState, DProps>): any;
    beforeMount?(ctx: DecoratorCtx<DState, DProps>): void;
    afterMount?(ctx: DecoratorCtx<DState, DProps>): void;
    dispose?(ctx: DecoratorCtx<DState, DProps>): void;
    update?(ctx: DecoratorCtx<DState, DProps>): void;
}

export interface DecoratorOptions<DState = any, DProps = undefined> {
    ns?: string;
    priority?: number;
    state?: Partial<DState>;
    props?: DProps;
}

type DecoratorInit<DState = any, DProps = undefined> =
    | DecoratorOptions<DState, DProps>
    | (Partial<DState> & { ns?: string; priority?: number });

type NormalizedDecoratorOptions<DState, DProps> = {
    ns: string;
    priority: number;
    state: Partial<DState>;
    props: DProps | undefined;
};

function normalizeDecoratorOptions<DState, DProps>(
    cfg: DecoratorInit<DState, DProps> = {}
): NormalizedDecoratorOptions<DState, DProps> {
    if ('state' in cfg || 'props' in cfg) {
        const opts = cfg as DecoratorOptions<DState, DProps>;
        return {
            ns: opts.ns ?? 'decorator',
            priority: opts.priority ?? 0,
            state: opts.state ?? {},
            props: opts.props as DProps,
        };
    }
    const legacy = cfg as Partial<DState> & { ns?: string; priority?: number };
    const { ns, priority } = legacy;
    const state = { ...legacy } as Partial<DState> & { ns?: string; priority?: number };
    delete (state as any).ns;
    delete (state as any).priority;
    return {
        ns: ns ?? 'decorator',
        priority: priority ?? 0,
        state,
        props: undefined as DProps,
    };
}

export abstract class DecoratorBase<DState = any, DProps = undefined> implements ComponentDecorator<DState, DProps> {
    public readonly ns: string;
    public readonly priority: number;
    private readonly stateDefaults: Partial<DState>;
    private readonly _props: DProps | undefined;

    constructor(config: DecoratorInit<DState, DProps> = {}) {
        const normalized = normalizeDecoratorOptions(config);
        this.ns = normalized.ns;
        this.priority = normalized.priority;
        this.stateDefaults = normalized.state ?? {};
        this._props = normalized.props as DProps;
    }

    defaults(): Partial<DState> { return { ...this.stateDefaults }; }
    props(): DProps extends undefined ? undefined : DProps {
        return this._props as any;
    }
    beforeMount(_ctx: DecoratorCtx<DState, DProps>): void {/* no-op */}
    afterMount(_ctx: DecoratorCtx<DState, DProps>): void {/* no-op */}
    dispose(_ctx: DecoratorCtx<DState, DProps>): void {/* no-op */}
    update(_ctx: DecoratorCtx<DState, DProps>): void {/* no-op */}
    abstract wrap(hole: any, ctx: DecoratorCtx<DState, DProps>): any;
}
