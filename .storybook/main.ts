import type { StorybookConfig } from '@storybook/html-vite';

const config: StorybookConfig = {
    framework: { name: '@storybook/html-vite', options: {} },
    stories: ['../src/**/*.stories.@(ts|tsx)'],
    addons: [
        '@storybook/addon-a11y',
        '@storybook/addon-vitest', // rimuovi se non ti serve
    ],
    typescript: { check: false },
    viteFinal: async (cfg) => cfg,
};

export default config;