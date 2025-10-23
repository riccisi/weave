// src/ui/inputs/Checkbox.ts
import { html } from 'uhtml';

import { BaseInput, type InputSize, type LabelMode } from './BaseInput';
import { ComponentRegistry } from '../Registry';

type CheckboxColor =
    | 'default' | 'primary' | 'secondary' | 'accent'
    | 'info' | 'success' | 'warning' | 'error';

type CheckboxShape = 'square' | 'circle';

type LabelPlacement = 'left' | 'right';

export interface CheckboxState {
    color: CheckboxColor;
    shape: CheckboxShape;
    bordered: boolean;
    labelPlacement: LabelPlacement;
    indeterminate: boolean;
}

const COLOR_CLASS: Record<CheckboxColor, string | null> = {
    default: null,
    primary: 'checkbox-primary',
    secondary: 'checkbox-secondary',
    accent: 'checkbox-accent',
    info: 'checkbox-info',
    success: 'checkbox-success',
    warning: 'checkbox-warning',
    error: 'checkbox-error',
};

const SIZE_CLASS: Partial<Record<InputSize, string | null>> = {
    xs: 'checkbox-xs',
    sm: 'checkbox-sm',
    md: null,
    lg: 'checkbox-lg',
    xl: 'checkbox-xl',
};

const LABEL_MODE_TO_PLACEMENT: Record<LabelMode, LabelPlacement> = {
    none: 'right',
    inline: 'right',
    floating: 'right',
};

export class Checkbox extends BaseInput<boolean, CheckboxState> {
    static wtype = 'checkbox';

    protected override extraStateInit(): CheckboxState {
        return {
            color: 'default',
            shape: 'square',
            bordered: false,
            labelPlacement: 'right',
            indeterminate: false,
        } satisfies CheckboxState;
    }

    protected override beforeMount(): void {
        super.beforeMount();
        const s = this.state();
        if (s.value === null) s.value = false;
    }

    protected override inputType(): string { return 'checkbox'; }
    protected override toDom(v: boolean | null): string { return v ? 'on' : ''; }
    protected override fromDom(raw: string): boolean | null { return raw === 'on'; }

    protected override view() {
        const s = this.state();
        const host = this.el();

        // --- host classes -----------------------------------------------------
        const hostClasses = new Set<string>();
        const extra = typeof this.props.className === 'string'
            ? this.props.className.split(/\s+/).filter(Boolean)
            : [];
        for (const c of extra) hostClasses.add(c);
        for (const c of this._appliedHostClasses) host.classList.remove(c);
        for (const c of hostClasses) host.classList.add(c);
        this._appliedHostClasses = hostClasses;

        // --- checkbox classes -------------------------------------------------
        const checkboxClasses = new Set<string>(['checkbox']);
        const sizeCls = SIZE_CLASS[s.size];
        if (sizeCls) checkboxClasses.add(sizeCls);
        const colorCls = COLOR_CLASS[s.color];
        if (colorCls) checkboxClasses.add(colorCls);
        if (s.shape === 'circle') checkboxClasses.add('checkbox-circle');
        if (s.bordered) checkboxClasses.add('checkbox-bordered');
        if (s.valid === true) checkboxClasses.add('is-valid');
        if (s.valid === false) checkboxClasses.add('is-invalid');
        const checkboxClass = Array.from(checkboxClasses).join(' ');

        // --- accessibility ----------------------------------------------------
        const ariaInvalid = s.valid === false ? 'true' : undefined;
        const ariaRequired = s.required ? 'true' : undefined;
        const inputId = this.id();
        const helperId = this.subId('help');
        const helperContent = s.valid === false && s.invalidMessage
            ? s.invalidMessage
            : s.helperText;
        const ariaDescribedBy = helperContent ? helperId : undefined;

        // --- merge input attributes ------------------------------------------
        const mergedInputAttrs = {
            name: typeof this.props.name === 'string' ? this.props.name : undefined,
            autocomplete: typeof this.props.autocomplete === 'string' ? this.props.autocomplete : undefined,
            ...this.inputAttributes(),
            ...(typeof this.props.inputAttributes === 'object' && this.props.inputAttributes
                ? this.props.inputAttributes as Record<string, any>
                : {}),
        } as Record<string, any>;
        this._pendingInputAttrs = mergedInputAttrs;

        // --- events -----------------------------------------------------------
        const updateFrom = (input: HTMLInputElement) => {
            const next = !!input.checked;
            s.value = next;
            if (s.indeterminate && input.indeterminate) {
                input.indeterminate = false;
            }
            s.indeterminate = input.indeterminate && !next;
            if (!s.touched) s.touched = true;
            this.runValidation();
        };

        const onInput = (ev: Event) => {
            const target = ev.target as HTMLInputElement | null;
            if (!target) return;
            updateFrom(target);
            (this.props.onInput as ((cmp: this, ev: Event) => void) | undefined)?.(this, ev);
        };

        const onChange = (ev: Event) => {
            const target = ev.target as HTMLInputElement | null;
            if (!target) return;
            updateFrom(target);
            (this.props.onChange as ((cmp: this, ev: Event) => void) | undefined)?.(this, ev);
        };

        // --- label & helper ---------------------------------------------------
        const effectivePlacement = s.labelPlacement || LABEL_MODE_TO_PLACEMENT[s.labelMode];
        const showLabel = s.label && s.labelMode !== 'none';
        const labelContent = showLabel ? html`<span class="label-text">${s.label}</span>` : null;
        const helper = helperContent
            ? html`<div id=${helperId} class="mt-1 text-xs opacity-80">${helperContent}</div>`
            : null;

        const labelClasses = ['label', 'cursor-pointer', 'gap-2'];
        if (s.size === 'xs') labelClasses.push('text-xs');
        else if (s.size === 'sm') labelClasses.push('text-sm');

        return html`
      <label class=${labelClasses.join(' ')} for=${inputId}>
        ${effectivePlacement === 'left' ? labelContent : null}
        <input
          id=${inputId}
          class=${checkboxClass}
          type="checkbox"
          ?checked=${!!s.value}
          .indeterminate=${!!s.indeterminate && !s.value}
          ?readonly=${s.readonly}
          ?required=${s.required}
          aria-invalid=${ariaInvalid}
          aria-required=${ariaRequired}
          aria-describedby=${ariaDescribedBy}
          oninput=${onInput}
          onchange=${onChange}
        />
        ${effectivePlacement === 'right' ? labelContent : null}
      </label>
      ${helper}
    `;
    }

    protected override validate(v: boolean | null) {
        const s = this.state();
        if (s.required && !v) {
            return { valid: false, message: 'Required' };
        }
        return { valid: true };
    }
}

ComponentRegistry.registerClass(Checkbox);
