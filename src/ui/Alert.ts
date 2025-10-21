// src/ui/Alert.ts
import { html } from 'uhtml';
import { Component, StateInit } from './Component';
import { ComponentRegistry, type ComponentConfig } from './Registry';
import { Button } from './Button';

type FlyonColor =
    | 'default' | 'primary' | 'secondary'
    | 'info'    | 'success'  | 'warning' | 'error';

type Variant = 'solid' | 'soft' | 'outline';

/** Formati supportati per definire un'action dell'Alert. */
export type AlertActionConfig =
    | Button                                   // istanza già creata
    | (ComponentConfig & { wtype: 'button' })  // config con wtype
    | Record<string, any>;                     // opzioni flat per Button

export interface AlertState {
    variant: Variant;
    color: FlyonColor;

    title: string | null;
    message: string | null;
    list: string[] | null;

    /** class string completa per l’icona (es. 'icon-[tabler--info-circle] size-6 shrink-0') */
    icon: string | null;

    /** Se true, mostra la X e abilita rimozione animata. */
    dismissible: boolean;
    closeLabel: string;

    /** Imposta layout responsive (colonna su small). */
    responsive: boolean;
}

/**
 * FlyonUI Alert
 * - Host = <div role="alert"> (nessun wrapper extra nel template).
 * - Classi/attributi applicati sul host in modo differenziale.
 * - Le actions sono istanze di Button montate off-DOM.
 */
export class Alert extends Component<AlertState> {
    static wtype = 'alert';

    /** track delle classi applicate da Alert per non toccare classi esterne */
    private _appliedClasses: Set<string> = new Set();
    /** sotto-componenti azione (Button) */
    private _buttons: Button[] = [];

    protected stateInit: StateInit = {
        variant: 'solid',
        color: 'default',
        title: null,
        message: 'A quick alert conveying key information or prompting action within a system.',
        list: null,
        icon: null,
        dismissible: false,
        closeLabel: 'Close',
        responsive: false,
    };

    /** Normalizza actions → Button e li monta off-DOM per ereditarne lo state. */
    protected beforeMount(): void {
        const raw = this.props.actions as AlertActionConfig[] | undefined;
        if (!raw?.length) return;

        this._buttons = raw.map((cfg) => this.toButton(cfg));
        for (const btn of this._buttons) {
            const staging = document.createElement('div');
            btn.mount(staging, this.state());
        }
    }

    /** Pulizia dei sotto-componenti al teardown. */
    protected beforeUnmount(): void {
        for (const b of this._buttons) b.unmount();
        this._buttons = [];
    }

    /** Converte qualsiasi formato supportato in un Button istanziato. */
    private toButton(cfg: AlertActionConfig): Button {
        if (cfg instanceof Button) return cfg;
        if ((cfg as any)?.wtype === 'button') {
            const comp = ComponentRegistry.create(cfg as ComponentConfig);
            if (!(comp instanceof Button)) {
                throw new Error(`Alert action wtype non è 'button': ${(cfg as any).wtype}`);
            }
            return comp;
        }
        return new Button({ ...(cfg as Record<string, any>) });
    }

    /** Applica classi/attributi al host e rende contenuto interno. */
    protected view() {
        const s = this.state();
        const host = this.el();

        // --- classi del host (solo quelle “nostre”) ---------------------------------
        const classes = new Set<string>(['alert']);

        // variante
        if (s.variant === 'soft') classes.add('alert-soft');
        else if (s.variant === 'outline') classes.add('alert-outline');

        // colore
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

        // layout (responsive & spaziature simili agli esempi Flyon)
        const needsWrap = s.icon || this._buttons.length || s.title || s.list || s.responsive;
        if (needsWrap) {
            if (s.responsive) classes.add('max-sm:flex-col'), classes.add('max-sm:items-center');
            classes.add('flex'), classes.add('items-start'), classes.add('gap-4');
        }

        // dismissible: classi per animazione di uscita (devono esistere a build-time)
        if (s.dismissible) {
            classes.add('transition');
            classes.add('duration-300');
            classes.add('ease-in-out');
            classes.add('removing:opacity-0');
            classes.add('removing:translate-x-5');
        }

        // extra className da props
        const extra = typeof this.props.className === 'string'
            ? this.props.className.split(/\s+/).filter(Boolean)
            : [];
        for (const e of extra) classes.add(e);

        // diff classes sul host (non rimuovere classi esterne es. join-item)
        for (const cls of this._appliedClasses) host.classList.remove(cls);
        for (const cls of classes) host.classList.add(cls);
        this._appliedClasses = classes;

        // attributi host
        host.setAttribute('role', 'alert');

        // --- contenuti --------------------------------------------------------------
        const iconEl = s.icon ? html`<span class=${s.icon}></span>` : null;

        const titleEl = s.title ? html`<h5 class="text-lg font-semibold">${s.title}</h5>` : null;
        const messageEl = s.message && !s.list ? html`<p>${s.message}</p>` : null;
        const listEl = s.list?.length
            ? html`<ul class="mt-1.5 list-inside list-disc">${s.list.map((li) => html`<li>${li}</li>`)}</ul>`
            : null;

        const textCol = (titleEl || listEl)
            ? html`<div class="flex flex-col gap-1">${titleEl} ${messageEl} ${listEl}</div>`
            : html`${messageEl}`;

        const actionsEl = this._buttons.length
            ? html`<div class="mt-4 flex gap-2">${this._buttons.map((b) => b.el())}</div>`
            : null;

        const closeBtn = s.dismissible ? html`
            <button class="ms-auto cursor-pointer leading-none"
                    aria-label=${s.closeLabel}
                    onclick=${(ev: MouseEvent) => {
                        (this.props.onDismiss as ((cmp: Alert, ev: MouseEvent) => void) | undefined)?.(this, ev);
                        this.requestRemove(); // anima + unmount (anche dei Button figli)
                    }}>
                <span class="icon-[tabler--x] size-5"></span>
            </button>
        ` : null;

        // --- render del contenuto interno (host è già il wrapper) -------------------
        return html`${iconEl} ${textCol} ${actionsEl} ${closeBtn}`;
    }
}

// Auto-register all’import
ComponentRegistry.registerClass(Alert);
