// src/ui/InteractiveComponent.ts
import { Component, type ComponentProps, type ComponentState } from './Component';

/**
 * Stato reattivo per componenti interattivi.
 */
export interface InteractiveComponentState extends ComponentState {
    /** Disabilita il componente (visivamente e come input). */
    disabled: boolean;
    /**
     * Se true insieme a disabled, cerca di rimuovere il componente
     * dal focus tree / a11y (es. inert, aria-disabled).
     */
    disabledInert: boolean;
}

/**
 * Base class per componenti “disabilitabili”.
 * - Non muta mai state().disabled quando forzato dal parent.
 * - Applica attributi ARIA/inert in modo imperativo (no re-render).
 */
export abstract class InteractiveComponent<
    S extends InteractiveComponentState = InteractiveComponentState,
    P extends ComponentProps = ComponentProps
> extends Component<S, P> {

    /** Stato forzato dall’antenato (Container, ecc.). */
    private _forcedDisabledFromAncestor = false;

    /** Ultimo valore di disabled effettivo (forzato || locale). */
    protected _lastEffectiveDisabled = false;

    /** Merge dei default di Component con i flag di disabled. */
    protected override initialState(): S {
        return {
            ...(super.initialState() as ComponentState),
            disabled: false,
            disabledInert: false,
        } as S;
    }

    /**
     * Forza il disabled (senza toccare state().disabled) e applica gli attributi.
     */
    public setDisabledFromParent(flag: boolean): void {
        this._forcedDisabledFromAncestor = flag;
        this.applyDisabled();
    }

    /**
     * Calcola il disabled effettivo e sincronizza attributi ARIA/inert sull’host.
     * Le subclass (es. Button) possono estendere per aggiungere classi/attributi nativi.
     */
    protected applyDisabled(): void {
        const host = this.el();
        if (!host) return;

        const st = this.state();
        const effective = this._forcedDisabledFromAncestor || !!st.disabled;
        this._lastEffectiveDisabled = effective;

        if (effective) {
            host.setAttribute('aria-disabled', 'true');
            if (st.disabledInert) host.setAttribute('inert', '');
        } else {
            host.removeAttribute('aria-disabled');
            host.removeAttribute('inert');
        }
    }

    /** Getter comodo: disabled effettivo (forzato || locale). */
    public get disabled(): boolean {
        return this._forcedDisabledFromAncestor || !!this.state().disabled;
    }

    /**
     * Installa i watcher su disabled/disabledInert (senza re-render),
     * e applica lo stato subito per riflettere eventuali vincoli del parent.
     * Nota: in questo punto l’host è già stato adottato (nuova architettura).
     */
    protected override beforeMount(): void {
        super.beforeMount();

        // reazione imperativa ai soli cambi “disabled*”
        this._unsubs.push(
            this.state().on('disabled', () => this.applyDisabled(), { immediate: false }),
            this.state().on('disabledInert', () => this.applyDisabled(), { immediate: false }),
        );

        // applica una prima volta lo stato disabilitato (se ereditato/locale)
        this.applyDisabled();
    }

    /**
     * Coalesca i render e, dopo il render, riallinea anche hidden + disabled.
     */
    protected override requestRender(): void {
        if ((this as any)._renderQueued) return;
        (this as any)._renderQueued = true;
        queueMicrotask(() => {
            (this as any)._renderQueued = false;
            this.doRender();
            this.applyHidden();
            this.applyDisabled();
        });
    }
}