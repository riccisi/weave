import type { Meta, StoryObj } from '@storybook/html';
import { NumberField } from '../inputs/NumberField';

const meta: Meta = {
    title: 'Form/NumberField',
    render: (args) => {
        const root = document.createElement('div');
        const nf = new NumberField(args);
        nf.mount(root);
        return root;
    },
    argTypes: {
        labelMode: { control: 'select', options: ['none', 'inline', 'floating'] },
        size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
        variant: { control: 'select', options: ['default', 'bordered', 'ghost'] },
        color: { control: 'select', options: ['default','primary','secondary','accent','info','success','warning','error'] },
    },
};
export default meta;
type Story = StoryObj<Record<string, any>>;

export const Basic: Story = {
    args: {
        label: 'Qty',
        labelMode: 'inline',
        placeholder: '0',
        value: 3,
    },
};

export const MinMax: Story = {
    args: {
        label: 'Percent',
        labelMode: 'floating',
        value: 50,
        min: 0,
        max: 100,
        color: 'info',
    },
};

export const Required: Story = {
    args: {
        label: 'Required number',
        labelMode: 'inline',
        required: true,
        value: null,
        helperText: 'Inserisci un numero',
        color: 'error',
    },
};
