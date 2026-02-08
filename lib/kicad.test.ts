import { generateKicadProjectZip } from './kicad';
import { ProjectData } from '@/types/mkd';
import JSZip from 'jszip';

// Mock crypto if needed
if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
        value: {
            randomUUID: () => `uuid-${Math.random()}`
        },
        writable: true
    });
} else if (!global.crypto.randomUUID) {
    // @ts-expect-error: fallback for missing randomUUID
    global.crypto.randomUUID = () => `uuid-${Math.random()}`;
}

describe('generateKicadProjectZip', () => {
    const mockProject: ProjectData = {
        id: 'test-project',
        name: 'Test Project',
        keys: [
            {
                id: 'key1',
                position: { x: 0, y: 0 },
                size: { w: 1, h: 1 },
                angle: 0,
                rotationCenter: { x: 0, y: 0 },
                legends: { top: '', bottom: '', left: '', right: '' },
                matrix: { row: 0, col: 0 },
            },
            {
                id: 'key2',
                position: { x: 1, y: 1 }, // 1u offset
                size: { w: 1, h: 1 },
                angle: 0,
                rotationCenter: { x: 0, y: 0 },
                legends: { top: '', bottom: '', left: '', right: '' },
                matrix: { row: 1, col: 1 },
            }
        ],
        createdAt: 0,
        updatedAt: 0,
    };

    it('generates a zip with 3 files', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);

        const files = Object.keys(zip.files);
        expect(files).toContain('Test_Project.kicad_sch');
        expect(files).toContain('Test_Project.kicad_pcb');
        expect(files).toContain('Test_Project.kicad_pro');
    });

    it('generates correct coordinates in PCB', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const pcb = await zip.file('Test_Project.kicad_pcb')?.async('string');

        expect(pcb).toBeDefined();
        // Key 1: 0, 0 -> 0.0000 0.0000
        expect(pcb).toContain('(at 0.0000 0.0000 0)');

        // Key 2: 1, 1 -> 19.05, 19.05
        expect(pcb).toContain('(at 19.0500 19.0500 0)');
    });

    it('generates correct coordinates in SCH (positive Y with offset)', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        expect(sch).toBeDefined();
        // Key 1: 0, 0 -> 50.00, 50.00 (with offset 50,50)
        expect(sch).toContain('(at 50.00 50.00 0)');

        // Key 2: 1, 1 -> 1u = 19.05mm.
        // X = 19.05 + 50 = 69.05
        // Y = 19.05 + 50 = 69.05
        expect(sch).toContain('(at 69.05 69.05 0)');
    });

    it('generates nets via labels correctly', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        // Key 1: ROW_0, COL_0
        expect(sch).toContain('(label "ROW_0"');
        expect(sch).toContain('(label "COL_0"');

        // Key 2: ROW_1, COL_1
        expect(sch).toContain('(label "ROW_1"');
        expect(sch).toContain('(label "COL_1"');

        // Intermediate net
        expect(sch).toContain('(label "Net-SW1-Pad2"');
    });

    it('includes lib_symbols definitions', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        expect(sch).toContain('(symbol "Switch:SW_Push"');
        expect(sch).toContain('(symbol "Device:D_Small"');
    });

    it('does NOT include (connect ...) inside pin definitions', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        expect(sch).not.toContain('(connect (net');
    });

    it('output format is clean (starts with S-expr, no backticks, no tags)', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        expect(sch).toBeDefined();
        // Check for start of file
        expect(sch!.trim().startsWith('(kicad_sch')).toBe(true);

        // Check for forbidden characters/tags
        expect(sch).not.toContain('`');
        expect(sch).not.toContain('<source>');
        expect(sch).not.toContain('</source>');
        expect(sch).not.toContain('<tag>');
    });
});
