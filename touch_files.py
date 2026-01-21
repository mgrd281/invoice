
import os

# Files to ignore
IGNORE_DIRS = {'.git', 'node_modules', '.next'}
IGNORE_EXTS = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.zip', '.gz', '.db', '.sqlite'}

def is_text_file(filepath):
    """Check if file is text by trying to read it."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            f.read(1024)
        return True
    except UnicodeDecodeError:
        return False

count = 0
for root, dirs, files in os.walk('.'):
    # Filter directories
    dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

    for file in files:
        filepath = os.path.join(root, file)
        ext = os.path.splitext(file)[1].lower()

        if ext in IGNORE_EXTS:
            continue

        if not is_text_file(filepath):
            continue

        try:
            with open(filepath, 'r+', encoding='utf-8') as f:
                content = f.read()
                # Trivial change: ensure single trailing newline, or toggle a space
                # If file ends with newline, strip it and add it back? No change.
                # Let's add a space to the last line if it's not empty?
                # Safer: format json/js/ts via tools?
                # Fallback: Just append a space to the end?
                # This might break check-sums or exact string matches.

                # Let's try to remove trailing whitespace from every line (good practice)
                # and ensure exactly one trailing newline.

                lines = content.splitlines()
                new_lines = [line.rstrip() for line in lines]
                new_content = '\n'.join(new_lines) + '\n'

                if new_content == content:
                    # Force a change if optimization didn't change anything
                    # We need to change the file to update the commit message.
                    # We can add a neutral comment to known file types, or just double newline at end?
                    new_content += '\n'

                f.seek(0)
                f.write(new_content)
                f.truncate()
                count += 1
        except Exception as e:
            print(f"Skipping {filepath}: {e}")

print(f"Touched {count} files.")
