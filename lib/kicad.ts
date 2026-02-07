import JSZip from 'jszip';
import { ProjectData, KeyData } from '@/types/mkd';

// We need crypto for randomUUID.
// in browser it is on window.crypto, in node (tests) it is in 'crypto' module but globally available in Node 19+.
// For safety in older node envs or jest, we might need a fallback or polyfill, but typical Next.js setup has it.
// If not, we'll see in tests.

interface ExportKey {
    key: KeyData;
    index: number;
    ref: string;        // SW1
    diodeRef: string;   // D1
    uuidSw: string;
    uuidDiode: string;
    uuidPin1: string;
    uuidPin2: string;
    netRowId: string; // for the pin connection net integer ID (local to file)
    netColId: string;
    netRowName: string; // "ROW_0"
    netColName: string; // "COL_0"
}

export async function generateKicadProjectZip(project: ProjectData): Promise<Blob> {
    const zip = new JSZip();
    const projectName = project.name.replace(/\s+/g, '_') || "keyboard";

    // 1. Prepare Data
    const exportKeys: ExportKey[] = [];

    // We need unique net IDs (integers) for the schematic connections
    // Map "ROW_0" -> 1, "COL_0" -> 2, etc.
    const netMap = new Map<string, number>();
    let netCounter = 1;
    const getNetId = (name: string) => {
        if (!netMap.has(name)) {
            netMap.set(name, netCounter++);
        }
        return netMap.get(name)!;
    };

    project.keys.forEach((key, i) => {
        const index = i + 1;
        const rowName = `ROW_${key.matrix.row}`;
        const colName = `COL_${key.matrix.col}`;

        exportKeys.push({
            key,
            index,
            ref: `SW${index}`,
            diodeRef: `D${index}`,
            uuidSw: crypto.randomUUID(),
            uuidDiode: crypto.randomUUID(),
            uuidPin1: crypto.randomUUID(),
            uuidPin2: crypto.randomUUID(),
            netRowName: rowName,
            netColName: colName,
            netRowId: getNetId(rowName).toString(),
            netColId: getNetId(colName).toString(),
        });
    });

    // 2. Generate SCH
    const schContent = generateSch(exportKeys);
    zip.file(`${projectName}.kicad_sch`, schContent);

    // 3. Generate PCB
    const pcbContent = generatePcb(exportKeys);
    zip.file(`${projectName}.kicad_pcb`, pcbContent);

    // 4. Generate Project
    const proContent = generatePro();
    zip.file(`${projectName}.kicad_pro`, proContent);

    // 5. Generate ZIP
    return zip.generateAsync({ type: 'blob' });
}

