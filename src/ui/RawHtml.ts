import { html } from 'uhtml';
import DOMPurify from 'dompurify';

import { Component } from './Component';
import type {
    ComponentConfig,
    ComponentProps,
    ComponentState
} from './Component';


export interface RawHtmlProps extends ComponentProps {
    /** HTML da iniettare. */
    html: string;
    /**
     * Sanitize opzionale:
     *  - true → DOMPurify (profilo HTML)
     *  - function → sanificazione custom
     *  - falsy → nessuna sanificazione (usa solo se sicuro!)
     */
    sanitize?: boolean | ((raw: string) => string);
    /** Tag host (default: 'div'). */
    host?: string;
    /** Se true, usa `display: contents` quando visibile (default: true). */
    asContents?: boolean;
}

/**
 * Componente “pass-through” per HTML statico.
 * - parsa una sola volta in beforeMount()
 * - inserisce i Node risultanti nel template uhtml (nessuna rielaborazione)
 * - non re-renderizza su cambi di props (lo scopo è contenuto statico)
 */
export class RawHtml extends Component<ComponentState, RawHtmlProps> {
    private _nodes: Node[] = [];

    protected override hostTag(): string {
        return (this.props.host as string) || 'div';
    }

    protected override beforeMount(): void {
        const raw = String(this.props.html ?? '');
        const san = this.props.sanitize;

        const safe =
            !san ? raw
            : typeof san === 'function' ? san(raw)
            : DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });

        const tpl = document.createElement('template');
        tpl.innerHTML = safe;
        this._nodes = Array.from(tpl.content.childNodes);
    }

    protected override applyHidden(): void {
        super.applyHidden();

        if (!this.state().hidden && this.props.asContents !== false) {
            this.el().style.display = 'contents';
        }
    }

    protected override view() {
        return html`${this._nodes}`;
    }
}

/** Factory di convenienza. */
export function rawHtml(cfg: ComponentConfig<ComponentState, RawHtmlProps>): RawHtml {
    return new RawHtml(cfg);
}
