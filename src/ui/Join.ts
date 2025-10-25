import type { ComponentConfig } from './Component';
import { Container, type ContainerProps, type ContainerSchema } from './Container';
import type { LayoutConfig } from './layouts/Layout';

export type JoinOrientation = 'horizontal' | 'vertical';

export interface JoinProps extends ContainerProps {
  orientation?: JoinOrientation;
  joinClassName?: string;
  deepTarget?: boolean;
}

export class Join<
  Schema extends object = ContainerSchema,
  Props extends JoinProps = JoinProps
> extends Container<Schema, Props> {
  constructor(cfg: ComponentConfig<Schema, Props> = {} as ComponentConfig<Schema, Props>) {
    const {
      layout,
      orientation = 'horizontal',
      joinClassName,
      deepTarget,
      ...rest
    } = cfg as ComponentConfig<Schema, JoinProps>;

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
      ...(rest as ComponentConfig<Schema, Props>),
      orientation,
      joinClassName,
      deepTarget,
      layout: layoutConfig
    });
  }
}

export function join(
  cfg: ComponentConfig<ContainerSchema, JoinProps> = {}
): Join {
  return new Join(cfg);
}
