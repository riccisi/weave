import type { Preview } from '@storybook/html';
import '../src/styles.css';

const preview: Preview = {
    parameters: {
        controls: { expanded: true },
        // In SB9 il logging “Actions” è integrato: l'uso di argTypesRegex continua a funzionare
        actions: { argTypesRegex: '^on[A-Z].*' },
        a11y: { context: '#storybook-root' },
    },
};
export default preview;