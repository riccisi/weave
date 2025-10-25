import type { Meta, StoryObj } from '@storybook/html';
import { emailfield } from '../inputs/EmailField';

const meta: Meta = {
  title: 'Form/EmailField',
  render: (args) => {
    const root = document.createElement('div');
    const field = emailfield(args);
    field.mount(root);
    return root;
  },
  argTypes: {
    labelMode: { control: 'select', options: ['none', 'inline', 'floating'] },
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    spellcheck: { control: 'boolean' }
  }
};
export default meta;

type Story = StoryObj<Record<string, any>>;

export const Basic: Story = {
  args: {
    label: 'Email',
    labelMode: 'inline',
    placeholder: 'you@example.com'
  }
};

export const WithValidation: Story = {
  args: {
    label: 'Work email',
    labelMode: 'floating',
    required: true,
    helperText: 'Utilizza il dominio aziendale',
    pattern: '^[^@]+@example\\.com$'
  }
};
