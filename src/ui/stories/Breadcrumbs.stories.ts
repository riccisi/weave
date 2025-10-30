import type { Meta, StoryObj } from '@storybook/html';
import { breadcrumbs } from '../Breadcrumbs';
import { mountComponent } from '../testing/mount';

const meta = {
  title: 'Weave/Breadcrumbs',
  render: (args) => mountComponent(breadcrumbs({ ...args }))
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const baseItems = [
  { label: 'Home', href: '#' },
  { label: 'Components', href: '#components' },
  { label: 'Navigation' }
];

export const SlashSeparator: Story = {
  args: {
    items: baseItems,
    separator: 'slash'
  }
};

export const ChevronSeparator: Story = {
  render: () => {
    const trail = breadcrumbs({
      separator: 'chevron',
      items: [
        { label: 'Design System', href: '#design' },
        { label: 'UI Kit', href: '#ui-kit' },
        { label: 'Breadcrumbs' }
      ]
    });
    return mountComponent(trail);
  }
};

export const WithDisabledMiddle: Story = {
  render: () => {
    const trail = breadcrumbs({
      separator: 'dot',
      items: [
        { label: 'Home', href: '#' },
        { label: 'Archive', disabled: true },
        { label: '2024', onClick: () => alert('Clicked final crumb') }
      ]
    });
    return mountComponent(trail);
  }
};
