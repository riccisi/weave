import {html, type Hole} from 'uhtml';
import {InteractiveComponent, InteractiveComponentState} from '../InteractiveComponent';
import type {ComponentProps} from '../Component';
import { mergeSchemas } from '../schemaUtils';
import type { ValidationChangeEvent, State } from '../../state/State';
import type { ErrorObject } from 'ajv';

export type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LabelMode = 'none' | 'inline' | 'floating';

export interface ValidationResult {
    valid: boolean;
    message?: string;
}

export interface BaseInputState<T> extends InteractiveComponentState {
    value: T | null;
    readonly: boolean;
    required: boolean;
    size: InputSize;
    placeholder: string | null;
    label: string | null;
    labelMode: LabelMode;
    helperText: string | null;
    touched: boolean;
    valid: boolean | null;
    invalidMessage: string | null;
    validationEnabled: boolean;
    showValidState: boolean;
    schemaInvalid: boolean;
}

/**
 * Non-reactive knobs shared across all input components.
 */
export interface BaseInputProps extends ComponentProps {
    name?: string;
    autocomplete?: string;
    inputMode?: string;
    inputAttributes?: Record<string, any>;
    onInput?: (cmp: BaseInput<any, any>, ev: Event) => void;
    onChange?: (cmp: BaseInput<any, any>, ev: Event) => void;
    onEnter?: (cmp: BaseInput<any, any>, ev: KeyboardEvent) => void;
}

type InputFocusSnapshot = {
    selectionStart: number | null;
    selectionEnd: number | null;
    selectionDirection: 'forward' | 'backward' | 'none' | null;
};

export interface InputEventHandlers {
    onInput: (ev: Event) => void;
    onChange: (ev: Event) => void;
    onKeyDown: (ev: KeyboardEvent) => void;
}

export interface InputControlContext extends InputEventHandlers {
    id: string;
    className: string;
    type: string;
    value: string;
    placeholder: string | null;
    readonly: boolean;
    required: boolean;
    ariaInvalid?: string;
    ariaRequired?: string;
    ariaDescribedBy?: string;
}

export interface InputViewContext {
    hostClassAttr: string | null;
    labelInline: Hole | null;
    labelFloating: Hole | null;
    helper: Hole | null;
    control: InputControlContext;
    mergedInputAttrs: Record<string, any>;
}

export abstract class BaseInput<
    T,
    ExtraState extends object = Record<string, never>
