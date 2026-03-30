import re
import sys

def convert_html_to_jsx(html):
    # Fix class -> className
    jsx = re.sub(r'\bclass=', 'className=', html)
    
    # Self-closing tags
    jsx = re.sub(r'<(img|input|br|hr|meta|link)([^>]*)>', r'<\1\2 />', jsx)
    
    # SVG fill-rule to fillRule
    jsx = re.sub(r'fill-rule=', 'fillRule=', jsx)
    jsx = re.sub(r'clip-rule=', 'clipRule=', jsx)
    jsx = re.sub(r'stroke-width=', 'strokeWidth=', jsx)
    jsx = re.sub(r'stroke-linecap=', 'strokeLinecap=', jsx)
    jsx = re.sub(r'stroke-linejoin=', 'strokeLinejoin=', jsx)
    jsx = re.sub(r'for=', 'htmlFor=', jsx)
    jsx = re.sub(r'xmlns:xlink=', 'xmlnsXlink=', jsx)
    
    # Style object conversion inline (basic heuristic)
    def style_repl(match):
        style_str = match.group(1)
        rules = style_str.split(';')
        obj = []
        for rule in rules:
            if ':' not in rule: continue
            k, v = rule.split(':', 1)
            k = k.strip()
            v = v.strip().replace("'", '"')
            
            # Convert kebab-case to camelCase
            parts = k.split('-')
            camel = parts[0] + ''.join(x.capitalize() for x in parts[1:])
            obj.append(f'{camel}: "{v}"')
        
        return "style={{" + ", ".join(obj) + "}}"

    jsx = re.sub(r'style="([^"]*)"', style_repl, jsx)
    
    # Special fix for inline unescaped characters
    jsx = jsx.replace('& ', '&amp; ')
    
    return jsx

with open('/tmp/stitch.html', 'r') as f:
    content = f.read()

# Extract body
body_match = re.search(r'<body[^>]*>(.*?)</body>', content, re.DOTALL)
if body_match:
    body_content = body_match.group(1)
else:
    body_content = content

jsx = convert_html_to_jsx(body_content)

wrapper = f"""import './App.css'

function App() {{
  return (
    <div className="bg-background text-on-background selection:bg-primary/30 font-body">
      {{/* Code adapted from Stitch MCP */}}
      {jsx}
    </div>
  )
}}

export default App
"""

with open('src/App.tsx', 'w') as f:
    f.write(wrapper)

print("App.tsx has been regenerated.")
