import type { Layout, LayoutConfig } from "./Layout";

type Ctor = new (opts?: any) => Layout;

export class LayoutRegistry {
    private static _map = new Map<string, Ctor>();

    static register(type: string, ctor: Ctor) {
        this._map.set(type, ctor);
    }

    static create(cfg: LayoutConfig | Layout | undefined): Layout | undefined {
        if (!cfg) return undefined;
        if (typeof (cfg as any).apply === "function") return cfg as Layout;
        const { type, ...opts } = cfg as LayoutConfig;
        const C = this._map.get(type);
        if (!C) throw new Error(`Unknown layout type: ${type}`);
        return new C(opts);
    }
}