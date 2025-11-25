// src/ui/Dropdown.ts
import { html } from 'uhtml';
import { InteractiveComponent, type InteractiveComponentState } from './InteractiveComponent';
import { slot, type Component, type ComponentConfig, type ComponentProps } from './Component';
import { button, type Button, type ButtonProps, type ButtonState } from './Button';
import { link, type Link } from './Link';
import { mergeSchemas } from './schemaUtils';

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
    /** Config opzionale per generare automaticamente un Button come trigger. Ignorata se `trigger` è fornito. */
    triggerButton?: ComponentConfig<ButtonState, ButtonProps>;

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

const DROPDOWN_STATE_SCHEMA = {
    type: 'object',
    properties: {
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    text: { type: 'string' },
                    href: { type: ['string', 'null'], default: null },
                    icon: { type: ['string', 'null'], default: null },
                    disabled: { type: 'boolean', default: false }
                },
                additionalProperties: true
            }
        }
    },
    additionalProperties: true
} as const;

export class Dropdown extends InteractiveComponent<DropdownState, DropdownProps> {
    // usato dal framework per l’auto-init Flyon al mount
    static flyonInit = ['dropdown'];

    private _trigger?: Component<any, any>;
    private _defaultTrigger?: Button;
    private _itemComponents: Array<Component<any, any> | null> = [];

    protected override schema(): Record<string, any> {
        return mergeSchemas(super.schema(), DROPDOWN_STATE_SCHEMA);
    }

    protected override beforeMount(): void {
        const p = this.props();

        // Se viene fornito un trigger come Component, lo montiamo off-DOM.
        if (p.trigger) {
            this._trigger = p.trigger;
            const tmp = document.createElement('div');
            // NOTA: lo montiamo senza parent Component (niente parentState), ma per la disabilitazione
            // ereditiamo via setDisabledFromParent() nei render/updates.
            this._trigger.mount(tmp);
        } else {
            const cfg = this.buildTriggerButtonConfig();
            const btn = button(cfg);
            this._defaultTrigger = btn;
            this._trigger = btn;
            const tmp = document.createElement('div');
            btn.mount(tmp);
        }

        super.beforeMount();
    }

    protected override doRender(): void {
        super.doRender();
        this.syncLinkItems();
    }

    protected override view() {
        const p = this.props();
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

        const items = (s.items ?? []).map((it, idx) => this.renderItem(it, idx, p));

        // root unico, adottato dal Component base
        return html`<div class=${rootClasses.join(' ')} style=${styleVars.join(';')}>
            ${triggerNode}
            <ul class=${menuClasses} role="menu" aria-orientation="vertical">
                ${items}
            </ul>
        </div>`;
    }

    private buildTriggerButtonConfig(): ComponentConfig<ButtonState, ButtonProps> {
        const incoming = this.props().triggerButton ?? {};
        const { className, ...rest } = incoming as ComponentConfig<ButtonState, ButtonProps>;
        const defaultIcon = 'icon-[tabler--chevron-down] size-5 transition-transform duration-200 dropdown-open:rotate-180';
        const baseClass = ['dropdown-toggle', 'inline-flex', 'items-center', 'gap-2'];
        if (className) baseClass.push(className);
        return {
            text: 'Menu',
            variant: 'soft',
            color: 'neutral',
            icon: defaultIcon,
            iconPosition: 'right',
            ...rest,
            className: baseClass.join(' ')
        };
    }

    /** Render del trigger: se c’è un Component lo embeddiamo, altrimenti un <button> minimale. */
    private renderTrigger(effectiveDisabled: boolean) {
        const p = this.props();

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
    private renderItem(item: DropdownItem, index: number, props: DropdownProps) {
        const closeIfNeeded = () => {
            if (props.closeOnItemClick !== false) this.close();
        };

        switch (item.type) {
            case 'divider':
                return html`<li><hr class="border-base-content/25 my-2 -mx-2" /></li>`;

            case 'title':
                return html`<li class="dropdown-title">${item.text}</li>`;

            case 'link': {
                const slotName = this.itemSlotName(index);
                return html`<li role="none">${slot(slotName)}</li>`;
            }

            case 'button': {
                const disabled = !!this.safeItemValue(item, 'disabled', false);
                const iconName = this.safeItemValue<string | null>(item, 'icon', null);
                const icon = iconName ? html`<span class=${iconName}></span>` : null;
                const itemClick = this.safeItemValue<(() => void) | undefined>(item, 'onClick');
                const onClick = () => {
                    if (disabled) return;
                    itemClick?.();
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

    private itemSlotName(index: number): string {
        return `dropdown-item-${index}`;
    }

    private syncLinkItems(): void {
        this.disposeItemComponents();

        const items = this.state().items ?? [];
        items.forEach((item, idx) => {
            if (item.type !== 'link') {
                this._itemComponents[idx] = null;
                return;
            }
            const cmp = this.createLinkItem(item);
            cmp.mount(this.slotEl(this.itemSlotName(idx)), this);
            this._itemComponents[idx] = cmp;
        });
    }

    private disposeItemComponents(): void {
        for (const cmp of this._itemComponents) {
            cmp?.unmount();
        }
        this._itemComponents = [];
    }

    private createLinkItem(item: Extract<DropdownItem, { type: 'link' }>): Link {
        const disabled = !!this.safeItemValue(item, 'disabled', false);
        const disabledCls = disabled ? 'pointer-events-none opacity-60' : '';
        const className = ['dropdown-item', 'flex', 'items-center', 'gap-2', disabledCls].filter(Boolean).join(' ');
        const text = this.safeItemValue<string>(item, 'text', '') ?? '';
        const href = this.safeItemValue<string | null>(item, 'href', null);
        const iconName = this.safeItemValue<string | null>(item, 'icon', null);
        const itemClick = this.safeItemValue<(() => void) | undefined>(item, 'onClick');

        const onItemClick = () => {
            itemClick?.();
            if (this.props().closeOnItemClick !== false) this.close();
        };

        return link({
            text,
            href: href ?? '#',
            icon: iconName ?? null,
            iconPosition: 'left',
            color: 'default',
            decoration: 'hover',
            className,
            disabled,
            onClick: (_lnk, _ev) => onItemClick(),
            attrs: {
                role: 'menuitem',
            },
        });
    }

    private safeItemValue<T>(item: DropdownItem, key: string, fallback?: T): T | undefined {
        try {
            const value = (item as any)?.[key];
            return value === undefined ? fallback : value;
        } catch {
            return fallback;
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
        this.disposeItemComponents();
        this._trigger?.unmount();
        this._trigger = undefined;
        this._defaultTrigger = undefined;
        super.beforeUnmount();
    }
}

/** Factory */
export function dropdown(cfg: ComponentConfig<DropdownState, DropdownProps> = {}): Dropdown {
    return new Dropdown(cfg);
}