> extends InteractiveComponent<BaseInputState<T> & ExtraState, BaseInputProps> {
    protected _pendingInputAttrs: Record<string, any> = {};
    protected _appliedInputAttrKeys = new Set<string>();
    private _validationUnsub: (() => void) | null = null;
    private _validationChangeUnsub: (() => void) | null = null;
    private _boundField: string | null = null;
    private _boundValidationPath: string | null = null;

    protected override schema(): Record<string, any> {
        const schema = mergeSchemas(super.schema(), {
            properties: {
                value: { default: null },
                readonly: { type: 'boolean', default: false },
                required: { type: 'boolean', default: false },
                size: { type: 'string', default: 'md' },
                placeholder: { type: ['string', 'null'], default: null },
                label: { type: ['string', 'null'], default: null },
                labelMode: { type: 'string', default: 'inline' },
                helperText: { type: ['string', 'null'], default: null },
                touched: { type: 'boolean', default: false },
                valid: { type: ['boolean', 'null'], default: null },
                invalidMessage: { type: ['string', 'null'], default: null },
                validationEnabled: { type: 'boolean', default: true },
                showValidState: { type: 'boolean', default: false },
                schemaInvalid: { type: 'boolean', default: false }
            }
        });
        return schema;
    }

    protected abstract inputType(): string;

    protected abstract toDom(v: T | null): string;

    protected abstract fromDom(raw: string): T | null;

    protected validate(_v: T | null): ValidationResult | null {
        return null;
    }

    protected defaultHostClasses(): string[] {
        const s = this.state();
        const classes = ['w-full', 'min-w-0'];
        if (s.labelMode === 'floating') classes.push('input-floating');
        return classes;
    }

    protected hostClassTokens(
        ...additional: Array<string | false | null | undefined | Iterable<string | false | null | undefined>>
    ): Set<string> {
        const tokens = new Set<string>();
        const push = (value: string | false | null | undefined) => {
            if (!value) return;
            const trimmed = value.trim();
            if (trimmed) tokens.add(trimmed);
        };
        const process = (
            value: string | false | null | undefined | Iterable<string | false | null | undefined>
        ) => {
            if (!value) return;
            if (typeof value === 'string') {
                push(value);
                return;
            }
            if (typeof value === 'object' && value && Symbol.iterator in value) {
                for (const item of value as Iterable<string | false | null | undefined>) {
                    push(item);
                }
                return;
            }
            push(value as string | false | null | undefined);
        };

        for (const base of this.defaultHostClasses()) push(base);
        for (const extra of additional) process(extra);
        return tokens;
    }

    protected subId(part: string): string {
        const suffix = part?.trim().length ? part.trim().replace(/\s+/g, '-') : 'sub';
        return `${this.id()}__${suffix}`;
    }

    protected inputElement(): HTMLInputElement | null {
        const host = this.el();
        if (!host) return null;
        const input = host.querySelector('input');
        return input instanceof HTMLInputElement ? input : null;
    }

    protected defaultInputClasses(): string[] {
        const s = this.state();
        const classes = ['input'];
        if (s.size !== 'md') classes.push(`input-${s.size}`);
        const validationActive = s.validationEnabled !== false;
        if (validationActive && s.showValidState && s.valid === true && !s.schemaInvalid) {
            classes.push('is-valid');
        }
        if (validationActive && (s.valid === false || s.schemaInvalid)) {
            classes.push('is-invalid');
        }
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
        if ((s.valid === false || s.schemaInvalid) && s.invalidMessage) return s.invalidMessage;
        return s.helperText ?? null;
    }

    protected buildInputAttributes(overrides: Record<string, any> = {}): Record<string, any> {
        const props = this.props();
        const attrsFromProps =
            typeof props.inputAttributes === 'object' && props.inputAttributes
                ? props.inputAttributes
                : {};

        const base = {
            name: props.name,
            autocomplete: props.autocomplete,
            inputmode: props.inputMode
        } satisfies Record<string, any>;

        return {
            ...base,
            ...this.inputAttributes(),
            ...overrides,
            ...attrsFromProps
        };
    }

    protected commitValue(next: T | null, options: { markTouched?: boolean; validate?: boolean } = {}): void {
        const {markTouched = true, validate = true} = options;
        const s = this.state();
        s.value = next;
        if (markTouched && !s.touched) s.touched = true;
        if (validate) this.runValidation();
    }

    private handleValidationChange(evt: ValidationChangeEvent): void {
        if (!this._boundValidationPath) return;
        const entry = evt.errors.find(e => e.path === this._boundValidationPath);
        this.updateSchemaValidationState(entry?.errors);
    }

    private bindValidationChangeListener(): void {
        this._validationChangeUnsub?.();
        this._boundValidationPath = null;

        const { state, path } = this.resolveValidationSource();
        this._boundValidationPath = path;
        this._validationChangeUnsub = state.onValidationChange((evt) => this.handleValidationChange(evt));
        this.applyInitialValidationState(state, path);
    }

    private resolveValidationSource(): { state: State<any>, path: string } {
        const bound = this._boundField ?? 'value';
        const currentState = this.state() as unknown as State<any>;
        try {
            if (typeof (currentState as any).attribute === 'function') {
                const attr = (currentState as any).attribute(bound);
                const owner = attr?.__ownerState as State<any> | undefined;
                const key = attr?.__ownerKey as string | undefined;
                if (owner && key) {
                    return { state: owner, path: bound };
                }
            }
        } catch {
            // ignore resolution issues, fall back to component state
        }
        return { state: currentState, path: bound };
    }

    private applyInitialValidationState(state: State<any>, path: string): void {
        const existing = state.schemaErrors(path);
        if (Array.isArray(existing) && existing.length > 0) {
            this.updateSchemaValidationState(existing);
        } else if (existing === undefined) {
            this.updateSchemaValidationState(null);
        }
    }

    private updateSchemaValidationState(errors?: ErrorObject[] | null): void {
        const s = this.state();
        if (errors && errors.length > 0) {
            s.schemaInvalid = true;
            s.invalidMessage = errors[0]?.message ?? s.invalidMessage;
        } else {
            s.schemaInvalid = false;
            if (s.valid !== false) s.invalidMessage = null;
        }
    }

    protected shouldSkipValidation(): boolean {
        return this.state().validationEnabled === false;
    }

    protected override view() {
        const ctx = this.buildViewContext();
        const content = this.renderContent(ctx);
        return this.renderWrapper(content, ctx);
    }

    protected override doRender(): void {
        const focusSnapshot = this.captureInputFocus();
        super.doRender();
        this.applyDynamicInputAttributes();
        this.restoreInputFocus(focusSnapshot);
    }

    protected override afterMount(): void {
        super.afterMount();
        this._validationUnsub = this.state().on('validationEnabled', () => this.runValidation(), {immediate: true});
        this._boundField = this.resolveBoundField();
        this.bindValidationChangeListener();
    }

    protected override beforeUnmount(): void {
        this._validationUnsub?.();
        this._validationUnsub = null;
        this._validationChangeUnsub?.();
        this._validationChangeUnsub = null;
        super.beforeUnmount();
    }

    protected resolveBoundField(): string | null {
        const cfg: any = this.initialConfig();
        const binding = cfg?.value ?? cfg?.state?.value;
        if (typeof binding === 'string' && binding.startsWith('{') && binding.endsWith('}')) {
            const inner = binding.slice(1, -1).trim();
            return inner.replace(/^state\./, '');
        }
        return 'value';
    }

    protected renderContent(ctx: InputViewContext): Hole {
        return html`
            ${ctx.labelInline}
            ${this.renderControl(ctx.control)}
            ${ctx.labelFloating}
            ${ctx.helper}
        `;
    }

    protected renderWrapper(content: Hole, ctx: InputViewContext): Hole {
        return html`<div class=${ctx.hostClassAttr ?? null}>${content}</div>`;
    }

    protected renderControl(ctx: InputControlContext): Hole {
        return html`
            <input
                id=${ctx.id}
                class=${ctx.className}
                type=${ctx.type}
                .value=${ctx.value}
                placeholder=${ctx.placeholder ?? ''}
                ?readonly=${ctx.readonly}
                ?required=${ctx.required}
                aria-invalid=${ctx.ariaInvalid}
                aria-required=${ctx.ariaRequired}
                aria-describedby=${ctx.ariaDescribedBy}
                oninput=${ctx.onInput}
                onchange=${ctx.onChange}
                onkeydown=${ctx.onKeyDown}
            />
        `;
    }

    protected controlEventHandlers(): InputEventHandlers {
        return {
            onInput: (ev: Event) => {
                const raw = (ev.target as HTMLInputElement).value ?? '';
                const next = this.fromDom(raw);
                this.commitValue(next);
                this.props().onInput?.(this, ev);
            },
            onChange: (ev: Event) => {
                this.props().onChange?.(this, ev);
            },
            onKeyDown: (ev: KeyboardEvent) => {
                if (ev.key === 'Enter') {
                    this.props().onEnter?.(this, ev);
                }
            }
        };
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

    private buildViewContext(): InputViewContext {
        const s = this.state();
        const hostClasses = Array.from(this.hostClassTokens());
        const hostClassAttr = hostClasses.length ? hostClasses.join(' ') : null;
        const inputClass = this.inputClass();

        const validationActive = s.validationEnabled !== false;
        const ariaInvalid = validationActive && s.valid === false ? 'true' : undefined;
        const ariaRequired = s.required ? 'true' : undefined;
        const inputId = this.subId('input');
        const helperId = this.subId('help');
        const helperContent = this.helperContent();
        const ariaDescribedBy = helperContent ? helperId : undefined;

        const mergedInputAttrs = this.buildInputAttributes();
        this._pendingInputAttrs = mergedInputAttrs;

        const handlers = this.controlEventHandlers();

        const control: InputControlContext = {
            id: inputId,
            className: inputClass,
            type: this.inputType(),
            value: this.toDom(s.value),
            placeholder: s.placeholder ?? '',
            readonly: s.readonly,
            required: s.required,
            ariaInvalid,
            ariaRequired,
            ariaDescribedBy,
            ...handlers
        };

        return {
            hostClassAttr,
            labelInline: this.renderLabel('inline', inputId),
            labelFloating: this.renderLabel('floating', inputId),
            helper: this.renderHelper(helperId, helperContent),
            control,
            mergedInputAttrs
        };
    }

    protected override applyDisabled(): void {
        super.applyDisabled();

        const input = this.inputElement();
        if (!input) return;

        const disabled = this._lastEffectiveDisabled;
        input.toggleAttribute('disabled', disabled);
        input.disabled = disabled;
    }

    protected inputAttributes(): Record<string, any> {
        return {};
    }

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
        const input = this.inputElement();
        if (!input) return;

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

    private captureInputFocus(): InputFocusSnapshot | null {
        const input = this.inputElement();
        if (!input) return null;
        if (document.activeElement !== input) return null;
        try {
            return {
                selectionStart: input.selectionStart,
                selectionEnd: input.selectionEnd,
                selectionDirection: input.selectionDirection
            };
        } catch {
            return {selectionStart: null, selectionEnd: null, selectionDirection: null};
        }
    }

    private restoreInputFocus(snapshot: InputFocusSnapshot | null): void {
        if (!snapshot) return;
        const input = this.inputElement();
        if (!input) return;
        input.focus();
        try {
            const start = snapshot.selectionStart ?? input.value.length;
            const end = snapshot.selectionEnd ?? input.value.length;
            const dir = snapshot.selectionDirection ?? undefined;
            input.setSelectionRange(start, end, dir);
        } catch {
            // Some input types don't support selection; swallow errors.
        }
    }
}
