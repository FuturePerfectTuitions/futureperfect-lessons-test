from pathlib import Path

path = Path('src/styles.css')
css = path.read_text()
replacements = {
    '@media(max-width:720px)': '@media (max-width: 720px)',
    '@media(max-width:420px)': '@media (max-width: 420px)',
    'grid-template-columns:minmax(0,1fr) 118px': 'grid-template-columns: minmax(0,1fr) 118px',
    '@media print{body{display:none!important}}': '@media print { body { display: none !important; } }',
}
for old, new in replacements.items():
    css = css.replace(old, new)
path.write_text(css)
