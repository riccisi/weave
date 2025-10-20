import type { Meta, StoryObj } from '@storybook/html';
import { TextField } from '../TextField';
import { mountComponent } from '../testing/mount';

const meta = {
    title: 'Weave/TextField',
    render: (args) => {
        const tf = new TextField({ ...args });
        return mountComponent(tf);
    },
    argTypes: {
        label: { control: 'text' },
        name: { control: 'text' },
        placeholder: { control: 'text' },
        value: { control: 'text' },
        disabled: { control: 'boolean' }
    },
    args: {
        label: 'Your name',
        name: 'fullName',
        placeholder: 'Type here',
        value: '',
        disabled: false
    }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithValue: Story = { args: { value: 'Ada' } };
export const Disabled: Story = { args: { disabled: true } };
