
import os
import re

files_to_fix = [
    "app/dashboard/features-data.tsx",
    "app/dashboard/page.tsx",
    "app/digital-products/[id]/page.tsx",
    "app/digital-products/new/page.tsx",
    "app/digital-products/page.tsx",
    "app/invoices/[id]/page.tsx",
    "app/invoices/page.tsx",
    "app/landing/page.tsx",
    "app/settings/kaufland/page.tsx",
    "app/settings/page.tsx",
    "lib/digital-products.ts"
]

# Regex to find conflict blocks
# <<<<<<< HEAD
# Content from HEAD
# =======
# Content from Incoming
# >>>>>>> hash
pattern = re.compile(r'<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>> [a-f0-9]+', re.DOTALL)

for rel_path in files_to_fix:
    path = os.path.abspath(os.path.join(os.getcwd(), rel_path))
    if not os.path.exists(path):
        print(f"File not found: {path}")
        continue
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if file has markers
    if '<<<<<<< HEAD' not in content:
        print(f"No conflict markers in {rel_path}")
        continue
        
    print(f"Fixing {rel_path}...")
    
    # Replace keeping HEAD content
    # Note: Regex might be tricky if "Content from HEAD" is empty or multiple lines
    # The pattern (.*?) is non-greedy, so it should stop at the first =======
    # But wait, what if `=======` is missing or malformed?
    # Also need to handle possible surrounding newlines.
    
    # Let's use a simpler approach: splitting or line-by-line state machine
    
    lines = content.splitlines(keepends=True)
    new_lines = []
    in_conflict = False
    in_head = False
    in_incoming = False
    
    for line in lines:
        if line.startswith('<<<<<<< HEAD'):
            in_conflict = True
            in_head = True
            in_incoming = False
            continue
        elif line.startswith('=======') and in_conflict:
            in_head = False
            in_incoming = True
            continue
        elif line.startswith('>>>>>>> ') and in_conflict:
            in_conflict = False
            in_head = False
            in_incoming = False
            continue
            
        if in_conflict:
            if in_head:
                new_lines.append(line)
            # If in_incoming, skip line
        else:
            new_lines.append(line)
            
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
        
    print(f"Fixed {rel_path}")

print("Done.")
