import type {Meta, StoryObj} from '@storybook/html';
import {appShell, AppShell} from '../AppShell';
import {navbar} from '../Navbar';
import {markup} from '../Markup';
import {button} from '../Button';
import {mountComponent} from '../testing/mount';
import {html} from 'uhtml';
import {card} from "../Card";

const meta = {
    title: 'Weave/AppShell',
    render: () => {
        const shell = appShell();
        return mountComponent(shell);
    }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function sidebarList(title: string, entries: string[]) {
    return markup({
        className: 'space-y-2',
        render: () => html`<div class="text-xs font-semibold uppercase tracking-wide opacity-70">${title}</div>
      <ul class="menu menu-sm bg-base-100 rounded-box shadow-sm">
        ${entries.map((entry) => html`<li><a>${entry}</a></li>`)}
      </ul>`
    });
}

function contentSection(title: string, body: string) {
    return card({
        title: title,
        description: 'ciao',
        //className: 'bg-base-100 shadow-md'
    });
}

export const DesktopStaticSidebar: Story = {
    render: () => {
        const nav = navbar({
            shadow: true,
            left: [markup({className: 'text-lg font-semibold', render: () => 'Weave Console'})],
            right: [button({text: 'New project', color: 'primary', iconLeft: 'icon-[tabler--plus] size-4.5'})]
        });

        const shell = appShell({
            header: nav,
            sidebarWidth: '18rem',
            sidebar: [
                sidebarList('Overview', ['Home', 'Analytics', 'Activity']),
                sidebarList('Management', ['Users', 'Permissions', 'Billing'])
            ],
            content: [
                contentSection('Welcome back!', 'Use the sidebar to navigate the workspace and manage your projects.'),
                contentSection('Insights', 'Real-time dashboards and activity feeds keep your team aligned.')
            ]
        });

        const wrap = document.createElement('div');
        wrap.className = 'h-[34rem] rounded-box border border-base-300 bg-base-200 overflow-hidden';
        wrap.appendChild(mountComponent(shell));
        return wrap;
    }
};

export const MobileDrawerSidebar: Story = {
    render: () => {
        const shellRef: { current: AppShell | null } = {current: null};
        const menuButton = button({
            text: 'Menu',
            variant: 'text',
            iconLeft: 'icon-[tabler--menu-2] size-4.5',
            onClick: () => shellRef.current?.toggleSidebar()
        });

        const nav = navbar({
            shadow: true,
            left: [menuButton, markup({className: 'font-semibold', render: () => 'Weave Mobile'})],
            right: [button({text: 'Profile', shape: 'circle', iconLeft: 'icon-[tabler--user] size-4.5'})]
        });

        const shell = appShell({
            header: nav,
            sidebarStatic: false,
            sidebarWidth: '16rem',
            sidebar: [
                sidebarList('Primary', ['Dashboard', 'Inbox', 'Calendar']),
                sidebarList('Secondary', ['Settings', 'Support'])
            ],
            content: [
                contentSection('Responsive layout', 'Tap the menu button to open the drawer. Try ESC or tapping the backdrop to close it.'),
                contentSection('Offline mode', 'The drawer keeps focus trapped when open, improving accessibility.')
            ]
        });
        shellRef.current = shell;

        const wrap = document.createElement('div');
        wrap.className = 'h-[32rem] max-w-lg rounded-box border border-base-300 bg-base-200 overflow-hidden';
        wrap.appendChild(mountComponent(shell));
        return wrap;
    }
};

export const MixedResponsive: Story = {
    render: () => {
        const shellRef: { current: AppShell | null } = {current: null};
        const menuButton = button({
            text: 'Menu',
            variant: 'text',
            iconLeft: 'icon-[tabler--menu-2] size-4.5',
            onClick: () => shellRef.current?.toggleSidebar()
        });

        const nav = navbar({
            shadow: true,
            left: [menuButton, markup({className: 'font-semibold', render: () => 'Adaptive App'})],
            right: [button({text: 'Deploy', color: 'success', iconLeft: 'icon-[tabler--cloud-upload] size-4.5'})]
        });

        const shell = appShell({
            header: nav,
            sidebarStatic: true,
            responsiveBreakpoint: 900,
            sidebar: [
                sidebarList('Navigation', ['Overview', 'Pipelines', 'Logs']),
                sidebarList('Automation', ['Workflows', 'Integrations'])
            ],
            content: [
                contentSection('Resize to test', 'Reduce the Storybook viewport below 900px to see the sidebar switch into a drawer.'),
                contentSection('Keyboard support', 'When the drawer is open use Tab/Shift+Tab to cycle through focusable elements.')
            ]
        });
        shellRef.current = shell;

        const wrap = document.createElement('div');
        wrap.className = 'h-[32rem] rounded-box border border-base-300 bg-base-200 overflow-hidden';
        wrap.appendChild(mountComponent(shell));
        return wrap;
    }
};
