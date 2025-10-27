import type { ComponentConfig } from './Component';
import { Container, type ContainerProps, type ContainerState } from './Container';
import type { LayoutConfig } from './layouts/Layout';

export type JoinOrientation = 'horizontal' | 'vertical';

/**
 * Non-reactive props for the join container helper.
 */
export interface JoinProps extends ContainerProps {
  orientation?: JoinOrientation;
  joinClassName?: string;
  deepTarget?: boolean;
}

/**
 * Container preconfigured to apply the FlyonUI `join` layout to its children.
 */
export class Join<
  S extends ContainerState = ContainerState
> extends Container<S, JoinProps> {
  constructor(cfg: ComponentConfig<S, JoinProps> = {} as ComponentConfig<S, JoinProps>) {
    const {
      layout,
      orientation = 'horizontal',
      joinClassName,
      deepTarget,
      ...rest
    } = cfg as ComponentConfig<S, JoinProps>;

    if (layout) {
      throw new Error('Join does not accept a custom layout; it always uses the join layout.');
    }

    const layoutConfig: LayoutConfig = {
      type: 'join',
      orientation,
      className: joinClassName,
      deepTarget
    } as LayoutConfig;

    super({
      ...(rest as ComponentConfig<S, JoinProps>),
      orientation,
      joinClassName,
      deepTarget,
      layout: layoutConfig
    });
  }
}

export function join(
  cfg: ComponentConfig<ContainerState, JoinProps> = {}
): Join {
  return new Join(cfg);
}
