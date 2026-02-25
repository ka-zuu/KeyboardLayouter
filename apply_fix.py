import sys

with open('lib/kicad.ts', 'r') as f:
    content = f.read()

# Fix 1: Col Label Rotation
old_1 = '(at ${r(x)} ${r(startY)} 90)'
new_1 = '(at ${r(x)} ${r(startY)} 270)'
if old_1 in content:
    content = content.replace(old_1, new_1)
else:
    print("Fix 1 not found")
    sys.exit(1)

# Fix 2: SW Ref Y
old_2 = 'const sw_refY = r(baseY + 2.54);'
new_2 = 'const sw_refY = r(baseY - 3.81);'
if old_2 in content:
    content = content.replace(old_2, new_2)
else:
    print("Fix 2 not found")
    sys.exit(1)

# Fix 3: Diode Ref
# We need to be careful with newlines and indentation in the multi-line string.
# I will use replace on specific lines if possible to avoid whitespace issues,
# or construct the string very carefully.

# Finding the Diode block start
search_str = 'const d_refY = r(baseY + 7.62 + 5.08); // Moved down'
if search_str not in content:
    print("Fix 3 (d_refY line) not found")
    sys.exit(1)

# Remove the line 'const d_refY ...'
# But we also need to change the usage.
# Usage: (property "Reference" "${k.diodeRef}" (at ${d_x} ${d_refY} 0))
# New usage: (property "Reference" "${k.diodeRef}" (at ${r(baseX + 17.78)} ${d_y} 0))

# 1. Remove definition
content = content.replace(search_str + '\n', '') # Remove line and newline? Or just replace with empty.
# If I remove it, the next line might have indentation.
# Let's replace it with empty string, leaving a blank line or adjust.
# Actually, the user instruction implies removing the variable.
# I will replace the line with empty string.

# 2. Update usage
usage_old = '(property "Reference" "${k.diodeRef}" (at ${d_x} ${d_refY} 0))'
usage_new = '(property "Reference" "${k.diodeRef}" (at ${r(baseX + 17.78)} ${d_y} 0))'

if usage_old in content:
    content = content.replace(usage_old, usage_new)
else:
    print("Fix 3 (usage) not found")
    sys.exit(1)

with open('lib/kicad.ts', 'w') as f:
    f.write(content)

print("Applied changes successfully")
