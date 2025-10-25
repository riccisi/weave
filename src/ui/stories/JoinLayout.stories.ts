import type { Meta, StoryObj } from '@storybook/html';
import { mountComponent } from '../testing/mount';
import { container } from '../Container';
import { button } from '../Button';
import { joinLayout } from '../layouts/factories';
import '../layouts/JoinLayout';

const meta = {
  title: 'Weave/Layouts/Join',
  render: (args) => {
    const items = [
      button({ text: 'Left', color: 'primary' }),
      button({ text: 'Middle', color: 'primary', variant: 'outline' }),
      button({ text: 'Right', color: 'primary' })
    ];
    const c = container({
      ...args,
      layout: joinLayout({ orientation: args.orientation, className: args.className }),
      items
    });
    return mountComponent(c);
  },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    className: { control: 'text' }
  },
  args: {
    orientation: 'horizontal',
    className: 'rounded-md'
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AsLayout: Story = {};

export const DeepTargetDemo: Story = {
  render: () => {
    const a = button({ text: 'A' });
    const b = button({ text: 'B', variant: 'outline' });
    const c = button({ text: 'C' });
    const joinContainer = container({
      layout: joinLayout({ orientation: 'horizontal', deepTarget: true, className: 'rounded-lg' }),
      items: [a, b, c]
    });
    return mountComponent(joinContainer);
  }
};
