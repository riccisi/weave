import type { Meta, StoryObj } from '@storybook/html';
import { button } from '../Button';

const meta: Meta = {
  title: 'Core/Hidden (built-in)',
  parameters: {
    layout: 'centered'
  },
  render: (args) => {
    const root = document.createElement('div');
    root.className = 'flex flex-col items-center gap-4';

    const toolbar = document.createElement('div');
    toolbar.className = 'join join-horizontal';

    const btnToggleHidden = document.createElement('button');
    btnToggleHidden.className = 'btn join-item';
    btnToggleHidden.textContent = 'Toggle hidden';

    const btnToggleInert = document.createElement('button');
    btnToggleInert.className = 'btn btn-outline join-item';
    btnToggleInert.textContent = 'Toggle inert';

    toolbar.append(btnToggleHidden, btnToggleInert);
    root.appendChild(toolbar);

    const target = button({
      text: 'Target component',
      hidden: args.hidden,
      hiddenInert: args.hiddenInert,
      color: 'primary'
    });
    target.mount(root);

    btnToggleHidden.onclick = () => {
      const s = target.state();
      s.hidden = !s.hidden;
    };
    btnToggleInert.onclick = () => {
      const s = target.state();
      s.hiddenInert = !s.hiddenInert;
    };

    return root;
  },
  argTypes: {
    hidden: { control: 'boolean' },
    hiddenInert: { control: 'boolean' }
  }
};
export default meta;

type Story = StoryObj<Record<string, any>>;

export const Playground: Story = {
  args: {
    hidden: false,
    hiddenInert: false
  }
};
