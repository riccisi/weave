// src/ui/Content.ts
import { html } from 'uhtml';
import DOMPurify from 'dompurify';
import {
    Component,
    type ComponentConfig,
    type ComponentProps,
} from './Component';
import type { State } from '../state/State';

export interface ContentState extends ComponentState {}

export interface ContentProps extends ComponentProps {
    /**
     * Sorgente del contenuto:
     *  - stringa HTML
     *  - funzione reattiva (s) => string | uhtml (Hole)
     *  - direttamente un uhtml Hole / Node / Node[]
     */
    body?: string | ((s: State & ContentState) => any) | any;

    /**
     * Sanificazione (solo se body è stringa o ritorna stringa):
     *  - true  → DOMPurify (profilo HTML)
     *  - fn    → funzione custom
     *  - falsy → nessuna sanificazione
     */
    sanitize?: boolean | ((raw: string) => string);
}

export type ContentConfig = ComponentConfig<ContentState, ContentProps>;

export class Content extends Component<ContentState, ContentProps> {
    private _cachedRaw?: string;
    private _cachedSanRef?: ContentProps['sanitize'];
    private _cachedNodes: Node[] = [];

    protected override view() {
        const p = this.props();
        const s = this.state();
        const body = p.body;

        // 1) funzione reattiva
        if (typeof body === 'function') {
            const out = (body as (s: State & ContentState) => any)(s);
            if (typeof out === 'string') return this.fromStringToHole(out);
            return out ?? html``;
        }

        // 2) stringa statica
        if (typeof body === 'string') {
            return this.fromStringToHole(body);
        }

        // 3) Hole/Node/Node[] pass-through
        if (body != null) return body;

        // 4) fallback vuoto
        return html``;
    }

    /** String → (sanitize + parse) → cache Node[] → Hole */
    private fromStringToHole(raw: string) {
        const p = this.props();
        const needReparse = raw !== this._cachedRaw || p.sanitize !== this._cachedSanRef;

        if (needReparse) {
            const san = p.sanitize;
            const safe =
                !san
                    ? raw
                    : typeof san === 'function'
                        ? san(raw)
                        : DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });

            const tpl = document.createElement('template');
            tpl.innerHTML = safe;
            this._cachedNodes = Array.from(tpl.content.childNodes);
            this._cachedRaw = raw;
            this._cachedSanRef = san;
        }

        return html`${this._cachedNodes}`;
    }
}

/** Factory unica */
export function content(
    arg: ContentConfig | string | ((s: State & ContentState) => any) = {}
): Content {
    if (typeof arg === 'string') return new Content({ body: arg });
    if (typeof arg === 'function') return new Content({ body: arg });
    return new Content(arg);
}

/** Tagged template reattivo */
export function contentTpl(
    strings: TemplateStringsArray,
    ...exprs: Array<any | ((s: State & ContentState) => any)>
): Content {
    const body = (s: State & ContentState) =>
        html(strings, ...exprs.map(e => (typeof e === 'function' ? e(s) : e)));
    return new Content({ body });
}
