// src/ui/Markup.ts
import { html } from 'uhtml';
import { Component, type ComponentConfig, type ComponentProps, type ComponentState } from './Component';
import type { State } from '../state/State';

export interface MarkupState extends ComponentState {}

export interface MarkupProps extends ComponentProps {
    /**
     * Se presente, deve restituire un *root element* (uhtml template) del markup.
     * Riceve lo State reattivo del componente.
     */
    render?: (s: State & MarkupState) => any;

    /**
     * Fallback minimale (solo se NON usi `render`): crea un root col tag indicato.
     * Utile per placeholder molto semplici; per casi reali usa sempre `render`.
     */
    tag?: string;
}

export type MarkupConfig = ComponentConfig<MarkupState, MarkupProps>;

/**
 * Markup “foglia”: delega *tutto* al template restituito da `render(s)`.
 * Il padre `Component` adotterà il root, e a ogni re-render sincronizza classi/attributi.
 */
export class Markup extends Component<MarkupState, MarkupProps> {
    protected override view() {
        let p = this.props();
        const r = p.render;
        if (typeof r === 'function') {
            // Deve restituire un *singolo* root element (uhtml template)
            return r(this.state());
        }

        // Fallback super-minimale se non fornisci `render`
        const tag = p.tag ?? 'div';
        const cls = p.className ?? '';
        // uhtml consente tag dinamici con <${tag}>
        return html`<${tag} class=${cls}></${tag}>`;
    }
}

/* ------------------------------------------
   Factory #1: overload “comodo”
   - markup(cfg)            → classico config
   - markup(renderFn)       → sugar brevissimo
------------------------------------------- */
export function markup(arg: MarkupConfig | ((s: State & MarkupState) => any) = {}): Markup {
    if (typeof arg === 'function') {
        return new Markup({ render: arg });
    }
    return new Markup(arg);
}

/* ------------------------------------------
   Factory #2: tagged template “direttissimo”
   Uso:
     markupTpl`<h2>${(s) => s.title}</h2>`
   (ogni buco può essere un valore o (s)=>qualcosa)
------------------------------------------- */
export function markupTpl(
    strings: TemplateStringsArray,
    ...exprs: Array<any | ((s: State & MarkupState) => any)>
): Markup {
    const render = (s: State & MarkupState) =>
        html(strings, ...exprs.map((e) => (typeof e === 'function' ? e(s) : e)));
    return new Markup({ render });
}