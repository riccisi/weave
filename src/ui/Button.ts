// src/ui/Button.ts
import { html } from "uhtml";
import { Component, StateInit } from "./Component";
import { ComponentRegistry } from "./Registry";

/** Palette FlyonUI supportata come classi `btn-{color}`. */
type FlyonColor =
    | "default" | "primary" | "secondary" | "accent"
    | "info" | "success" | "warning" | "error";

/** Variante visiva (vedi docs: solid/soft/outline/text/gradient). */
type Variant = "solid" | "soft" | "outline" | "text" | "gradient";

/** Taglie (vedi docs: btn-xs/sm/(md)/lg/xl). */
type Size = "xs" | "sm" | "md" | "lg" | "xl";

/** Forme aggiuntive (btn-circle/square, pill = rounded-full). */
type Shape = "rounded" | "pill" | "circle" | "square";

export interface ButtonState {
    /** Testo mostrato nel bottone (se vuoto + icon-only → ariaLabel consigliata). */
    text: string;
    /** Disabilita il bottone (HTML + stile). */
    disabled: boolean;
    /** Variante visiva FlyonUI. */
    variant: Variant;
    /** Colore semantico FlyonUI (o customColor per CSS var). */
    color: FlyonColor;
    /** Taglia. */
    size: Size;
    /** Larghezza extra orizzontale. */
    wide: boolean;
    /** Full width del container. */
    block: boolean;
    /** Effetto vetro. */
    glass: boolean;
    /** Stato “attivo” forzato. */
    active: boolean;
    /** Spinner di caricamento inline. */
    loading: boolean;
    /** Forma (rounded default). */
    shape: Shape;

    /** Classe icona a sinistra (es: 'icon-[tabler--star] size-4.5'). */
    iconLeft: string | null;
    /** Classe icona a destra. */
    iconRight: string | null;

    /** Colore custom via CSS var --btn-color (es: '#1877F2'). */
    customColor: string | null;

    /** Solo per DX: deprecato — mappato a `color`. */
    kind?: "primary" | "secondary" | "neutral";
}

export class Button extends Component<ButtonState> {
    static wtype = "button";

    protected stateInit: StateInit = {
        text: "Button",
        disabled: false,
        variant: "solid",
        color: "default",
        size: "md",
        wide: false,
        block: false,
        glass: false,
        active: false,
        loading: false,
        shape: "rounded",
        iconLeft: null,
        iconRight: null,
        customColor: null,
    };

    protected willMount(): void {
        // Back-compat: se l’utente ha usato "kind" (vecchio), mapparlo su color
        const s = this.state();
        const k = this.props.kind as ButtonState["kind"] | undefined;
        if (k) {
            // "neutral" non esiste in FlyonUI → trasformo in "default"
            s.color = k === "neutral" ? "default" : (k as FlyonColor);
        }
    }

    protected view() {
        const s = this.state();

        // Base + variante
        const classes = new Set<string>(["btn"]);
        switch (s.variant) {
            case "soft":     classes.add("btn-soft"); break;
            case "outline":  classes.add("btn-outline"); break;
            case "text":     classes.add("btn-text"); break;
            case "gradient": classes.add("btn-gradient"); break;
            case "solid":
            default: break; // solo 'btn'
        }

        // Colore: se flyon-color noto → classe, altrimenti usa --btn-color
        const KNOWN: Record<FlyonColor, string | null> = {
            default: null,
            primary: "btn-primary",
            secondary: "btn-secondary",
            accent: "btn-accent",
            info: "btn-info",
            success: "btn-success",
            warning: "btn-warning",
            error: "btn-error",
        };
        const colorClass = KNOWN[s.color as FlyonColor];
        if (colorClass) classes.add(colorClass);

        // Size
        if (s.size !== "md") classes.add(`btn-${s.size}`);

        // Shape
        if (s.shape === "pill") classes.add("rounded-full");
        if (s.shape === "circle") classes.add("btn-circle");
        if (s.shape === "square") classes.add("btn-square");

        // Modificatori layout
        if (s.wide) classes.add("btn-wide");     // extra padding X
        if (s.block) classes.add("btn-block");   // full width
        if (s.glass) classes.add("glass");       // effetto vetro

        // Stati
        if (s.active) classes.add("btn-active");     // forza stato attivo
        if (s.disabled) classes.add("btn-disabled"); // forza stile disabilitato

        // Waves (plugin opzionale) — vedi sezione “Wave effect button”
        // https://flyonui.com/docs/components/button/ (classi: waves, waves-light / waves-primary, ...)
        const waves = this.props.waves as boolean | undefined;
        const wavesTone = (this.props.wavesTone as string | undefined) ?? "light";
        if (waves) {
            classes.add("waves");
            if (wavesTone) classes.add(`waves-${wavesTone}`);
        }

        // Custom color via CSS variable (vedi esempi con [--btn-color:#…] nelle Icon buttons).
        // https://flyonui.com/docs/components/button/ (usa [--btn-color:…] + colore testo opzionale)
        const style: Record<string, string> = {};
        const custom = s.customColor ?? (this.props.customColor as string | undefined) ?? null;
        if (!colorClass && custom) {
            style["--btn-color"] = custom;
            // Nota: se vuoi testo chiaro: aggiungi 'text-white' via props.className
        }

        // Merge eventuale className extra lato props
        const extra = typeof this.props.className === "string" ? this.props.className : "";
        const classAttr = [...classes].join(" ") + (extra ? ` ${extra}` : "");

        // Accessibilità
        const ariaLabel: string | undefined =
            (this.props.ariaLabel as string | undefined) ||
            (s.text ? undefined : "Button"); // se icon-only e niente label, fallback

        // Handler click
        const onClick = this.props.onClick as ((btn: Button, ev: MouseEvent) => void) | undefined;

        // Spinner loading (docs: <span class="loading loading-spinner"></span>)
        const spinner = s.loading ? html`<span class="loading loading-spinner"></span>` : null;

        // Icone opzionali
        const leftIcon = s.iconLeft ? html`<span class=${s.iconLeft}></span>` : null;
        const rightIcon = s.iconRight ? html`<span class=${s.iconRight}></span>` : null;

        // Disabilitazione HTML: includi loading (non cliccabile durante il caricamento)
        const isDisabled = s.disabled || s.loading;

        return html`
      <button
        class=${classAttr}
        ?disabled=${isDisabled}
        aria-busy=${s.loading ? "true" : undefined}
        aria-label=${ariaLabel}
        style=${Object.entries(style).map(([k, v]) => `${k}:${v}`).join(";")}
        onclick=${(ev: MouseEvent) => onClick?.(this, ev)}
      >
        ${leftIcon} ${spinner} ${s.text} ${rightIcon}
      </button>
    `;
    }
}

// AUTO-REGISTER all’import
ComponentRegistry.registerClass(Button);
