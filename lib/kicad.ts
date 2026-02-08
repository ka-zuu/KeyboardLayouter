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
    uuidDiodePin1: string;
    uuidDiodePin2: string;
    netRowId: string; // for the pin connection net integer ID (local to file)
    netColId: string;
    netMidId: string; // Intermediate net between Switch and Diode
    netRowName: string; // "ROW_0"
    netColName: string; // "COL_0"
    netMidName: string; // "Net-SW1-Pad2"
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
        const ref = `SW${index}`;
        const midName = `Net-${ref}-Pad2`;

        exportKeys.push({
            key,
            index,
            ref,
            diodeRef: `D${index}`,
            uuidSw: crypto.randomUUID(),
            uuidDiode: crypto.randomUUID(),
            uuidPin1: crypto.randomUUID(),
            uuidPin2: crypto.randomUUID(),
            uuidDiodePin1: crypto.randomUUID(),
            uuidDiodePin2: crypto.randomUUID(),
            netRowName: rowName,
            netColName: colName,
            netMidName: midName,
            netRowId: getNetId(rowName).toString(),
            netColId: getNetId(colName).toString(),
            netMidId: getNetId(midName).toString(),
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
    // Constants for Schematic Layout
    const SCH_GRID = 1.27;
    const OFFSET_X = 25.4;
    const OFFSET_Y = 25.4;
    const KEY_SPACING_X = 40.64;
    const KEY_SPACING_Y = 25.40;

    // Helper to round to nearest grid point
    const r = (val: number): string => {
        return (Math.round(val / SCH_GRID) * SCH_GRID).toFixed(2);
    };

    // Basic Header
    let content = `(kicad_sch (version 20231120) (generator "mkd_export")\n`;
    content += `  (paper "A4")\n`;
    content += `  (lib_symbols\n`;
    content += getLibSymbols();
    content += `  )\n`;

    keys.forEach(k => {
        // Schematic placement based on Matrix (Row/Col) to ensure clean grid
        const row = k.key.matrix.row;
        const col = k.key.matrix.col;

        const baseX = OFFSET_X + col * KEY_SPACING_X;
        const baseY = OFFSET_Y + row * KEY_SPACING_Y;

        // 1. Switch Instance at (baseX, baseY)
        const sw_x = r(baseX);
        const sw_y = r(baseY);
        const sw_refY = r(baseY + 2.54);
        const sw_fpY = r(baseY + 5.08);

        content += `
  (symbol (lib_id "Switch:SW_Push") (at ${sw_x} ${sw_y} 0) (unit 1)
    (in_bom yes) (on_board yes) (fields_autoplaced yes)
    (uuid "${k.uuidSw}")
    (property "Reference" "${k.ref}" (at ${sw_x} ${sw_refY} 0))
    (property "Value" "SW_Push" (at ${sw_x} ${sw_fpY} 0) (effects (font (size 1.27 1.27)) hide))
    (property "Footprint" "Button_Switch_Keyboard:SW_Cherry_MX_1.00u_Plate" (at ${sw_x} ${sw_fpY} 0) (effects (font (size 1.27 1.27)) hide))
    (pin "1" (uuid "${k.uuidPin1}"))
    (pin "2" (uuid "${k.uuidPin2}"))
  )
`;

        // 2. Diode Instance at (baseX + 20.32, baseY)
        // Rotated 180 degrees so Anode (Pin 2) faces left (towards Switch)
        const d_baseX = baseX + 20.32;
        const d_baseY = baseY;
        const d_x = r(d_baseX);
        const d_y = r(d_baseY);
        const d_refY = r(d_baseY + 2.54);

        content += `
  (symbol (lib_id "Device:D_Small") (at ${d_x} ${d_y} 180) (unit 1)
    (in_bom yes) (on_board yes) (fields_autoplaced yes)
    (uuid "${k.uuidDiode}")
    (property "Reference" "${k.diodeRef}" (at ${d_x} ${d_refY} 0))
    (property "Value" "D" (at ${d_x} ${d_y} 0) (effects (font (size 1.27 1.27)) hide))
    (property "Footprint" "Diode_SMD:D_SOD-123" (at ${d_x} ${d_y} 0) (effects (font (size 1.27 1.27)) hide))
    (pin "1" (uuid "${k.uuidDiodePin1}"))
    (pin "2" (uuid "${k.uuidDiodePin2}"))
  )
`;

        // 3. Wires and Labels

        // A. ROW Connection
        // Switch Pin 1 is at (baseX - 5.08, baseY)
        // Wire from (baseX - 5.08, baseY) to (baseX - 7.62, baseY) length 2.54
        const row_start_x = r(baseX - 5.08);
        const row_end_x = r(baseX - 7.62);
        const row_y = r(baseY);

        content += `
  (wire (pts (xy ${row_start_x} ${row_y}) (xy ${row_end_x} ${row_y}))
    (stroke (width 0) (type solid) (color 0 0 0 0))
    (uuid "${crypto.randomUUID()}")
  )
`;
        // Label ROW at (baseX - 7.62, baseY)
        content += `
  (label "${k.netRowName}" (at ${row_end_x} ${row_y} 180) (fields_autoplaced yes)
    (effects (font (size 1.27 1.27)) (justify right))
    (uuid "${crypto.randomUUID()}")
  )
`;

        // B. Internal Connection (Switch -> Diode)
        // Switch Pin 2 is at (baseX + 5.08, baseY)
        // Diode Pin 2 (Anode) is at (baseX + 20.32 + 3.81, baseY) IF ROTATION 0
        // BUT ROTATION IS 180.
        // Diode at (X, Y) rot 180:
        // Pin 2 (Anode, orig +3.81) becomes (X - 3.81, Y).
        // Pin 1 (Cathode, orig -3.81) becomes (X + 3.81, Y).
        //
        // So:
        // Switch Pin 2: (baseX + 5.08)
        // Diode Pin 2: (baseX + 20.32 - 3.81) = (baseX + 16.51)
        // Wire from (baseX + 5.08) to (baseX + 16.51)

        const internal_start_x = r(baseX + 5.08);
        const internal_end_x = r(baseX + 20.32 - 3.81);
        const internal_y = r(baseY);

        content += `
  (wire (pts (xy ${internal_start_x} ${internal_y}) (xy ${internal_end_x} ${internal_y}))
    (stroke (width 0) (type solid) (color 0 0 0 0))
    (uuid "${crypto.randomUUID()}")
  )
`;

        // C. COL Connection
        // Diode Pin 1 (Cathode) is at (baseX + 20.32 + 3.81) = (baseX + 24.13)
        // Wire from (baseX + 24.13) to (baseX + 24.13 + 2.54) = (baseX + 26.67)

        const col_start_x = r(baseX + 20.32 + 3.81);
        const col_end_x = r(baseX + 26.67);
        const col_y = r(baseY);

        content += `
  (wire (pts (xy ${col_start_x} ${col_y}) (xy ${col_end_x} ${col_y}))
    (stroke (width 0) (type solid) (color 0 0 0 0))
    (uuid "${crypto.randomUUID()}")
  )
`;
        // Label COL at (baseX + 26.67)
        content += `
  (label "${k.netColName}" (at ${col_end_x} ${col_y} 0) (fields_autoplaced yes)
    (effects (font (size 1.27 1.27)) (justify left))
    (uuid "${crypto.randomUUID()}")
  )
`;

    });

    content += `)\n`;

    // Ensure no markdown code blocks or backticks are present in the output
    // Also remove any AI citation tags like <source>...</source>
    const cleanContent = content
        .replace(/<source>[\s\S]*?<\/source>/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/`/g, '');

    return cleanContent.trim();
}

function getLibSymbols(): string {
    return `
    (symbol "Switch:SW_Push" (pin_names (offset 1.016)) (in_bom yes) (on_board yes)
      (property "Reference" "SW" (at 0 2.54 0) (effects (font (size 1.27 1.27))))
      (property "Value" "SW_Push" (at 0 -2.54 0) (effects (font (size 1.27 1.27))))
      (symbol "SW_Push_1_1"
        (polyline
          (pts
            (xy -1.27 0)
            (xy 1.27 0)
          )
          (stroke (width 0) (type default))
          (fill (type none))
        )
        (pin passive line (at -5.08 0 0) (length 2.54)
          (name "1" (effects (font (size 1.27 1.27))))
          (number "1" (effects (font (size 1.27 1.27))))
        )
        (pin passive line (at 5.08 0 180) (length 2.54)
          (name "2" (effects (font (size 1.27 1.27))))
          (number "2" (effects (font (size 1.27 1.27))))
        )
      )
    )
    (symbol "Device:D_Small" (pin_names (offset 1.016)) (in_bom yes) (on_board yes)
      (property "Reference" "D" (at 0 2.54 0) (effects (font (size 1.27 1.27))))
      (property "Value" "D_Small" (at 0 -2.54 0) (effects (font (size 1.27 1.27))))
      (symbol "D_Small_1_1"
        (polyline
          (pts
            (xy -1.27 1.27)
            (xy -1.27 -1.27)
            (xy 1.27 0)
            (xy -1.27 1.27)
          )
          (stroke (width 0.254) (type default))
          (fill (type none))
        )
        (polyline
          (pts
            (xy 1.27 1.27)
            (xy 1.27 -1.27)
          )
          (stroke (width 0.254) (type default))
          (fill (type none))
        )
        (pin passive line (at -3.81 0 0) (length 2.54)
          (name "K" (effects (font (size 1.27 1.27))))
          (number "1" (effects (font (size 1.27 1.27))))
        )
        (pin passive line (at 3.81 0 180) (length 2.54)
          (name "A" (effects (font (size 1.27 1.27))))
          (number "2" (effects (font (size 1.27 1.27))))
        )
      )
    )`;
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
