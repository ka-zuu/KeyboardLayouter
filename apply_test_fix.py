import sys

with open('lib/kicad.test.ts', 'r') as f:
    content = f.read()

# 1. Update Col Label expectation
old_test_name = "it('generates global labels for COL with rotation 90'"
new_test_name = "it('generates global labels for COL with rotation 270'"
content = content.replace(old_test_name, new_test_name)

old_expect = '(global_label "COL_0" (shape input) (at 25.40 15.24 90)'
new_expect = '(global_label "COL_0" (shape input) (at 25.40 15.24 270)'
content = content.replace(old_expect, new_expect)

# 2. Add new test case
# We will append it after the updated expect line's closing brace/parenthesis block.
# Locate the end of the test block we just modified.
# "    });" follows the expect line.

# Since we updated the content, we look for the new expectation line.
# But exact whitespace might vary.
# Let's search for the line we just replaced: new_expect + ');'

search_marker = new_expect + "');"
if search_marker not in content:
    print("Could not find the modified expect line to insert after.")
    sys.exit(1)

# Find the closing "});" after this marker.
# It should be shortly after.
split_point = content.find(search_marker) + len(search_marker)
# Find next "});"
next_closing = content.find("});", split_point)
if next_closing == -1:
    print("Could not find closing brace for the test case.")
    sys.exit(1)

insert_pos = next_closing + 3 # After "});"

new_test_case = """

    it('places component text correctly', async () => {
        const blob = await generateKicadProjectZip(mockProject);
        const zip = await JSZip.loadAsync(blob);
        const sch = await zip.file('Test_Project.kicad_sch')?.async('string');

        // SW Reference: (at 35.56 21.59 0)
        expect(sch).toContain('(property "Reference" "SW1" (at 35.56 21.59 0))');

        // Diode Reference: (at 43.18 33.02 0)
        expect(sch).toContain('(property "Reference" "D1" (at 43.18 33.02 0))');
    });"""

content = content[:insert_pos] + new_test_case + content[insert_pos:]

with open('lib/kicad.test.ts', 'w') as f:
    f.write(content)

print("Applied test changes successfully")
