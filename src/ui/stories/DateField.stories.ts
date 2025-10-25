import type { Meta, StoryObj } from '@storybook/html';
import { datefield } from '../inputs/DateField';

const meta: Meta = {
  title: 'Form/DateField',
  render: (args) => {
    const root = document.createElement('div');
    const field = datefield(args);
    field.mount(root);
    return root;
  },
  argTypes: {
    labelMode: { control: 'select', options: ['none', 'inline', 'floating'] },
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] }
  }
};
export default meta;

type Story = StoryObj<Record<string, any>>;

export const Basic: Story = {
  args: {
    label: 'Data',
    labelMode: 'inline',
    placeholder: 'yyyy-mm-dd'
  }
};

export const WithRange: Story = {
  args: {
    label: 'Periodo',
    labelMode: 'floating',
    helperText: 'Seleziona una data di questo mese',
    min: '2025-01-01',
    max: '2025-12-31'
  }
};
