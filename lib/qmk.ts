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
    manufacturer: string;
    maintainer: string;
    url: string;
    usb: {
        vid: string;
        pid: string;
        device_version: string;
    };
    diode_direction: string;
    layouts: {
        [key: string]: QMKLayout;
    };
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
            // The rotation origin (rx, ry) for QMK is an absolute coordinate.
            // It's calculated from the key's center plus the relative rotationCenter offset.
            qmkKey.rx = key.position.x + key.size.w / 2 + key.rotationCenter.x;
            qmkKey.ry = key.position.y + key.size.h / 2 + key.rotationCenter.y;
        }

        return qmkKey;
    });

    const info: QMKInfo = {
        keyboard_name: project.name,
        manufacturer: 'Unknown',
        maintainer: 'qmk',
        url: '',
        usb: {
            vid: '0xFEED',
            pid: '0x0000',
            device_version: '0.0.1',
        },
        diode_direction: 'COL2ROW',
        layouts: {
            "LAYOUT": {
                "layout": qmkKeys,
            }
        }
    };

    return JSON.stringify(info, null, 4);
}
