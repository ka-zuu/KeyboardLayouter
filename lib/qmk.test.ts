import { generateQMKInfo } from './qmk';
import { ProjectData } from '@/types/mkd';

describe('qmk', () => {
    describe('generateQMKInfo', () => {
        it('should generate correct QMK info JSON', () => {
            const mockProject: ProjectData = {
                id: 'test-id',
                name: 'Test Keyboard',
                createdAt: 1234567890,
                updatedAt: 1234567890,
                keys: [
                    {
                        id: 'k1',
                        position: { x: 0, y: 0 },
                        size: { w: 1, h: 1 },
                        angle: 0,
                        rotationCenter: { x: 0, y: 0 },
                        visualLegend: 'A',
                        matrix: { row: 0, col: 0 },
                        variant: 'rect'
                    },
                    {
                        id: 'k2',
                        position: { x: 1, y: 0 },
                        size: { w: 2, h: 1 }, // 2U key
                        angle: 0,
                        rotationCenter: { x: 0, y: 0 },
                        visualLegend: 'Space',
                        matrix: { row: 0, col: 1 },
                        variant: 'rect'
                    },
                    {
                        id: 'k3',
                        position: { x: 3, y: 0 },
                        size: { w: 1, h: 1 },
                        angle: 45, // Rotated
                        rotationCenter: { x: 0, y: 0 },
                        visualLegend: 'B',
                        matrix: { row: 0, col: 2 },
                        variant: 'rect'
                    }
                ]
            };

            const jsonOutput = generateQMKInfo(mockProject);
            const parsed = JSON.parse(jsonOutput);

            expect(parsed).toEqual({
                keyboard_name: 'Test Keyboard',
                layouts: {
                    LAYOUT: {
                        layout: [
                            {
                                x: 0,
                                y: 0,
                                label: 'A',
                                matrix: [0, 0]
                            },
                            {
                                x: 1,
                                y: 0,
                                w: 2,
                                // h: 1 is default, so omitted
                                label: 'Space',
                                matrix: [0, 1]
                            },
                            {
                                x: 3,
                                y: 0,
                                label: 'B',
                                matrix: [0, 2],
                                r: 45
                            }
                        ]
                    }
                }
            });
        });
    });
});
