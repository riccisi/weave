import type { Component } from "./Component";

/** Config generica di un componente dichiarato via wtype. */
export type ComponentConfig = {
    wtype: string;
    items?: ComponentConfig[];
    [key: string]: any; // flat: state-keys + props
};

type Ctor<T extends Component = Component> = new (opts?: any) => T;

class _ComponentRegistry {

    private map = new Map<string, Ctor>();

    register(wtype: string, ctor: Ctor): this {
        this.map.set(wtype.toLowerCase(), ctor);
        return this;
    }

    /** Registra una classe leggendo la proprietà statica `wtype`. */
    registerClass(ctor: Ctor & { wtype?: string }): this {
        const wt = ctor.wtype;
        if (!wt || typeof wt !== "string") {
            throw new Error(`Component missing static wtype: ${ctor.name}`);
        }
        return this.register(wt, ctor);
    }

    get(wtype: string): Ctor | undefined {
        return this.map.get(wtype.toLowerCase());
    }

    /** Istanzia un componente da una config “matrioska” (flat). */
    create(cfg: ComponentConfig): Component {
        const ctor = this.get(cfg.wtype);
        if (!ctor) throw new Error(`wtype non registrato: ${cfg.wtype}`);

        const { wtype, items, ...flatOpts } = cfg;
        const opts: any = { ...flatOpts };
        if (items) {
            // gli item sono già ComponentConfig → la Container li istanzierà (o li passiamo già creati)
            // Preferiamo instanziarli qui per coerenza a “matrioska”:
            opts.items = items.map((c) => this.create(c));
        }
        return new ctor(opts);
    }
}

export const ComponentRegistry = new _ComponentRegistry();
