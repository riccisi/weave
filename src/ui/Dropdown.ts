// src/ui/Dropdown.ts
import { html } from 'uhtml';
import { InteractiveComponent, type InteractiveComponentState } from './InteractiveComponent';
import { type Component, type ComponentConfig, type ComponentProps } from './Component';

export type DropdownItem =
    | { type: 'divider' }
    | { type: 'title'; text: string }
    | { type: 'link'; text: string; href?: string | null; icon?: string; disabled?: boolean; onClick?: () => void }
    | { type: 'button'; text: string; icon?: string; disabled?: boolean; onClick?: () => void };

export interface DropdownState extends InteractiveComponentState {
    items: DropdownItem[];
}

export interface DropdownProps extends ComponentProps {
    /** Trigger opzionale come Component; verrà montato off-DOM e inserito come toggle. */
    trigger?: Component<any, any>;

    /** Apre al passaggio del mouse (delegato a Flyon). */
    openOnHover?: boolean;

    /** Allineamento orizzontale del menu rispetto al trigger. */
    align?: 'start' | 'end';

    /** Posizionamento preferito del menu attorno al trigger. */
    placement?: 'bottom' | 'top' | 'left' | 'right';

    /** Classi extra sul menu (es. 'min-w-60'). */
    menuClassName?: string;

    /** Chiudere il menu al click su un item (default true). */
    closeOnItemClick?: boolean;

    /** Offset px tra trigger e menu (default 8). */
    offset?: number;

    /** Abilita flip quando non c’è spazio (default true). */
    flip?: boolean;

    /** Abilita shift per rimanere in viewport (default true). */
    shift?: boolean;

    /** Modalità evento: 'click' (default) o 'hover' — ridondante rispetto a openOnHover, ma utile per CSS var. */
    triggerMode?: 'click' | 'hover';
}

export class Dropdown extends InteractiveComponent<DropdownState, DropdownProps> {
    // usato dal framework per l’auto-init Flyon al mount
    static flyonInit = ['dropdown'];

    private _trigger?: Component<any, any>;

    protected override initialState(): DropdownState {
        return {
            ...(super.initialState() as InteractiveComponentState),
            items: [],
        } satisfies DropdownState;
    }

    protected override beforeMount(): void {
        const p = this.props as DropdownProps;

        // Se viene fornito un trigger come Component, lo montiamo off-DOM.
        if (p.trigger) {
            this._trigger = p.trigger;
            const tmp = document.createElement('div');
            // NOTA: lo montiamo senza parent Component (niente parentState), ma per la disabilitazione
            // ereditiamo via setDisabledFromParent() nei render/updates.
            this._trigger.mount(tmp);
        }

        super.beforeMount();
    }

    protected override view() {
        const p = this.props as DropdownProps;
        const s = this.state();

        const effectiveDisabled = this.disabled;

        // classi del root .dropdown
        const rootClasses: string[] = ['dropdown'];
        if (p.openOnHover) rootClasses.push('dropdown-hover');
        if (p.align === 'end') rootClasses.push('dropdown-end');

        // CSS vars di posizionamento/behavior lette da Flyon
        const placement = `${p.placement ?? 'bottom'}-${p.align ?? 'start'}`;
        const triggerMode = p.triggerMode ?? (p.openOnHover ? 'hover' : 'click');
        const styleVars: string[] = [
            `--placement:${placement}`,
            `--offset:${String(p.offset ?? 8)}`,
            `--flip:${(p.flip ?? true).toString()}`,
            `--shift:${(p.shift ?? true).toString()}`,
            `--trigger:${triggerMode}`,
        ];

        // Trigger (custom o fallback puro)
        const triggerNode = this.renderTrigger(effectiveDisabled);

        // classi menu
        const menuClasses = [
            'dropdown-menu',
            'hidden', // Flyon parte da hidden e gestisce open/close
            // utilità visive opzionali:
            'dropdown-open:opacity-100',
            p.menuClassName ?? '',
        ]
            .filter(Boolean)
            .join(' ');

        const items = (s.items ?? []).map((it) => this.renderItem(it, p));

        // root unico, adottato dal Component base
        return html`<div class=${rootClasses.join(' ')} style=${styleVars.join(';')}>
            ${triggerNode}
            <ul class=${menuClasses} role="menu" aria-orientation="vertical">
                ${items}
            </ul>
        </div>`;
    }

