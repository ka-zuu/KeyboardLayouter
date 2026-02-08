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
    const KEY_SPACING_X = 30.48; // 30.48mm
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

    // 1. Analyze Matrix Extents
    // We need continuous buses.
    // Map RowName -> { minCol, maxCol, rowY }
    // Map ColName -> { minRow, maxRow, colX }

    interface RowInfo { minCol: number; maxCol: number; visualRow: number; name: string; }
    interface ColInfo { minRow: number; maxRow: number; visualCol: number; name: string; }

    const rows = new Map<string, RowInfo>();
    const cols = new Map<string, ColInfo>();

    keys.forEach(k => {
        // Use physical position for layout to match visual grid
        const visualCol = Math.round(k.key.position.x);
        const visualRow = Math.round(k.key.position.y);

        // Row Info
        if (!rows.has(k.netRowName)) {
            rows.set(k.netRowName, { minCol: visualCol, maxCol: visualCol, visualRow, name: k.netRowName });
        } else {
            const r = rows.get(k.netRowName)!;
            r.minCol = Math.min(r.minCol, visualCol);
            r.maxCol = Math.max(r.maxCol, visualCol);
            // visualRow usually constant for same netRowName unless matrix is messy.
            // We trust the first one or should we update?
            // In a clean matrix, netRowName maps to Y. If messy, we might have multiple lines for same net.
            // For now assume clean mapping.
        }

        // Col Info
        if (!cols.has(k.netColName)) {
            cols.set(k.netColName, { minRow: visualRow, maxRow: visualRow, visualCol, name: k.netColName });
        } else {
            const c = cols.get(k.netColName)!;
            c.minRow = Math.min(c.minRow, visualRow);
            c.maxRow = Math.max(c.maxRow, visualRow);
        }
    });

    // 2. Draw Continuous Buses

    // Draw Row Buses
    rows.forEach(row => {
        // Line from (minCol * SPACING) - margin to (maxCol * SPACING) + margin
        // Y = OFFSET_Y + row * SPACING_Y + 15.24

        const y = OFFSET_Y + row.visualRow * KEY_SPACING_Y + 15.24;

        // Start X: Slightly left of the first key's switch connection point (baseX - 5.08)
        // Let's extend it a bit more to the left for the label.
        const startX = OFFSET_X + row.minCol * KEY_SPACING_X - 10.16;

        // End X: Slightly right of the last key's switch connection point.
        // Actually, the last key connects at (baseX - 5.08).
        // So the bus must reach at least there.
        // Let's extend it past the last key for aesthetics? Or just to the last key?
        // Let's extend to (baseX + 25.4) to cover the whole cell width of the last key.
        const endX = OFFSET_X + row.maxCol * KEY_SPACING_X + 25.4;

        content += `
  (wire (pts (xy ${r(startX)} ${r(y)}) (xy ${r(endX)} ${r(y)}))
    (stroke (width 0) (type solid) (color 0 0 0 0))
    (uuid "${crypto.randomUUID()}")
  )
`;
        // Row Label at the far left
        content += `
  (global_label "${row.name}" (shape input) (at ${r(startX)} ${r(y)} 180) (fields_autoplaced)
    (effects (font (size 1.27 1.27)) (justify right))
    (uuid "${crypto.randomUUID()}")
  )
`;
    });

    // Draw Col Buses
    cols.forEach(col => {
        // Line from (minRow * SPACING) - margin to (maxRow * SPACING) + margin
        // X = OFFSET_X + col * SPACING_X

        const x = OFFSET_X + col.visualCol * KEY_SPACING_X;

        // Start Y: Top. Above the first key. (baseY - 5.08)
        const startY = OFFSET_Y + col.minRow * KEY_SPACING_Y - 10.16;

        // End Y: Bottom. Below the last key's connection point.
        // Last key connects at (baseY + 20.32).
        const endY = OFFSET_Y + col.maxRow * KEY_SPACING_Y + 20.32;

        content += `
  (wire (pts (xy ${r(x)} ${r(startY)}) (xy ${r(x)} ${r(endY)}))
    (stroke (width 0) (type solid) (color 0 0 0 0))
    (uuid "${crypto.randomUUID()}")
  )
`;
        // Col Label at the top
        // Rotation changed to 90 (or 270 inverted? User asked "rotate 180").
        // Previous was 270. 270+180 = 450 = 90.
        // 90 degrees points UP.
        content += `
  (global_label "${col.name}" (shape input) (at ${r(x)} ${r(startY)} 90) (fields_autoplaced)
    (effects (font (size 1.27 1.27)) (justify right))
    (uuid "${crypto.randomUUID()}")
  )
`;
    });

    // 3. Components & Stub Connections
    keys.forEach(k => {
        const visualCol = Math.round(k.key.position.x);
        const visualRow = Math.round(k.key.position.y);

        const baseX = OFFSET_X + visualCol * KEY_SPACING_X;
        const baseY = OFFSET_Y + visualRow * KEY_SPACING_Y;

        // Switch at (baseX + 10.16, baseY)
        const sw_x = r(baseX + 10.16);
        const sw_y = r(baseY);
        const sw_refY = r(baseY + 2.54);

        content += `
  (symbol (lib_id "Switch:SW_Push") (at ${sw_x} ${sw_y} 0) (unit 1)
    (in_bom yes) (on_board yes) (fields_autoplaced yes)
    (uuid "${k.uuidSw}")
    (property "Reference" "${k.ref}" (at ${sw_x} ${sw_refY} 0))
    (property "Value" "SW_Push" (at ${sw_x} ${r(baseY + 5.08)} 0) (effects (font (size 1.27 1.27)) hide))
    (property "Footprint" "Button_Switch_Keyboard:SW_Cherry_MX_1.00u_Plate" (at ${sw_x} ${r(baseY + 5.08)} 0) (effects (font (size 1.27 1.27)) hide))
    (pin "1" (uuid "${k.uuidPin1}"))
    (pin "2" (uuid "${k.uuidPin2}"))
  )
`;

        // Diode at (baseX + 15.24, baseY + 7.62) rotated 270
        // Fix text overlap: Move Reference/Value further away.
        // Current: at d_x, baseY + 7.62 + 2.54.
        // Move to + 5.08 or + 7.62?
        const d_x = r(baseX + 15.24);
        const d_y = r(baseY + 7.62);
        const d_refY = r(baseY + 7.62 + 5.08); // Moved down

        content += `
  (symbol (lib_id "Device:D_Small") (at ${d_x} ${d_y} 270) (unit 1)
    (in_bom yes) (on_board yes) (fields_autoplaced yes)
    (uuid "${k.uuidDiode}")
    (property "Reference" "${k.diodeRef}" (at ${d_x} ${d_refY} 0))
    (property "Value" "D" (at ${d_x} ${d_y} 0) (effects (font (size 1.27 1.27)) hide))
    (property "Footprint" "Diode_SMD:D_SOD-123" (at ${d_x} ${d_y} 0) (effects (font (size 1.27 1.27)) hide))
    (pin "1" (uuid "${k.uuidDiodePin1}"))
    (pin "2" (uuid "${k.uuidDiodePin2}"))
  )
`;

        // A. SW Pin 1 -> Vertical Bus Stub
        // Wire from SW Pin 1 (baseX + 5.08, baseY) to Bus (baseX, baseY)
        content += `
  (wire (pts (xy ${r(baseX + 5.08)} ${sw_y}) (xy ${r(baseX)} ${sw_y}))
    (stroke (width 0) (type solid) (color 0 0 0 0))
    (uuid "${crypto.randomUUID()}")
  )
`;
        // Junction at Bus (baseX, baseY)
        content += `
  (junction (at ${r(baseX)} ${sw_y}) (diameter 0) (color 0 0 0 0)
    (uuid "${crypto.randomUUID()}")
  )
`;

        // B. SW Pin 2 -> D Pin 2 (Internal)
        content += `
  (wire (pts (xy ${r(baseX + 15.24)} ${sw_y}) (xy ${r(baseX + 15.24)} ${r(baseY + 3.81)}))
    (stroke (width 0) (type solid) (color 0 0 0 0))
    (uuid "${crypto.randomUUID()}")
  )
`;

        // C. D Pin 1 -> Horizontal Bus Stub
        // Wire from D Pin 1 (baseX + 15.24, baseY + 11.43) to Bus (baseX + 15.24, baseY + 15.24)
        content += `
  (wire (pts (xy ${r(baseX + 15.24)} ${r(baseY + 11.43)}) (xy ${r(baseX + 15.24)} ${r(baseY + 15.24)}))
    (stroke (width 0) (type solid) (color 0 0 0 0))
    (uuid "${crypto.randomUUID()}")
  )
`;
        // Junction at Bus (baseX + 15.24, baseY + 15.24)
        content += `
  (junction (at ${r(baseX + 15.24)} ${r(baseY + 15.24)}) (diameter 0) (color 0 0 0 0)
    (uuid "${crypto.randomUUID()}")
  )
`;
    });

    content += `)\n`;

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
