import type {Meta, StoryObj} from '@storybook/html';
import type {ComponentConfig} from '../Component';
import type {ProgressProps, ProgressState} from '../Progress';
import {progress} from '../Progress';
import {mountComponent} from '../testing/mount';

type ProgressArgs = ComponentConfig<ProgressState, ProgressProps>;

const meta: Meta<ProgressArgs> = {
    title: 'Weave/Progress',
    render: (args) => mountComponent(progress({...args})),
    argTypes: {
        value: {control: 'number'},
        min: {control: 'number'},
        max: {control: 'number'},
        orientation: {control: 'select', options: ['horizontal', 'vertical']},
        color: {
            control: 'select',
            options: ['default', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error']
        },
        striped: {control: 'boolean'},
        animated: {control: 'boolean'},
        indeterminate: {control: 'boolean'},
        labelMode: {control: 'select', options: ['none', 'inside', 'end', 'floating']},
        labelText: {control: 'text'},
        widthClass: {control: 'text'},
        heightClass: {control: 'text'},
        thicknessClass: {control: 'text'},
        className: {control: 'text'},
        ariaLabel: {control: 'text'}
    },
    args: {
        value: 45,
        min: 0,
        max: 100,
        orientation: 'horizontal',
        color: 'primary',
        striped: false,
        animated: false,
        indeterminate: false,
        labelMode: 'none',
        labelText: null,
        widthClass: 'w-56',
        heightClass: 'h-56',
        thicknessClass: 'h-4',
        className: ''
    }
};

export default meta;
type Story = StoryObj<ProgressArgs>;

export const Playground: Story = {};

export const HorizontalBasic: Story = {
    args: {orientation: 'horizontal', value: 25, widthClass: 'w-56', thicknessClass: null, labelMode: 'none'}
};

export const VerticalBasic: Story = {
    args: {orientation: 'vertical', value: 60, heightClass: 'h-56', thicknessClass: null, labelMode: 'none'}
};

export const CustomThickness: Story = {
    args: {orientation: 'horizontal', value: 50, widthClass: 'w-56', thicknessClass: 'h-3'}
};

export const WithInsideLabel: Story = {
    args: {orientation: 'horizontal', value: 75, labelMode: 'inside', thicknessClass: 'h-4'}
};

export const WithEndLabel: Story = {
    args: {orientation: 'horizontal', value: 33, labelMode: 'end', thicknessClass: 'h-4'}
};

export const WithFloatingLabel: Story = {
    args: {orientation: 'horizontal', value: 66, labelMode: 'floating', thicknessClass: 'h-4'}
};

export const SemanticColors: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-3';
        (['default', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'] as const)
            .forEach((color) => {
                wrap.appendChild(
                    mountComponent(progress({
                        value: 50,
                        color,
                        labelMode: 'inside',
                        thicknessClass: 'h-4',
                        widthClass: 'w-56'
                    }))
                );
            });
        return wrap;
    }
};

export const StripedAndAnimated: Story = {
    render: () => {
        const wrap = document.createElement('div');
        wrap.className = 'flex flex-col gap-3';
        wrap.appendChild(mountComponent(progress({value: 40, striped: true, widthClass: 'w-56'})));
        wrap.appendChild(mountComponent(progress({
            value: 70,
            striped: true,
            animated: true,
            color: 'success',
            widthClass: 'w-56'
        })));
        return wrap;
    }
};

export const Indeterminate: Story = {
    args: {indeterminate: true, striped: true, animated: true, widthClass: 'w-56'}
};
