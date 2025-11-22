import { vi } from 'vitest';

// Evita inizializzazioni di Flyon durante i test
vi.mock('../src/ui/flyonBridge', () => ({
    scheduleFlyonInit: () => {},
}));