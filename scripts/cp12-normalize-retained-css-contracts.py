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
marker = '/* CP12 old-Portal-V2 collapsible lesson resource hierarchy */\n'
if marker not in css:
    css = marker + css
path.write_text(css)
