import {html, type Hole} from 'uhtml';
import {
    BaseInput,
    type BaseInputProps,
    type BaseInputState,
    type InputControlContext,
    type InputEventHandlers,
    type InputViewContext,
    type LabelMode
} from './BaseInput';

export type ChoiceLabelPlacement = 'left' | 'right';

export interface ChoiceState {
    labelPlacement: ChoiceLabelPlacement;
}

const LABEL_MODE_TO_PLACEMENT: Record<LabelMode, ChoiceLabelPlacement> = {
    none: 'right',
    inline: 'right',
    floating: 'right'
};

/**
 * Intermediate base class for checkbox-like controls that place a label
 * next to the control and share focus/ARIA wiring from BaseInput.
 */
export abstract class ChoiceInput<
    ExtraState extends ChoiceState
> extends BaseInput<boolean, ExtraState> {

    protected override renderWrapper(content: Hole, _ctx: InputViewContext): Hole {
        const tokens = Array.from(this.hostClassTokens('flex', 'items-center', 'gap-1'));
        const className = tokens.length ? tokens.join(' ') : null;
        return html`<div class=${className}>${content}</div>`;
    }

    protected override renderContent(ctx: InputViewContext): Hole {
        const placement = this.resolvePlacement();
        const label = this.renderPlacementLabel(ctx.control.id);
        return html`
            ${placement === 'left' ? label : null}
            ${this.renderControl(ctx.control)}
            ${placement === 'right' ? label : null}
            ${ctx.helper}
        `;
    }

    protected override controlEventHandlers(): InputEventHandlers {
        return {
            onInput: (ev: Event) => {
                const target = ev.target as HTMLInputElement | null;
                if (!target) return;
                this.updateFromInput(target);
                this.props().onInput?.(this, ev);
            },
            onChange: (ev: Event) => {
                const target = ev.target as HTMLInputElement | null;
                if (!target) return;
                this.updateFromInput(target);
                this.props().onChange?.(this, ev);
            },
            onKeyDown: (ev: KeyboardEvent) => {
                if (ev.key === 'Enter') {
                    this.props().onEnter?.(this, ev);
                }
            }
        };
    }

    /**
     * Default bool toggle behaviour; subclasses (Checkbox) can override to
     * account for indeterminate or custom semantics.
     */
    protected updateFromInput(input: HTMLInputElement): void {
        const next = !!input.checked;
        this.commitValue(next);
    }

    protected renderPlacementLabel(controlId: string): Hole | null {
        const s = this.state();
        if (!s.label || s.labelMode === 'none') return null;
        const labelClasses = ['label-text', 'cursor-pointer', this.sizeLabelClass()];
        return html`<label class=${labelClasses.filter(Boolean).join(' ')} for=${controlId}>
            ${s.label}
        </label>`;
    }

    private resolvePlacement(): ChoiceLabelPlacement {
        const s = this.state();
        return s.labelPlacement || LABEL_MODE_TO_PLACEMENT[s.labelMode] || 'right';
    }

    private sizeLabelClass(): string | null {
        const s = this.state();
        switch (s.size) {
            case 'xs': return 'text-xs';
            case 'sm': return 'text-sm';
            case 'lg':
            case 'xl': return 'text-lg';
            default: return 'text-base';
        }
    }
}
