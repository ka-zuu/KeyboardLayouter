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

    it('generates correct coordinates in SCH based on Matrix Grid', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        expect(sch).toBeDefined();
        // Key 1: matrix (0, 0)
        // OFFSET_X = 25.4, OFFSET_Y = 25.4
        // X = 25.40, Y = 25.40
        expect(sch).toContain('(at 25.40 25.40 0)');

        // Key 2: matrix (1, 1)
        // X = 25.4 + 40.64 = 66.04
        // Y = 25.4 + 25.40 = 50.80
        expect(sch).toContain('(at 66.04 50.80 0)');
    });

    it('generates wires for connections', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        // Should contain wire definitions
        expect(sch).toContain('(wire (pts (xy');
    });

    it('generates labels for ROW and COL', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        // Key 1: ROW_0, COL_0
        expect(sch).toContain('(label "ROW_0"');
        expect(sch).toContain('(label "COL_0"');

        // Key 2: ROW_1, COL_1
        expect(sch).toContain('(label "ROW_1"');
        expect(sch).toContain('(label "COL_1"');
    });

    it('does NOT generate intermediate net labels (Net-SWx-Pad2)', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        // Intermediate nets should be wires now, not labels
        expect(sch).not.toContain('label "Net-SW1-Pad2"');
    });

    it('includes lib_symbols definitions', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        expect(sch).toContain('(symbol "Switch:SW_Push"');
        expect(sch).toContain('(symbol "Device:D_Small"');
    });

    it('output format is clean', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        expect(sch!.trim().startsWith('(kicad_sch')).toBe(true);
        expect(sch).not.toContain('`');
        expect(sch).not.toContain('<source>');
    });
});
