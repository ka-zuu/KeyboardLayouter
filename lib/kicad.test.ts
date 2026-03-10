import { generateKicadProjectZip } from "./kicad";
import { ProjectData } from "@/types/mkd";
import JSZip from "jszip";

// Mock crypto if needed
if (!global.crypto) {
    Object.defineProperty(global, "crypto", {
        value: {
            randomUUID: () => `uuid-${Math.random()}`
        },
        writable: true
    });
} else if (!global.crypto.randomUUID) {
    // @ts-expect-error: fallback for missing randomUUID
    global.crypto.randomUUID = () => `uuid-${Math.random()}`;
}

describe("generateKicadProjectZip", () => {
    const mockProject: ProjectData = {
        id: "test-project",
        name: "Test Project",
        keys: [
            {
                id: "key1",
                position: { x: 0, y: 0 },
                size: { w: 1, h: 1 },
                angle: 0,
                rotationCenter: { x: 0, y: 0 },
                legends: { top: "", bottom: "", left: "", right: "" },
                matrix: { row: 0, col: 0 },
            },
            {
                id: "key2",
                position: { x: 2, y: 0 }, // Gap in column 1
                size: { w: 1, h: 1 },
                angle: 0,
                rotationCenter: { x: 0, y: 0 },
                legends: { top: "", bottom: "", left: "", right: "" },
                matrix: { row: 0, col: 2 },
            }
        ],
        createdAt: 0,
        updatedAt: 0,
    };

    it("generates a zip with 3 files", async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);

        const files = Object.keys(zip.files);
        expect(files).toContain("Test_Project.kicad_sch");
        expect(files).toContain("Test_Project.kicad_pcb");
        expect(files).toContain("Test_Project.kicad_pro");
    });

    it("generates continuous bus wires across gaps", async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file("Test_Project.kicad_sch")?.async("string");

        // Row 0 has keys at col 0 and col 2.
        // There should be a wire spanning from Col 0 area to Col 2 area.
        // X0 approx 25.4. X2 approx 25.4 + 2 * 30.48 = 86.36.
        // We expect a wire with start/end X covering this range.
        // Start X should be around 25.4 + 0 - 10.16 = 15.24
        // End X should be around 25.4 + 2*30.48 + 25.4 = 111.76

        expect(sch).toContain("(xy 15.24 40.64)"); // Start of row 0 wire
        expect(sch).toContain("(xy 111.76 40.64)"); // End of row 0 wire
    });

    it("generates global labels for COL with rotation 90", async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file("Test_Project.kicad_sch")?.async("string");

        // Y = 15.24 because we subtract 10.16 from offset 25.40 for bus extension
        expect(sch).toContain(`(global_label "COL_0" (shape bidirectional) (at 25.40 15.24 0)`);
    });

    it("output format is clean", async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file("Test_Project.kicad_sch")?.async("string");

        expect(sch!.trim().startsWith("(kicad_sch")).toBe(true);
        expect(sch).not.toContain("`");
        expect(sch).not.toContain("<source>");
    });

    it("uses updated symbol defaults", async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file("Test_Project.kicad_sch")?.async("string");

        // Check for new Lib IDs
        expect(sch).toContain("(lib_id \"Device:D\")");
        expect(sch).toContain("(lib_id \"kbd:SW_PUSH\")");

        // Check for updated Value properties
        expect(sch).toContain("(property \"Value\" \"D\"");
        expect(sch).toContain("(property \"Value\" \"SW_PUSH\"");
    });

    it("hides pin numbers and names, shows Value", async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file("Test_Project.kicad_sch")?.async("string");

        // Check for hidden pin names (Legacy D)
        expect(sch).toContain("(pin_names (offset 1.016) hide)");
        // Check for hidden pin names (New SW)
        expect(sch).toContain("(pin_names (offset 1.016) (hide yes))");

        // Check for hidden pin numbers (Legacy D)
        expect(sch).toContain("(pin_numbers hide)");
        // Check for hidden pin numbers (New SW)
        expect(sch).toContain("(pin_numbers (hide yes))");

        // Check for VISIBLE Value property (no hide keyword in effects)
        expect(sch).toContain("(property \"Value\" \"SW_PUSH\"");
        expect(sch).toContain("(property \"Value\" \"D\"");

        // Ensure "hide" is NOT present in the Value line
        expect(sch).not.toContain("(property \"Value\" \"SW_PUSH\" (at 0 -2.54 0) (effects (font (size 1.27 1.27)) hide))");
    });
});
