import { html } from 'uhtml';
import {
  InteractiveComponent,
  type InteractiveState
} from '../InteractiveComponent';

export type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LabelMode = 'none' | 'inline' | 'floating';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface BaseInputState<T> extends InteractiveState {
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
}

export interface BaseInputProps {
  name?: string;
  autocomplete?: string;
  inputMode?: string;
  inputAttributes?: Record<string, any>;
  onInput?: (cmp: BaseInput<any, any>, ev: Event) => void;
  onChange?: (cmp: BaseInput<any, any>, ev: Event) => void;
  onEnter?: (cmp: BaseInput<any, any>, ev: KeyboardEvent) => void;
  className?: string;
}

export abstract class BaseInput<
  T,
  ExtraState extends object = Record<string, never>
> extends InteractiveComponent<BaseInputState<T> & ExtraState> {
  protected _pendingInputAttrs: Record<string, any> = {};
  protected _appliedInputAttrKeys = new Set<string>();
  private _validationUnsub: (() => void) | null = null;

  protected applyIdToHost = false;

  protected override initialState(): BaseInputState<T> & ExtraState {
    return {
      ...(super.initialState() as InteractiveState),
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
      ...(this.extraInitialState() as ExtraState)
    } as BaseInputState<T> & ExtraState;
  }

  protected extraInitialState(): ExtraState {
    return {} as ExtraState;
  }

  protected hostTag(): string { return 'div'; }

  protected idPrefix(): string { return 'input'; }

  protected abstract inputType(): string;

  protected abstract toDom(v: T | null): string;
  protected abstract fromDom(raw: string): T | null;

  protected validate(_v: T | null): ValidationResult | null { return null; }

  protected defaultHostClasses(): string[] {
    const s = this.state();
    return s.labelMode === 'floating' ? ['input-floating'] : [];
  }

  protected hostClassTokens(
    ...additional: Array<string | false | null | undefined | Iterable<string | false | null | undefined>>
  ): Set<string> {
    return this.hostClasses(this.defaultHostClasses(), additional);
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
    const attrsFromProps =
      typeof this.props.inputAttributes === 'object' && this.props.inputAttributes
        ? this.props.inputAttributes
        : {};

    const base = {
      name: this.props.name,
      autocomplete: this.props.autocomplete,
      inputmode: this.props.inputMode
    } satisfies Record<string, any>;

    return {
      ...base,
      ...this.inputAttributes(),
      ...overrides,
      ...attrsFromProps
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

  protected override view() {
    const s = this.state();
    this.syncHostClasses(this.hostClassTokens());

    const inputClass = this.inputClass();

    const ariaInvalid = s.valid === false ? 'true' : undefined;
    const ariaRequired = s.required ? 'true' : undefined;
    const inputId = this.id();
    const helperId = this.subId('help');
    const helperContent = this.helperContent();
    const ariaDescribedBy = helperContent ? helperId : undefined;

    const mergedInputAttrs = this.buildInputAttributes();

    this._pendingInputAttrs = mergedInputAttrs;

    const onInput = (ev: Event) => {
      const raw = (ev.target as HTMLInputElement).value ?? '';
      const next = this.fromDom(raw);
      this.commitValue(next);
      (this.props as BaseInputProps).onInput?.(this, ev);
    };
    const onChange = (ev: Event) => {
      (this.props as BaseInputProps).onChange?.(this, ev);
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') {
        (this.props as BaseInputProps).onEnter?.(this, ev);
      }
    };

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

  protected override applyDisabled(): void {
    super.applyDisabled();

    const input = this.el().querySelector('input');
    if (!(input instanceof HTMLInputElement)) return;

    const disabled = this._lastEffectiveDisabled;
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
