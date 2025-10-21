import type { Layout, LayoutContext } from "./Layout";
import { LayoutRegistry } from "./LayoutRegistry";

/** Orientamento del layout Join */
export type JoinOrientation = "horizontal" | "vertical";

export interface JoinLayoutOptions {
    orientation?: JoinOrientation; // default: 'horizontal'
    /** Classe extra da applicare al container join (rounded, shadow, ecc.) */
    className?: string;
    /**
     * Se true, prova ad applicare 'join-item' su un target interno dei figli:
     * usa c.joinTarget()?.classList.add('join-item'); altrimenti host.
     */
    deepTarget?: boolean;
}

/** JoinLayout: applica classi FlyonUI 'join' e 'join-item' ai figli */
export class JoinLayout implements Layout {
    private readonly orientation: JoinOrientation;
    private readonly className?: string;
    private readonly deepTarget: boolean;

    constructor(opts: JoinLayoutOptions = {}) {
        this.orientation = opts.orientation ?? "horizontal";
        this.className = opts.className;
        this.deepTarget = !!opts.deepTarget;
    }

    apply(ctx: LayoutContext): void {
        const { host, children } = ctx;

        host.classList.add("join");
        host.classList.toggle("join-vertical", this.orientation === "vertical");
        host.classList.toggle("join-horizontal", this.orientation !== "vertical");
        if (this.className) {
            this.className.split(/\s+/).forEach(c => c && host.classList.add(c));
        }

        console.log(children.map(c => c.el()))

        // Assicura 'join-item' sui figli (host o joinTarget)
        for (const c of children) {
            const target =
                this.deepTarget && typeof (c as any).joinTarget === "function"
                    ? (c as any).joinTarget() as HTMLElement | null
                    : c.el();
            target?.classList.add("join-item");
        }
    }

    dispose(ctx: LayoutContext): void {
        const { host, children } = ctx;
        host.classList.remove("join", "join-vertical", "join-horizontal");
        if (this.className) {
            this.className.split(/\s+/).forEach(c => c && host.classList.remove(c));
        }
        for (const c of children) {
            c.el()?.classList.remove("join-item");
            if (this.deepTarget && typeof (c as any).joinTarget === "function") {
                (c as any).joinTarget()?.classList.remove("join-item");
            }
        }
    }
}

// auto-register on import
LayoutRegistry.register("join", JoinLayout);
