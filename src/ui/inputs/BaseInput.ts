
import { html } from 'uhtml';
import { Component, type StateInit } from '../Component';
export type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LabelMode = 'none' | 'inline' | 'floating';

export interface BaseInputState<T> {
    // valore reattivo
    value: T | null;

    // stato HTML
    readonly: boolean;
    required: boolean;

    // UI
    size: InputSize;        // input-xs/sm/(md)/lg/xl
    placeholder: string | null;

    // label & help
    label: string | null;
    labelMode: LabelMode;   // none | inline | floating
    helperText: string | null;

    // validazione di base
    touched: boolean;
    valid: boolean | null;      // null finché non valutato
    invalidMessage: string | null;
}

/**
 * BaseInput<T>
 * - host = <div> (compatibile con pattern "input-floating" di Flyon)
 * - input interno <input class="input ...">
 * - 2-way binding value, eventi, label inline/floating, helperText
 * - specializzazioni implementano: inputType(), toDom(), fromDom(), validate()
 */
export abstract class BaseInput<T, ExtraState extends object = Record<string, never>>
    extends Component<BaseInputState<T> & ExtraState> {
    protected _appliedHostClasses = new Set<string>();
    protected _pendingInputAttrs: Record<string, any> = {};
    protected _appliedInputAttrKeys = new Set<string>();

    protected applyIdToHost = false;

    protected stateInit: StateInit = {
        value: null,
        readonly: false,
        required: false,
        size: 'md',
        placeholder: null,
        label: null,
        labelMode: 'none',
        helperText: null,
        touched: false,
        valid: null,
        invalidMessage: null,
    };

    protected extraStateInit(): ExtraState {
        return {} as ExtraState;
    }

    protected override schema(): StateInit {
        return {
            ...super.schema(),
            ...this.stateInit,
            ...this.extraStateInit(),
        };
    }

    protected hostTag(): string { return 'div'; }

    protected idPrefix(): string { return 'input'; }

    /** type="" dell'input nativo (es. "text", "number", "date", ...) */
    protected abstract inputType(): string;

    /** conversioni tra value di State ↔️ stringa DOM */
    protected abstract toDom(v: T | null): string;
    protected abstract fromDom(raw: string): T | null;

    /** validazione custom (override dove serve) */
    protected validate(_v: T | null): { valid: boolean; message?: string } | null {
        return null;
    }

    protected view() {
        const s = this.state();
        const host = this.el();

        // host classes (diff, per non toccare classi esterne tipo join-item)
        const hostClasses = new Set<string>();
        if (s.labelMode === 'floating') hostClasses.add('input-floating');
        const extra = typeof this.props.className === 'string'
            ? this.props.className.split(/\s+/).filter(Boolean)
            : [];
        for (const c of extra) hostClasses.add(c);
        for (const c of this._appliedHostClasses) host.classList.remove(c);
        for (const c of hostClasses) host.classList.add(c);
        this._appliedHostClasses = hostClasses;

        // classi input
        const inputClasses = new Set<string>(['input']);
        if (s.size !== 'md') inputClasses.add(`input-${s.size}`);
        if (s.valid === true)  inputClasses.add('is-valid');
        if (s.valid === false) inputClasses.add('is-invalid');
        const inputClass = [...inputClasses].join(' ');

        // aria
        const ariaInvalid = s.valid === false ? 'true' : undefined;
        const ariaRequired = s.required ? 'true' : undefined;
        const inputId = this.id();
        const helperId = this.subId('help');
        const helperContent = s.valid === false && s.invalidMessage
            ? s.invalidMessage
            : s.helperText;
        const ariaDescribedBy = helperContent ? helperId : undefined;

        const mergedInputAttrs = {
            name: typeof this.props.name === 'string' ? this.props.name : undefined,
            autocomplete: typeof this.props.autocomplete === 'string' ? this.props.autocomplete : undefined,
            inputmode: typeof this.props.inputMode === 'string' ? this.props.inputMode : undefined,
            ...this.inputAttributes(),
            ...(typeof this.props.inputAttributes === 'object' && this.props.inputAttributes
                ? this.props.inputAttributes as Record<string, any>
                : {}),
        } as Record<string, any>;

        this._pendingInputAttrs = mergedInputAttrs;

        // handlers
        const onInput = (ev: Event) => {
            const raw = (ev.target as HTMLInputElement).value ?? '';
            const next = this.fromDom(raw);
            s.value = next;
            if (!s.touched) s.touched = true;
            this.runValidation();
            (this.props.onInput as ((cmp: this, ev: Event) => void) | undefined)?.(this, ev);
        };
        const onChange = (ev: Event) => {
            (this.props.onChange as ((cmp: this, ev: Event) => void) | undefined)?.(this, ev);
        };
        const onKeyDown = (ev: KeyboardEvent) => {
            if (ev.key === 'Enter') {
                (this.props.onEnter as ((cmp: this, ev: KeyboardEvent) => void) | undefined)?.(this, ev);
            }
        };

        // label
        const labelInline = s.label && s.labelMode === 'inline'
            ? html`<label class="label-text" for=${inputId}>${s.label}</label>` : null;

        const labelFloating = s.label && s.labelMode === 'floating'
            ? html`<label class="input-floating-label" for=${inputId}>${s.label}</label>` : null;

        // helper
        const helper = helperContent
            ? html`<div id=${helperId} class="mt-1 text-xs opacity-80">${helperContent}</div>` : null;

        return html`
      ${labelInline}
      <input
        id=${inputId}
        class=${inputClass}
        type=${this.inputType()}
        .value=${this.toDom(s.value)}
        placeholder=${s.placeholder ?? ''}
        ?readonly=${s.readonly}
        ?required=${s.required}
        aria-invalid=${ariaInvalid}
        aria-required=${ariaRequired}
        aria-describedby=${ariaDescribedBy}
        oninput=${onInput}
        onchange=${onChange}
        onkeydown=${onKeyDown}
      />
      ${labelFloating}
      ${helper}
    `;
    }

    protected override doRender(): void {
        super.doRender();
        this.applyDynamicInputAttributes();
    }

    protected runValidation(): void {
        const s = this.state();
        const res = this.validate(s.value);
        if (res) {
            s.valid = !!res.valid;
            s.invalidMessage = res.valid ? null : (res.message ?? 'Invalid value');
        } else {
            // se non validiamo, manteniamo l’ultimo stato (o null finché non toccato)
            if (!s.touched) s.valid = null;
        }
    }

    protected applyDisabled(): void {
        super.applyDisabled();

        const s = this.state();
        const input = this.el().querySelector('input');
        if (!(input instanceof HTMLInputElement)) return;

        const disabled = !!s.disabled;
        input.toggleAttribute('disabled', disabled);
        input.disabled = disabled;
    }

    protected inputAttributes(): Record<string, any> {
        return {};
    }

    private applyDynamicInputAttributes(): void {
        const input = this.el().querySelector('input');
        if (!(input instanceof HTMLInputElement)) return;

        const attrs = this._pendingInputAttrs ?? {};
        const nextKeys = new Set<string>();

        for (const [key, value] of Object.entries(attrs)) {
            if (value === undefined || value === null || value === false) {
                input.removeAttribute(key);
                this._appliedInputAttrKeys.delete(key);
                continue;
            }

            const normalized = typeof value === 'boolean' ? '' : String(value);
            input.setAttribute(key, normalized);
            nextKeys.add(key);
            this._appliedInputAttrKeys.add(key);
        }

        const currentKeys = Array.from(this._appliedInputAttrKeys);
        for (const key of currentKeys) {
            if (!nextKeys.has(key)) {
                input.removeAttribute(key);
                this._appliedInputAttrKeys.delete(key);
            }
        }
    }
}
