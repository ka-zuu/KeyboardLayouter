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

    it('generates correct coordinates in SCH (inverted Y)', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        expect(sch).toBeDefined();
        // Key 1: 0, 0 -> 0.00, 0.00
        expect(sch).toContain('(at 0.00 0.00 0)');

        // Key 2: 1, 1 -> 19.05, -19.05 (Y inverted)
        expect(sch).toContain('(at 19.05 -19.05 0)');
    });

    it('generates consistent UUIDs between SCH and PCB', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');
        const pcb = await zip.file('Test_Project.kicad_pcb')?.async('string');

        // Extract UUID from first switch in PCB
        // (uuid "...")
        // We need to be careful not to match the first uuid if it's generic, but here we look for switch uuid
        // The template: (uuid "{sw_uuid}")
        // We can search for the one associated with Reference SW1 maybe?
        // But let's just grep for any uuid and see if it is in SCH.

        const matches = pcb?.matchAll(/\(uuid "([^"]+)"\)/g);
        const uuids = Array.from(matches || []).map(m => m[1]);

        expect(uuids.length).toBeGreaterThan(0);

        // At least one PCB UUID (switch) should be present in SCH
        let found = false;
        for (const uuid of uuids) {
            if (sch?.includes(`(uuid "${uuid}")`)) {
                found = true;
                break;
            }
        }
        expect(found).toBe(true);
    });

    it('generates nets correctly', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        // Key 1: ROW_0, COL_0
        expect(sch).toContain('"ROW_0"');
        expect(sch).toContain('"COL_0"');

        // Key 2: ROW_1, COL_1
        expect(sch).toContain('"ROW_1"');
        expect(sch).toContain('"COL_1"');
    });
});
