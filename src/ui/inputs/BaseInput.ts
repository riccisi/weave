import { html } from 'uhtml';
import { Component, type StateInit } from '../Component';

export type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LabelMode = 'none' | 'inline' | 'floating';

export interface ValidationResult {
    valid: boolean;
    message?: string;
}

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
    validationEnabled: boolean; // consente di disattivare la validazione reattiva
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
    private _validationUnsub: (() => void) | null = null;

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
        validationEnabled: true,
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
    protected validate(_v: T | null): ValidationResult | null { return null; }

    /** Permette alle sottoclassi di aggiungere classi host predefinite. */
    protected defaultHostClasses(): string[] {
        const s = this.state();
        return s.labelMode === 'floating' ? ['input-floating'] : [];
    }

    /** Classi aggiuntive provenienti da props.className (se impostate). */
    private propHostClasses(): string[] {
        const raw = this.props.className;
        if (typeof raw !== 'string' || !raw.trim()) return [];
        return raw.split(/\s+/).filter(Boolean);
    }

    protected collectHostClasses(additional: Iterable<string | false | null | undefined> = []): Set<string> {
        const classes = new Set<string>(this.defaultHostClasses());
        for (const cls of additional) {
            if (!cls) continue;
            classes.add(cls);
        }
        for (const cls of this.propHostClasses()) classes.add(cls);
        return classes;
    }

    protected applyHostClasses(classList: Iterable<string>): void {
        const host = this.el();
        const next = new Set<string>();
        for (const cls of classList) {
            const normalized = cls?.trim();
            if (!normalized) continue;
            next.add(normalized);
        }

        for (const cls of this._appliedHostClasses) {
            if (!next.has(cls)) host.classList.remove(cls);
        }
        for (const cls of next) {
            if (!this._appliedHostClasses.has(cls)) host.classList.add(cls);
        }
        this._appliedHostClasses = next;
    }

    protected defaultInputClasses(): string[] {
        const s = this.state();
        const classes = ['input'];
        if (s.size !== 'md') classes.push(`input-${s.size}`);
        if (s.valid === true) classes.push('is-valid');
        if (s.valid === false) classes.push('is-invalid');
        return classes;
    }

    protected inputClass(additional: Iterable<string | false | null | undefined> = []): string {
        const classes = new Set(this.defaultInputClasses());
        for (const cls of additional) {
            if (!cls) continue;
            classes.add(cls);
        }
        return [...classes].join(' ');
    }

    protected helperContent(): string | null {
        const s = this.state();
        if (s.valid === false && s.invalidMessage) return s.invalidMessage;
        return s.helperText ?? null;
    }

    protected buildInputAttributes(overrides: Record<string, any> = {}): Record<string, any> {
        const attrsFromProps = typeof this.props.inputAttributes === 'object' && this.props.inputAttributes
            ? (this.props.inputAttributes as Record<string, any>)
            : {};

        const base = {
            name: typeof this.props.name === 'string' ? this.props.name : undefined,
            autocomplete: typeof this.props.autocomplete === 'string' ? this.props.autocomplete : undefined,
            inputmode: typeof this.props.inputMode === 'string' ? this.props.inputMode : undefined,
        } satisfies Record<string, any>;

        return {
            ...base,
            ...this.inputAttributes(),
            ...overrides,
            ...attrsFromProps,
        };
    }

    protected commitValue(next: T | null, options: { markTouched?: boolean; validate?: boolean } = {}): void {
        const { markTouched = true, validate = true } = options;
        const s = this.state();
        s.value = next;
        if (markTouched && !s.touched) s.touched = true;
        if (validate) this.runValidation();
    }

    protected shouldSkipValidation(): boolean {
        return this.state().validationEnabled === false;
    }

    protected view() {
        const s = this.state();
        this.applyHostClasses(this.collectHostClasses());

        const inputClass = this.inputClass();

        // aria
        const ariaInvalid = s.valid === false ? 'true' : undefined;
        const ariaRequired = s.required ? 'true' : undefined;
        const inputId = this.id();
        const helperId = this.subId('help');
        const helperContent = this.helperContent();
        const ariaDescribedBy = helperContent ? helperId : undefined;

        const mergedInputAttrs = this.buildInputAttributes();

        this._pendingInputAttrs = mergedInputAttrs;

        // handlers
        const onInput = (ev: Event) => {
            const raw = (ev.target as HTMLInputElement).value ?? '';
            const next = this.fromDom(raw);
            this.commitValue(next);
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
        const labelInline = this.renderLabel('inline', inputId);
        const labelFloating = this.renderLabel('floating', inputId);
        const helper = this.renderHelper(helperId, helperContent);

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

    protected override afterMount(): void {
        super.afterMount();
        this._validationUnsub = this.state().on('validationEnabled', () => this.runValidation(), { immediate: true });
    }

    protected override beforeUnmount(): void {
        this._validationUnsub?.();
        this._validationUnsub = null;
        super.beforeUnmount();
    }

    protected runValidation(): void {
        const s = this.state();
        if (this.shouldSkipValidation()) {
            s.valid = null;
            s.invalidMessage = null;
            return;
        }

        const res = this.validate(s.value);
        if (!res) {
            if (!s.touched) s.valid = null;
            return;
        }

        s.valid = !!res.valid;
        s.invalidMessage = res.valid ? null : (res.message ?? 'Invalid value');
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

    protected inputAttributes(): Record<string, any> { return {}; }

    private renderLabel(mode: 'inline' | 'floating', inputId: string) {
        const s = this.state();
        if (!s.label || s.labelMode !== mode) return null;
        const className = mode === 'inline' ? 'label-text' : 'input-floating-label';
        return html`<label class=${className} for=${inputId}>${s.label}</label>`;
    }

    private renderHelper(helperId: string, helperContent: string | null) {
        if (!helperContent) return null;
        return html`<div id=${helperId} class="mt-1 text-xs opacity-80">${helperContent}</div>`;
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
