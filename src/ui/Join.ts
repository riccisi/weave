import type { ComponentConfig } from './Component';
import { Container, type ContainerProps, type ContainerState } from './Container';
import { joinLayout } from './layouts/JoinLayout';

export type JoinOrientation = 'horizontal' | 'vertical';

/**
 * Non-reactive props for the join container helper.
 */
export interface JoinProps extends ContainerProps {
  orientation?: JoinOrientation;
  rounded?: string;
  shadow?: boolean;
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
      rounded,
      shadow,
      ...rest
    } = cfg as ComponentConfig<S, JoinProps>;

    if (layout) {
      throw new Error('Join does not accept a custom layout; it always uses the join layout.');
    }

    super({
      ...(rest as ComponentConfig<S, JoinProps>),
      orientation,
      rounded,
      shadow,
      layout: joinLayout({ orientation, rounded, shadow })
    });
  }

  protected idPrefix(): string {
    return 'join';
  }
}

export function join(
  cfg: ComponentConfig<ContainerState, JoinProps> = {}
): Join {
  return new Join(cfg);
}
