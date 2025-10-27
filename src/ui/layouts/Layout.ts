import type { State } from '../../state/State';
import type { Component, ComponentState } from '../Component';
import type { ComponentProps } from '../types';

/**
 * Context passed to layout strategies describing the container host and children.
 */
export interface LayoutContext<
  S extends ComponentState = ComponentState,
  P extends ComponentProps = ComponentProps
> {
  /** Container host element. */
  host: HTMLElement;
  /** Already-mounted child components rendered inside the container. */
  children: Array<Component<any, any>>;
  /** Reactive state owned by the container. */
  state: State & S;
  /** Non-reactive props supplied to the container. */
  props: P;
}

/**
 * Strategy interface implemented by concrete layouts (grid, join, etc.).
 */
export interface Layout<
  S extends ComponentState = ComponentState,
  P extends ComponentProps = ComponentProps
> {
  /** Apply or update the layout on the host. */
  apply(ctx: LayoutContext<S, P>): void;
  /** Optional cleanup hook when the layout is disposed. */
  dispose?(ctx: LayoutContext<S, P>): void;
}

/**
 * Declarative configuration resolved via {@link LayoutRegistry}.
 */
export type LayoutConfig = {
  type: string;
} & Record<string, any>;