function generateSch(keys: ExportKey[]): string {
    // Basic Header
    let content = `(kicad_sch (version 20231120) (generator "mkd_export")\n`;
    content += `  (paper "A4")\n`;
    content += `  (lib_symbols)\n`; // Empty lib cache, KiCad will complain but should load references if standard libraries exist

    // Wire/Net generation is tricky without routing.
    // The prompt only asks to "Generate each switch... and diode... in S-expression format".
    // And "connect to net...".
    // We will place symbols.

    keys.forEach(k => {
        // Coordinate conversion
        // 1u = 19.05mm.
        // SCH coords: x positive right, y positive up (inverted from PCB y down).
        // Let's space them out a bit more in SCH than PCB maybe? Or just keep 1:1 scale for simplicity.
        // KiCad SCH units are arbitrary, but often 1.27mm grid.
        // If we use mm directly: 19.05.
        // x_sch = x_mm
        // y_sch = -y_mm
        const x_mm = k.key.position.x * 19.05;
        const y_mm = k.key.position.y * 19.05;

        const x_sch = x_mm.toFixed(2);
        const y_sch = (-y_mm).toFixed(2); // Invert Y

        // Switch Instance
        // Template:
        // (symbol (lib_id "Switch:SW_Push") (at {x} {y} 0) (unit 1)
        //   (in_bom yes) (on_board yes) (fields_autoplaced yes)
        //   (uuid "{sw_uuid}")
        //   (property "Reference" "{ref}" (at {x} {y+2} 0))
        //   (property "Footprint" "Button_Switch_Keyboard:SW_Cherry_MX_1.00u_Plate" (at {x} {y+5} 0) (effects (font (size 1.27 1.27)) hide))
        //   (pin "1" (uuid "{pin1_uuid}") (connect (net {net_id_row} "ROW_{row}")))
        //   (pin "2" (uuid "{pin2_uuid}") (connect (net {net_id_col} "COL_{col}")))
        // )

        // We need to calculate text positions relative to symbol.
        // y+2 means higher (less negative) in SCH? Or lower?
        // Since Y is up-positive in math, but KiCad internal coords might be down-positive in file format?
        // Wait. KiCad file format:
        // (at X Y R)
        // Usually, in KiCad Schematic file, Y increases downwards.
        // Prompt says: "SCH: Y axis up positive so invert".
        // This implies the user wants visual layout in SCH to match physical layout but flipped Y?
        // If I use -y_mm, and KiCad SCH Y is down, then -y_mm (negative) is UP.
        // So keys at Y=0 (top) are at 0. Keys at Y=1 (lower) are at -19.05 (higher in SCH).
        // This matches "Y up positive" logic for *cartesian* graphs, but in KiCad View, Y is down.
        // So visually, the keyboard rows will go UP in the schematic. That's fine.

        const refY = (parseFloat(y_sch) + 2.54).toFixed(2); // 2.54mm = 100mil, standard text offset
        const fpY = (parseFloat(y_sch) + 5.08).toFixed(2);

        content += `
  (symbol (lib_id "Switch:SW_Push") (at ${x_sch} ${y_sch} 0) (unit 1)
    (in_bom yes) (on_board yes) (fields_autoplaced yes)
    (uuid "${k.uuidSw}")
    (property "Reference" "${k.ref}" (at ${x_sch} ${refY} 0))
    (property "Value" "SW_Push" (at ${x_sch} ${fpY} 0) (effects (font (size 1.27 1.27)) hide))
    (property "Footprint" "Button_Switch_Keyboard:SW_Cherry_MX_1.00u_Plate" (at ${x_sch} ${fpY} 0) (effects (font (size 1.27 1.27)) hide))
    (pin "1" (uuid "${k.uuidPin1}") (connect (net ${k.netRowId} "${k.netRowName}")))
    (pin "2" (uuid "${k.uuidPin2}") (connect (net ${k.netColId} "${k.netColName}")))
  )
`;

        // Diode Instance
        // Place it slightly offset, e.g. +5mm X.
        const d_x_sch = (parseFloat(x_sch) + 5.0).toFixed(2);
        const d_y_sch = y_sch;
        const d_refY = (parseFloat(d_y_sch) + 2.54).toFixed(2);

        // We don't have explicit pin UUIDs for diode in the loop above, generate them here or add to interface.
        // I didn't add them to interface, I'll generate on the fly.
        // Wait, for SCH-PCB sync, UUIDs of *components* matter (uuidDiode). Pin UUIDs are local to SCH usually?
        // Actually, Pin UUIDs help with wire connections in SCH.

        const d_pin1 = crypto.randomUUID();
        const d_pin2 = crypto.randomUUID();

        content += `
  (symbol (lib_id "Device:D_Small") (at ${d_x_sch} ${d_y_sch} 0) (unit 1)
    (in_bom yes) (on_board yes) (fields_autoplaced yes)
    (uuid "${k.uuidDiode}")
    (property "Reference" "${k.diodeRef}" (at ${d_x_sch} ${d_refY} 0))
    (property "Value" "D" (at ${d_x_sch} ${d_y_sch} 0) (effects (font (size 1.27 1.27)) hide))
    (property "Footprint" "Diode_SMD:D_SOD-123" (at ${d_x_sch} ${d_y_sch} 0) (effects (font (size 1.27 1.27)) hide))
    (pin "1" (uuid "${d_pin1}"))
    (pin "2" (uuid "${d_pin2}"))
  )
`;
    });

    content += `)\n`;
    return content;
}

function generatePcb(keys: ExportKey[]): string {
    // Basic Header
    let content = `(kicad_pcb (version 20240108) (generator "mkd_export")\n`;
    content += `  (general)\n`;
    content += `  (layers (0 "F.Cu" signal) (31 "B.Cu" signal) (32 "B.Adhes" user) (33 "F.Adhes" user) (34 "B.Paste" user) (35 "F.Paste" user) (36 "B.SilkS" user) (37 "F.SilkS" user) (38 "B.Mask" user) (39 "F.Mask" user) (40 "Dwgs.User" user) (41 "Cmts.User" user) (42 "Eco1.User" user) (43 "Eco2.User" user) (44 "Edge.Cuts" user) (45 "Margin" user) (46 "B.CrtYd" user) (47 "F.CrtYd" user) (48 "B.Fab" user) (49 "F.Fab" user))\n`;

    keys.forEach(k => {
        // PCB Coords: 1u = 19.05mm. Y down positive.
        const x_mm = (k.key.position.x * 19.05).toFixed(4);
        const y_mm = (k.key.position.y * 19.05).toFixed(4);
        const rotation = k.key.angle || 0;

        // Template:
        // (footprint "Button_Switch_Keyboard:SW_Cherry_MX_1.00u_Plate" (layer "F.Cu")
        //   (at {x_mm} {y_mm} {rotation})
        //   (uuid "{sw_uuid}")
        //   (property "Reference" "{ref}" (at 0 -8.2 0) (layer "F.SilkS"))
        // )

        content += `
  (footprint "Button_Switch_Keyboard:SW_Cherry_MX_1.00u_Plate" (layer "F.Cu")
    (at ${x_mm} ${y_mm} ${rotation})
    (uuid "${k.uuidSw}")
    (property "Reference" "${k.ref}" (at 0 -8.2 0) (layer "F.SilkS"))
  )
`;
    });

    content += `)\n`;
    return content;
}

function generatePro(): string {
    return JSON.stringify({
        "meta": {
            "filename": "project.kicad_pro",
            "version": 1
        },
        "board": {
            "page_layout": {
                "scale": 1
            }
        },
        "schematic": {
            "page_layout": {
                "scale": 1
            }
        }
    }, null, 2);
}
