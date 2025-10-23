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
    },
};

export const Required: Story = {
    args: {
        label: 'Required number',
        labelMode: 'inline',
        required: true,
        value: null,
        helperText: 'Inserisci un numero',
    },
};

export const WithStep: Story = {
    args: {
        label: 'Price',
        labelMode: 'inline',
        step: 0.5,
        min: 0,
        placeholder: '0.0',
    },
};
