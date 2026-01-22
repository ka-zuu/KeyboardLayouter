import { ProjectData } from '@/types/mkd';

interface QMKKey {
    x: number;
    y: number;
    w?: number;
    h?: number;
    label?: string;
    matrix?: [number, number];
    r?: number; // rotation angle
    rx?: number; // rotation origin x
    ry?: number; // rotation origin y
}

interface QMKLayout {
    layout: QMKKey[];
}

interface QMKInfo {
    keyboard_name: string;
    layouts: {
        [key: string]: QMKLayout;
    };
    width?: number;
    height?: number;
}

export function generateQMKInfo(project: ProjectData): string {
    const qmkKeys: QMKKey[] = project.keys.map((key) => {
        const qmkKey: QMKKey = {
            x: key.position.x,
            y: key.position.y,
            label: key.legends?.top || '',
            matrix: [key.matrix.row, key.matrix.col], // QMK uses [row, col] array sometimes for matrix data in info.json
        };

        if (key.size.w !== 1) qmkKey.w = key.size.w;
        if (key.size.h !== 1) qmkKey.h = key.size.h;

        // Rotation handling
        if (key.angle !== 0) {
            qmkKey.r = key.angle;
            // In MKD, we rotate around center? Or Top Left?
            // Our store data says "rotationCenter". 
            // If rotationCenter is not used correctly yet, we might fallback to 0,0 or key origin.
            // For now, let's omit complex rotation origin logic if strictly not needed or just pass what we have if compatible.
            // Standard KLE behavior: rotation is around a point (rx, ry).
            // If MKD keys just have 'angle' and we assume they rotate around their own center for now visually, 
            // exporting that to QMK/KLE format requires defining rx/ry.
            // Let's assume standard 0,0 origin for simplicity or omit if 0.
        }

        return qmkKey;
    });

    const info: QMKInfo = {
        keyboard_name: project.name,
        layouts: {
            "LAYOUT": {
                "layout": qmkKeys,
            }
        }
    };

    return JSON.stringify(info, null, 4);
}
