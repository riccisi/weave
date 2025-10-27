/**
 * Base props shared by all Weave components.
 * These values are non-reactive configuration inputs provided at construction time.
 */
export interface ComponentProps {
  /**
   * Optional DOM id assigned to the component's host element when it mounts.
   */
  id?: string;

  /**
   * Extra CSS class names appended to the host element in addition to component-managed classes.
   */
  className?: string;

  /**
   * Legacy bag of initial state overrides. When present, matching keys are merged into the
   * component's reactive state during construction. Intended for backwards compatibility only.
   */
  state?: Record<string, any>;
}
