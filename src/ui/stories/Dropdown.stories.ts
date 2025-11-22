// src/ui/stories/Dropdown.stories.ts
import type {Meta, StoryObj} from '@storybook/html';
import {Dropdown, dropdown} from '../Dropdown';

const meta: Meta = {
    title: 'Overlays/Dropdown',
    render: () => {
        const dd: Dropdown = dropdown({
            className: 'm-4',
            offset: 8,
            flip: true,
            shift: true,
            items: [
                {type: 'title', text: 'Account'},
                {type: 'link', text: 'Profile', href: '/profile', icon: 'icon-[tabler--user]'},
                {type: 'link', text: 'Settings', href: '/settings', icon: 'icon-[tabler--settings]'},
                {type: 'divider'},
                {type: 'link', text: 'Logout', href: '/logout', icon: 'icon-[tabler--logout-2]'}
            ]
        });

        const mount = document.createElement('div');
        dd.mount(mount);
        return mount;
    }
};
export default meta;
export const Basic: StoryObj = {};