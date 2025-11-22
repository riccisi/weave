import type {State} from '../../state/State';
import type {Component} from '../Component';

/**
 * Context passed to Layout methods.
 */
export interface LayoutApplyContext {
    /** The DOM element for the Container itself. */
    host: HTMLElement;
    /** The Container's already-mounted children. */
    children: Component[];
    /** The Container state instance (reactive). */
    state: State;
    /** The Container props (non-reactive config). */
    containerProps: Record<string, any>;
}

/**
 * A Layout styles the container and/or positions its children.
 * Implementation detail: Layouts don't render HTML; they mutate classes/styles.
 */
export interface Layout {
    /** Apply layout rules to the container and each child. Called after render. */
    apply(ctx: LayoutApplyContext): void;

    /** Optional cleanup when the container unmounts. */
    dispose?(ctx: LayoutApplyContext): void;
}
