import { html } from 'uhtml';
import { Component, StateInit } from './Component';
import { ComponentRegistry } from './Registry';
import { Button } from './Button'; // <— usiamo il Button esistente
import type { Component as BaseComponent } from './Component';
import type { ComponentConfig } from './Registry';

type FlyonColor =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'info'
    | 'success'
    | 'warning'
    | 'error';

type Variant = 'solid' | 'soft' | 'outline';

// Accettiamo vari formati per un’azione
export type AlertActionConfig =
    | Button                             // istanza già pronta
    | (ComponentConfig & { wtype: 'button' }) // config con wtype
    | Record<string, any>;               // opzioni flat del Button

export interface AlertState {
    variant: Variant;
    color: FlyonColor;

    title: string | null;
    message: string | null;
    list: string[] | null;

    icon: string | null;

    dismissible: boolean;
    closeLabel: string;

    responsive: boolean;

    // NOTE: le azioni NON stanno nello state reattivo:
    // diventano sotto-componenti Button (schema già gestito da Button)
}

let _idSeq = 0;
function uid() {
    _idSeq += 1;
    return `alert-${_idSeq}`;
}

/**
 * FlyonUI Alert component con actions renderizzate come veri <Button>.
 */
export class Alert extends Component<AlertState> {
    static wtype = 'alert';

    private _id = uid();
    private _buttons: Button[] = []; // sotto-componenti azione

    protected stateInit: StateInit = {
        variant: 'solid',
        color: 'default',
        title: null,
        message: 'A quick alert conveying key information or prompting action within a system.',
        list: null,
        icon: null,
        dismissible: false,
        closeLabel: 'Close',
        responsive: false
    };

    protected willMount(): void {
        // Normalizza le actions dal props in una lista di Button
        const raw = this.props.actions as AlertActionConfig[] | undefined;
        if (!raw || raw.length === 0) return;

        this._buttons = raw.map((item) => this.toButton(item));
        // Montiamo i Button su un contenitore temporaneo; poi in view() useremo i loro .el()
        for (const btn of this._buttons) {
            const tmp = document.createElement('div');
            btn.mount(tmp, this.state()); // eredita lo state per alias e derivate
        }
    }

    public unmount(): void {
        // cleanup dei sotto-componenti
        for (const b of this._buttons) b.unmount();
        this._buttons = [];
        super.unmount();
    }

    private toButton(cfg: AlertActionConfig): Button {
        if (cfg instanceof Button) return cfg;
        if ((cfg as any)?.wtype === 'button') {
            // usa il registry per istanziare via wtype
            const comp = ComponentRegistry.create(cfg as ComponentConfig);
            if (!(comp instanceof Button)) {
                throw new Error(`Alert action wtype non è Button: ${(cfg as any).wtype}`);
            }
            return comp;
        }
        // oggetto flat → passa direttamente al costruttore Button
        return new Button({ ...(cfg as Record<string, any>) });
    }

    protected view() {
        const s = this.state();

        // classi base + variante
        const classes = new Set<string>(['alert']);
        switch (s.variant) {
            case 'soft': classes.add('alert-soft'); break;
            case 'outline': classes.add('alert-outline'); break;
            case 'solid':
            default: break;
        }

        // colore semantico
        const COLOR: Record<FlyonColor, string | null> = {
            default: null,
            primary: 'alert-primary',
            secondary: 'alert-secondary',
            info: 'alert-info',
            success: 'alert-success',
            warning: 'alert-warning',
            error: 'alert-error',
        };
        const c = COLOR[s.color];
        if (c) classes.add(c);

        // layout opzionale (responsive come negli esempi FlyonUI)
        const contentWrap = s.icon || this._buttons.length || s.title || s.list || s.responsive;
        const containerFlex =
            contentWrap && s.responsive
                ? 'flex items-start max-sm:flex-col max-sm:items-center gap-4'
                : contentWrap
                    ? 'flex items-start gap-4'
                    : '';

        // contenuti
        const title = s.title ? html`<h5 class="text-lg font-semibold">${s.title}</h5>` : null;
        const message = s.message && !s.list ? html`<p>${s.message}</p>` : null;
        const list = s.list && s.list.length
            ? html`<ul class="mt-1.5 list-inside list-disc">
          ${s.list.map((li) => html`<li>${li}</li>`)}
        </ul>`
            : null;

        // wrapper testuale
        const textCol = (title || list)
            ? html`<div class="flex flex-col gap-1">${title} ${message} ${list}</div>`
            : html`${message}`;

        if (s.dismissible) {
            classes.add('transition');
            classes.add('duration-300');
            classes.add('ease-in-out');
            classes.add('removing:opacity-0');
            classes.add('removing:translate-x-5');
        }

        // pulsante di chiusura (senza spread attributi)
        const closeBtn = s.dismissible ? html`
            <button class="ms-auto cursor-pointer leading-none"
                    aria-label=${s.closeLabel}
                    onclick=${(ev: MouseEvent) => {
                        (this.props.onDismiss as ((cmp: Alert, ev: MouseEvent) => void) | undefined)?.(this, ev);
                        this.requestRemove(); // ← anima e poi unmount() (Alert + Buttons figli)
                    }}>
                <span class="icon-[tabler--x] size-5"></span>
            </button>
        ` : null;

        // icona (passa tutta la stringa class come espressione unica)
        const iconEl = s.icon ? html`<span class=${s.icon}></span>` : null;

        // className extra lato props
        const extra = typeof this.props.className === 'string' ? this.props.className : '';
        const classAttr =
            [...classes].join(' ')
            + (containerFlex ? ` ${containerFlex}` : '')
            + (extra ? ` ${extra}` : '');

        // azioni: inseriamo direttamente i DOM host dei Button
        const actionsEl = this._buttons.length
            ? html`<div class="mt-4 flex gap-2">
          ${this._buttons.map(b => b.el())}
        </div>`
            : null;

        return html`
      <div id=${this._id} class=${classAttr} role="alert">
        ${iconEl} ${textCol} ${actionsEl} ${closeBtn}
      </div>
    `;
    }
}

ComponentRegistry.registerClass(Alert);