    /** Render del trigger: se c’è un Component lo embeddiamo, altrimenti un <button> minimale. */
    private renderTrigger(effectiveDisabled: boolean) {
        const p = this.props as DropdownProps;

        if (this._trigger) {
            const host = this._trigger.el();
            // garantiamo il ruolo di toggle per Flyon
            host.classList.add('dropdown-toggle');
            host.setAttribute('aria-haspopup', 'menu');
            host.setAttribute('aria-expanded', 'false');

            // riflettiamo disabled ereditato (se il trigger è InteractiveComponent gestirà anche i propri stili)
            if (host.tagName.toLowerCase() === 'button') {
                host.toggleAttribute('disabled', effectiveDisabled);
                host.classList.toggle('btn-disabled', effectiveDisabled);
            } else {
                // fallback generico se il trigger non è un <button>
                host.setAttribute('aria-disabled', effectiveDisabled ? 'true' : 'false');
                host.classList.toggle('pointer-events-none', effectiveDisabled);
                host.classList.toggle('opacity-60', effectiveDisabled);
            }

            // se il trigger è InteractiveComponent, forziamo anche la cascata di disabled
            try {
                // @ts-ignore — potremmo non avere il metodo
                if (typeof (this._trigger as any).setDisabledFromParent === 'function') {
                    // @ts-ignore
                    (this._trigger as any).setDisabledFromParent(effectiveDisabled);
                }
            } catch {
                /* noop */
            }

            return host;
        }

        // Fallback trigger puro (markup), non dipende da Button component
        return html`<button
      type="button"
      class="dropdown-toggle btn btn-soft icon-right"
      aria-haspopup="menu"
      aria-expanded="false"
      disabled=${effectiveDisabled ? true : null}
    >
      <span>Open menu</span>
      <span class="icon-[tabler--chevron-down] size-4 dropdown-open:rotate-180"></span>
    </button>`;
    }

    /** Render di un item del menu. */
    private renderItem(item: DropdownItem, props: DropdownProps) {
        const closeIfNeeded = () => {
            if (props.closeOnItemClick !== false) this.close();
        };

        switch (item.type) {
            case 'divider':
                return html`<li><hr class="border-base-content/25 my-2 -mx-2" /></li>`;

            case 'title':
                return html`<li class="dropdown-title">${item.text}</li>`;

            case 'link': {
                const href = item.href ?? '#';
                const disabled = !!item.disabled;
                const icon = item.icon ? html`<span class=${item.icon}></span>` : null;

                const onClick = (ev: MouseEvent) => {
                    if (disabled) {
                        ev.preventDefault();
                        ev.stopImmediatePropagation();
                        return;
                    }
                    item.onClick?.();
                    closeIfNeeded();
                };

                return html`<li>
                    <a
                            class="dropdown-item ${disabled ? 'pointer-events-none opacity-60' : ''}"
                            href=${href}
                            aria-disabled=${disabled ? 'true' : 'false'}
                            onclick=${onClick}
                    >
                        ${icon} ${item.text}
                    </a>
                </li>`;
            }

            case 'button': {
                const disabled = !!item.disabled;
                const icon = item.icon ? html`<span class=${item.icon}></span>` : null;
                const onClick = () => {
                    if (disabled) return;
                    item.onClick?.();
                    closeIfNeeded();
                };

                return html`<li>
                    <button class="dropdown-item" disabled=${disabled ? true : null} onclick=${onClick}>
                        ${icon} ${item.text}
                    </button>
                </li>`;
            }
        }
    }

    // --------- API imperativa: usa Flyon se presente, altrimenti fallback su classe 'open' ----------

    public open(): void {
        const w = (window as any);
        if (w?.HSDropdown?.open) {
            w.HSDropdown.open(this.el());
            return;
        }
        this.el().classList.add('open'); // fallback
    }

    public close(): void {
        const w = (window as any);
        if (w?.HSDropdown?.close) {
            w.HSDropdown.close(this.el());
            return;
        }
        this.el().classList.remove('open'); // fallback
    }

    public toggle(): void {
        const w = (window as any);
        if (w?.HSDropdown?.getInstance) {
            const inst = w.HSDropdown.getInstance(this.el(), true);
            if (inst) {
                if (inst.isOpened()) w.HSDropdown.close(this.el());
                else w.HSDropdown.open(this.el());
                return;
            }
        }
        this.el().classList.toggle('open'); // fallback
    }

    public isOpen(): boolean {
        const w = (window as any);
        if (w?.HSDropdown?.getInstance) {
            const inst = w.HSDropdown.getInstance(this.el(), true);
            if (inst) return !!inst.isOpened();
        }
        return this.el().classList.contains('open'); // fallback
    }

    protected override beforeUnmount(): void {
        this._trigger?.unmount();
        this._trigger = undefined;
        super.beforeUnmount();
    }
}

/** Factory */
export function dropdown(cfg: ComponentConfig<DropdownState, DropdownProps> = {}): Dropdown {
    return new Dropdown(cfg);
}
