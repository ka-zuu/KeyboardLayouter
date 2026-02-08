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
    // Basic Header
    let content = `(kicad_sch (version 20231120) (generator "mkd_export")\n`;
    content += `  (paper "A4")\n`;
    content += `  (lib_symbols\n`;
    content += getLibSymbols();
    content += `  )\n`;

    keys.forEach(k => {
        // Coordinate conversion
        // 1u = 19.05mm.
        // SCH coords: X positive right, Y positive down (same as PCB).
        // To place inside the paper (default A4), we add an offset.
        // A4 is roughly 297mm x 210mm. Center is around 150, 100.
        // We add offset 50, 50 to ensure we are not on the edge.
        const OFFSET_X = 50;
        const OFFSET_Y = 50;

        const x_mm = k.key.position.x * 19.05;
        const y_mm = k.key.position.y * 19.05;

        const x_sch = (x_mm + OFFSET_X).toFixed(2);
        const y_sch = (y_mm + OFFSET_Y).toFixed(2); // No inversion, just offset

        // Switch Instance
        const refY = (parseFloat(y_sch) + 2.54).toFixed(2);
        const fpY = (parseFloat(y_sch) + 5.08).toFixed(2);

        // Switch symbol
        // (pin ...) entries in symbol instance must NOT contain (connect ...) in KiCad 6+
        // Connections are defined by overlapping pins or wires/labels at the same coordinate.
        // We will place LABELS or WIRES to connect them.
        // Or actually, KiCad implicitly connects overlapping items.
        // But to make explicit nets, we place LABELs at the pin coordinates.
        //
        // Switch Pin 1 is at (-5.08, 0) relative to symbol center (x_sch, y_sch).
        // Switch Pin 2 is at (5.08, 0) relative to symbol center.
        //
        // We need to calculate absolute coordinates for the labels.
        // Note: Coordinates in 'at' are X Y Rotation.
        // Relative offsets need to be added.
        // Pin 1 Abs X = x_sch - 5.08
        // Pin 2 Abs X = x_sch + 5.08

        const sw_pin1_x = (parseFloat(x_sch) - 5.08).toFixed(2);
        const sw_pin2_x = (parseFloat(x_sch) + 5.08).toFixed(2);
        const sw_pin_y = y_sch;

        content += `
  (symbol (lib_id "Switch:SW_Push") (at ${x_sch} ${y_sch} 0) (unit 1)
    (in_bom yes) (on_board yes) (fields_autoplaced yes)
    (uuid "${k.uuidSw}")
    (property "Reference" "${k.ref}" (at ${x_sch} ${refY} 0))
    (property "Value" "SW_Push" (at ${x_sch} ${fpY} 0) (effects (font (size 1.27 1.27)) hide))
    (property "Footprint" "Button_Switch_Keyboard:SW_Cherry_MX_1.00u_Plate" (at ${x_sch} ${fpY} 0) (effects (font (size 1.27 1.27)) hide))
    (pin "1" (uuid "${k.uuidPin1}"))
    (pin "2" (uuid "${k.uuidPin2}"))
  )
`;
        // Labels for Switch connections
        // Pin 1 -> ROW
        content += `
  (label "${k.netRowName}" (at ${sw_pin1_x} ${sw_pin_y} 180) (fields_autoplaced yes)
    (effects (font (size 1.27 1.27)) (justify right))
    (uuid "${crypto.randomUUID()}")
  )
`;
        // Pin 2 -> MID (Net-SWx-Pad2)
        // We place a local label or global label? "Net-" implies local usually.
        content += `
  (label "${k.netMidName}" (at ${sw_pin2_x} ${sw_pin_y} 0) (fields_autoplaced yes)
    (effects (font (size 1.27 1.27)) (justify left))
    (uuid "${crypto.randomUUID()}")
  )
`;

        // Diode Instance
        // Place it offset by 12.7mm (0.5 inch) to avoid overlap.
        // Diode symbol pins:
        // Pin 1 (K) at -3.81
        // Pin 2 (A) at 3.81

        const d_x_sch = (parseFloat(x_sch) + 12.7).toFixed(2); // Increased spacing
        const d_y_sch = y_sch;
        const d_refY = (parseFloat(d_y_sch) + 2.54).toFixed(2);

        const d_pin1_x = (parseFloat(d_x_sch) - 3.81).toFixed(2); // Pin 1 (Cathode)
        const d_pin2_x = (parseFloat(d_x_sch) + 3.81).toFixed(2); // Pin 2 (Anode)

        content += `
  (symbol (lib_id "Device:D_Small") (at ${d_x_sch} ${d_y_sch} 0) (unit 1)
    (in_bom yes) (on_board yes) (fields_autoplaced yes)
    (uuid "${k.uuidDiode}")
    (property "Reference" "${k.diodeRef}" (at ${d_x_sch} ${d_refY} 0))
    (property "Value" "D" (at ${d_x_sch} ${d_y_sch} 0) (effects (font (size 1.27 1.27)) hide))
    (property "Footprint" "Diode_SMD:D_SOD-123" (at ${d_x_sch} ${d_y_sch} 0) (effects (font (size 1.27 1.27)) hide))
    (pin "1" (uuid "${k.uuidDiodePin1}"))
    (pin "2" (uuid "${k.uuidDiodePin2}"))
  )
`;

        // Labels for Diode connections
        // Pin 2 (Anode) -> MID (Net-SWx-Pad2)
        // Note: Diode Pin 2 is at +3.81 (Right side of diode symbol).
        // Wait, standard diode symbol: Pin 2 is Anode.
        // In "Device:D_Small" definition below:
        // Pin 2 is at +3.81 (Right).
        // Pin 1 is at -3.81 (Left).
        // Usually, current flows Anode -> Cathode.
        // Matrix: Row -> Switch -> Diode Anode -> Diode Cathode -> Col.
        // Switch Pin 2 (Right) connects to Diode Anode (Right?).
        // If we place diode to the right of switch...
        // Switch Pin 2 is at X+5.08.
        // Diode is at X+12.7.
        // Diode Pin 1 (Left, Cathode) is at 12.7 - 3.81 = 8.89.
        // Diode Pin 2 (Right, Anode) is at 12.7 + 3.81 = 16.51.
        //
        // Topology requested: Row -> Switch -> Diode -> Col.
        // Switch Pin 2 -> Diode Pin 2 (Anode).
        // So we connect Switch Pin 2 (Label MID) and Diode Pin 2 (Label MID).
        // Diode Pin 1 (Cathode) -> Col.

        // Label for MID at Diode Pin 2 (Right side of Diode)
        content += `
  (label "${k.netMidName}" (at ${d_pin2_x} ${d_y_sch} 0) (fields_autoplaced yes)
    (effects (font (size 1.27 1.27)) (justify left))
    (uuid "${crypto.randomUUID()}")
  )
`;

        // Label for COL at Diode Pin 1 (Left side of Diode)
        content += `
  (label "${k.netColName}" (at ${d_pin1_x} ${d_y_sch} 180) (fields_autoplaced yes)
    (effects (font (size 1.27 1.27)) (justify right))
    (uuid "${crypto.randomUUID()}")
  )
`;

    });

    content += `)\n`;

    // Ensure no markdown code blocks or backticks are present in the output
    // Also remove any AI citation tags like <source>...</source>
    // We use a broader regex to catch any tag-like structures that might be hallucinated,
    // assuming valid KiCad S-expressions won't contain angle brackets in this context.
    const cleanContent = content
        .replace(/<source>[\s\S]*?<\/source>/g, '')
        .replace(/<[^>]+>/g, '') // Aggressively strip other XML-like tags
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
