import os
import glob

# Mapa de reemplazos: doble-codificados -> correcto UTF-8
replacements = [
    # minúsculas con tilde
    ("Ã³", "ó"),
    ("Ã¡", "á"),
    ("Ã©", "é"),
    ("Ã­", "í"),
    ("Ãº", "ú"),
    ("Ã±", "ñ"),
    ("Ã¼", "ü"),
    # Mayúsculas con tilde
    ("Ã"", "Ó"),
    ("Ã\u0081", "Á"),
    ("Ã‰", "É"),
    ("Ã\u008d", "Í"),
    ("Ã\u009a", "Ú"),
    ("Ã'", "Ñ"),
    # Caracteres especiales
    ("â€¢", "•"),
    ("â€™", "'"),
    ('â€œ', '"'),
    ('â€\u009d', '"'),
    ("â€"", "–"),
    ("â€"", "—"),
    # Tildes en comentarios de código también (seguras de reemplazar)
    ("Ã³n", "ón"),
    ("cci\u00c3\u00b3n", "cción"),  # fallback por si acaso
]

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        print(f"  Skipped (not UTF-8): {filepath}")
        return False

    original = content
    for bad, good in replacements:
        content = content.replace(bad, good)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Buscar todos los .tsx y .ts en src/
src_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')
files = []
for ext in ['*.tsx', '*.ts']:
    files.extend(glob.glob(os.path.join(src_root, '**', ext), recursive=True))

fixed = 0
for filepath in files:
    if fix_file(filepath):
        print(f"Fixed: {os.path.relpath(filepath)}")
        fixed += 1

print(f"\nDone. {fixed} file(s) fixed.")
