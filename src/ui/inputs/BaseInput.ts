
import { html } from 'uhtml';
import { Component, type StateInit } from '../Component';
import { FlyonColor, FlyonColorClasses } from '../tokens';

export type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type InputVariant = 'default' | 'bordered' | 'ghost';
export type LabelMode = 'none' | 'inline' | 'floating';

export interface BaseInputState<T> {
    // valore reattivo
    value: T | null;

    // stato HTML
    readonly: boolean;
    required: boolean;

    // UI
    size: InputSize;        // input-xs/sm/(md)/lg/xl
    variant: InputVariant;  // input, input-bordered, input-ghost
    color: FlyonColor;      // input-primary, ...
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
export abstract class BaseInput<T> extends Component<BaseInputState<T>> {
    private _appliedHostClasses = new Set<string>();
    private _id = BaseInput._uid();

    protected stateInit: StateInit = {
        value: null,
        readonly: false,
        required: false,
        size: 'md',
        variant: 'default',
        color: 'default',
        placeholder: null,
        label: null,
        labelMode: 'none',
        helperText: null,
        touched: false,
        valid: null,
        invalidMessage: null,
    };

    protected hostTag(): string { return 'div'; }

    /** type="" dell'input nativo (es. "text", "number", "date", ...) */
    protected abstract inputType(): string;

    /** conversioni tra value di State ↔️ stringa DOM */
    protected abstract toDom(v: T | null): string;
    protected abstract fromDom(raw: string): T | null;

    /** validazione custom (override dove serve) */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        if (s.variant === 'bordered') inputClasses.add('input-bordered');
        if (s.variant === 'ghost') inputClasses.add('input-ghost');
        const color = FlyonColorClasses.input(s.color);
        if (color) inputClasses.add(color);
        if (s.valid === true)  inputClasses.add('is-valid');
        if (s.valid === false) inputClasses.add('is-invalid');
        const inputClass = [...inputClasses].join(' ');

        // aria
        const ariaInvalid = s.valid === false ? 'true' : undefined;
        const ariaRequired = s.required ? 'true' : undefined;
        const ariaDescribedBy = s.helperText ? `${this._id}-help` : undefined;

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
            ? html`<label class="label-text" for=${this._id}>${s.label}</label>` : null;

        const labelFloating = s.label && s.labelMode === 'floating'
            ? html`<label class="input-floating-label" for=${this._id}>${s.label}</label>` : null;

        // helper
        const helper = s.helperText
            ? html`<div id=${`${this._id}-help`} class="mt-1 text-xs opacity-80">${s.helperText}</div>` : null;

        return html`
      ${labelInline}
      <input
        id=${this._id}
        class=${inputClass}
        type=${this.inputType()}
        .value=${this.toDom(s.value)}
        placeholder=${s.placeholder ?? ''}
        ?readonly=${s.readonly}
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

    private runValidation(): void {
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

    // id helper
    private static _seq = 0;
    private static _uid(): string {
        return `input-${++BaseInput._seq}`;
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
}
