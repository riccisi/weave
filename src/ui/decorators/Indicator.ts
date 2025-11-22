// src/ui/decorators/IndicatorDecorator.ts
import { DecoratorBase, type DecoratorCtx } from './Decorator';
import { Component, type Bindable } from '../Component';

export type IndicatorPos =
    | 'top-start' | 'top-center' | 'top-end'
    | 'middle-start' | 'middle-center' | 'middle-end'
    | 'bottom-start' | 'bottom-center' | 'bottom-end';

export interface IndicatorItemConfig {
    position: IndicatorPos;
    content: any;
    className?: string;
}

export interface IndicatorState {
    active: Bindable<boolean>;
    className?: string;
}

export interface IndicatorProps {
    content?: any;
    items?: ReadonlyArray<IndicatorItemConfig>;
    position?: IndicatorPos;
}

function posToItemClass(pos?: IndicatorPos): string {
    switch (pos) {
        case 'top-start': return 'indicator-top indicator-start';
        case 'top-center': return 'indicator-top indicator-middle';
        case 'top-end': return 'indicator-top indicator-end';
        case 'middle-start': return 'indicator-middle indicator-start';
        case 'middle-center': return 'indicator-middle';
        case 'middle-end': return 'indicator-middle indicator-end';
        case 'bottom-start': return 'indicator-bottom indicator-start';
        case 'bottom-center': return 'indicator-bottom indicator-middle';
        case 'bottom-end': return 'indicator-bottom indicator-end';
        default: return 'indicator-top indicator-end';
    }
}

type IndicatorConfig = IndicatorProps & Partial<IndicatorState> & { ns?: string; priority?: number };

export class IndicatorDecorator extends DecoratorBase<IndicatorState, IndicatorProps> {
    private _wrappers = new WeakMap<Component<any, any>, {
        wrapper: HTMLElement;
        items: Map<IndicatorPos, IndicatorEntry>;
    }>();

    constructor(cfg: IndicatorConfig = {}) {
        const {
            ns,
            priority,
            content,
            items,
            ...state
        } = cfg;
        super({
            ns: ns ?? 'indicator',
            priority: priority ?? 120,
            state: {
                active: false,
                className: 'badge badge-primary rounded-full',
                ...state,
            },
            props: { content, items, position: cfg.position ?? 'top-end' },
        });
    }

    wrap(hole: any): any { return hole; }

    afterMount(ctx: DecoratorCtx<IndicatorState, IndicatorProps>): void {
        super.afterMount(ctx);
        this.syncIndicators(ctx);
    }

    update(ctx: DecoratorCtx<IndicatorState, IndicatorProps>): void {
        this.syncIndicators(ctx);
    }

    dispose(ctx: DecoratorCtx<IndicatorState, IndicatorProps>): void {
        this.removeWrapper(ctx);
        super.dispose(ctx);
    }

    private syncIndicators(ctx: DecoratorCtx<IndicatorState, IndicatorProps>): void {
        const deco = ctx.deco ?? {};
        if (!deco.active) {
            this.removeWrapper(ctx);
            return;
        }

        const wrapperEntry = this.ensureWrapper(ctx);
        if (!wrapperEntry) return;
        const desired = this.resolveItems(deco, ctx.props);

        const desiredPos = new Set(desired.map(item => item.position));
        for (const [pos, entry] of wrapperEntry.items) {
            if (!desiredPos.has(pos)) {
                entry.component?.unmount();
                entry.host.remove();
                wrapperEntry.items.delete(pos);
            }
        }

        for (const item of desired) {
            let entry = wrapperEntry.items.get(item.position);
            if (!entry) {
                entry = this.createIndicatorItem(wrapperEntry.wrapper, item.position);
                wrapperEntry.items.set(item.position, entry);
            }
            this.applyItemConfig(ctx, entry, item);
        }
    }

    private ensureWrapper(ctx: DecoratorCtx<IndicatorState, IndicatorProps>): { wrapper: HTMLElement; items: Map<IndicatorPos, IndicatorEntry> } | null {
        let record = this._wrappers.get(ctx.cmp);
        if (record) return record;

        const host = ctx.cmp.el();
        if (!host) return null;
        const parent = host.parentElement;
        if (!parent) return null;

        const wrapper = document.createElement('div');
        wrapper.className = 'indicator';
        parent.replaceChild(wrapper, host);
        wrapper.appendChild(host);

        record = { wrapper, items: new Map() };
        this._wrappers.set(ctx.cmp, record);
        return record;
    }

    private removeWrapper(ctx: DecoratorCtx<IndicatorState, IndicatorProps>): void {
        const record = this._wrappers.get(ctx.cmp);
        if (!record) return;
        for (const entry of record.items.values()) {
            entry.component?.unmount();
        }
        record.items.clear();
        const host = ctx.cmp.el();
        if (host && record.wrapper.contains(host) && record.wrapper.parentElement) {
            record.wrapper.parentElement.replaceChild(host, record.wrapper);
        }
        record.wrapper.remove();
        this._wrappers.delete(ctx.cmp);
    }

    private resolveItems(state: IndicatorState, props?: IndicatorProps): IndicatorItemConfig[] {
        const defaults = {
            className: state.className,
        };
        const propItems = props?.items;
        if (Array.isArray(propItems) && propItems.length) {
            const map = new Map<IndicatorPos, IndicatorItemConfig>();
            for (const raw of propItems) {
                if (!raw || !raw.position) {
                    throw new Error('Indicator item must specify a unique position.');
                }
                if (map.has(raw.position)) {
                    throw new Error(`Indicator item with position "${raw.position}" already defined.`);
                }
                map.set(raw.position, {
                    position: raw.position,
                    content: raw.content,
                    className: raw.className ?? defaults.className,
                });
            }
            return Array.from(map.values());
        }
        return [{
            position: props?.position ?? 'top-end',
            content: props?.content,
            className: defaults.className,
        }];
    }

    private createIndicatorItem(wrapper: HTMLElement, pos: IndicatorPos): IndicatorEntry {
        const badge = document.createElement('span');
        badge.className = `indicator-item ${posToItemClass(pos)}`;
        const contentHost = document.createElement('span');
        contentHost.setAttribute('data-indicator-slot', '');
        badge.appendChild(contentHost);
        wrapper.insertBefore(badge, wrapper.firstChild);
        return { host: badge, contentHost };
    }

    private applyItemConfig(ctx: DecoratorCtx<IndicatorState, IndicatorProps>, entry: IndicatorEntry, cfg: IndicatorItemConfig): void {
        const hasComponent = isComponentInstance(cfg.content);
        const baseClass = hasComponent ? '' : (cfg.className ?? '');
        entry.host.className = `indicator-item ${posToItemClass(cfg.position)} ${baseClass}`.trim();

        if (hasComponent) {
            if (entry.component !== cfg.content) {
                entry.component?.unmount();
                cfg.content.mount(entry.contentHost, ctx.cmp);
                entry.component = cfg.content;
            }
        } else {
            if (entry.component) {
                entry.component.unmount();
                entry.component = undefined;
            }
            entry.contentHost.textContent = cfg.content != null ? String(cfg.content) : '';
        }

    }
}

export function indicator(cfg: IndicatorConfig = {}) {
    return new IndicatorDecorator(cfg);
}

interface IndicatorEntry {
    host: HTMLElement;
    contentHost: HTMLElement;
    component?: Component<any, any>;
}

function isComponentInstance(value: any): value is Component<any, any> {
    if (value && typeof value === 'object' && (value as any).__weaveComponent) return true;
    if (value instanceof Component) return true;
    return false;
}
