// API di base per i layout

import type { Component } from "../Component";
import type { State } from "../../state/State";

export interface LayoutContext {
    /** Nodo host del container */
    host: HTMLElement;
    /** Figli (istanze component) già montati */
    children: Component[];
    /** Stato ereditato dal container */
    state: State;
    /** Props (config flat) del container */
    props: Record<string, any>;
}

export interface Layout {
    /** Applicazione/aggiornamento del layout (idempotente) */
    apply(ctx: LayoutContext): void;
    /** Cleanup opzionale quando il container si smonta o cambia layout */
    dispose?(ctx: LayoutContext): void;
}

// Config dichiarativa lato utente, risolta via LayoutRegistry
export type LayoutConfig = {
    type: string;
} & Record<string, any>;
