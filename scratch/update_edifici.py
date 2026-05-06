import os
import re

dir_path = r'c:\Users\zeusp\Documents\3D_island_site\edifici'
for filename in os.listdir(dir_path):
    if filename.startswith('edificio-') and filename.endswith('.html'):
        file_path = os.path.join(dir_path, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = content.replace('href="/"', 'href="../index.html"')
        content = content.replace('href="/src/styles.css"', 'href="../src/styles.css"')
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filename}")
