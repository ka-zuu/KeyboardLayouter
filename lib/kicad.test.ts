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

    it('generates correct coordinates in SCH based on Matrix Grid', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        // Constants: OFFSET=25.4, SPACING_X=30.48, SPACING_Y=25.40
        // Key 1 (0,0): X=25.4 + 10.16 = 35.56, Y=25.4
        // Wait, Switch is at (baseX + 10.16, baseY)
        // Key 1: baseX=25.4, baseY=25.4. SW at (35.56, 25.40)
        expect(sch).toContain('(at 35.56 25.40 0)');

        // Key 2 (1,1): baseX=25.4+30.48=55.88, baseY=25.4+25.4=50.8
        // SW at (55.88+10.16, 50.8) = (66.04, 50.80)
        expect(sch).toContain('(at 66.04 50.80 0)');
    });

    it('generates wires and junctions', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        expect(sch).toContain('(wire (pts (xy');
        expect(sch).toContain('(junction (at');
    });

    it('generates global labels for ROW and COL', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        expect(sch).toContain('(global_label "ROW_0"');
        expect(sch).toContain('(global_label "COL_0"');
        expect(sch).toContain('(global_label "ROW_1"');
        expect(sch).toContain('(global_label "COL_1"');
    });

    it('does NOT generate intermediate net labels', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        expect(sch).not.toContain('label "Net-SW1-Pad2"');
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
