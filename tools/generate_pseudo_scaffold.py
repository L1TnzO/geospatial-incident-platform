import os
import re

SUMMARY_FILE = "codebase_summary.md"
PSEUDO_DIR = "Pseudo"

def parse_summary(file_path):
    """
    Parses the codebase_summary.md file to extract file paths and descriptions.
    Returns a list of dictionaries with 'path' and 'description'.
    """
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return []

    files_to_process = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Regex to capture the standard format: - **[path](path)**: Description
    # Also handles cases where the link text might differ slightly from the path
    # Pattern explanation:
    # - \*\*\[(.*?)\].*? : Matches the bold link text
    # \((.*?)\)\*\*: : Matches the URL part inside parens and the closing bold colon
    # \s*(.*) : Matches the description
    
    # Simpler regex based on the file content I saw:
    # - **[server/src/controllers/dashboardController.ts](server/src/controllers/dashboardController.ts)**: Endpoints for dashboard KPIs...
    
    pattern = re.compile(r'-\s*\*\*\[(.*?)\]\((.*?)\)\*\*:\s*(.*)')

    for line in lines:
        match = pattern.search(line)
        if match:
            # group(1) is the link text (often the path)
            # group(2) is the actual link path
            # group(3) is the description
            
            relative_path = match.group(2).strip()
            description = match.group(3).strip()
            
            # Filter out external links or non-file links if any (though most look like files)
            # We want to keep client/ and server/ files
            if relative_path.startswith('client/') or relative_path.startswith('server/'):
                files_to_process.append({
                    'path': relative_path,
                    'description': description
                })

    return files_to_process

def create_pseudo_file(file_info):
    """
    Creates a markdown file in the Pseudo directory mirroring the original path.
    """
    original_path = file_info['path']
    description = file_info['description']
    
    # Construct new path: Pseudo/original_path.md (appending .md)
    # e.g., Pseudo/server/src/index.ts.md
    
    # Ideally, maybe swap the extension? e.g. index.ts -> index.md? 
    # The user asked for "pseudocode of the logic of each of the files".
    # Usually "Pseudo/server/src/index.ts.md" is clearer that it maps to index.ts
    # Let's check if the user had a preference. "Cree un archivo markdown con cada archivo..."
    # "que se llame Pseudo... Que contenga el pseudocódigo..."
    
    # Let's replace the extension for cleaner names if possible, or append.
    # Appending is safer to avoid collisions if they have 'file.ts' and 'file.css' (unlikely here but good practice)
    # But for a clear map, let's just append .md for now.
    
    target_path = os.path.join(PSEUDO_DIR, original_path + ".md")
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    
    content = f"""# {original_path}

## Reference
Original File: [{original_path}]({original_path})

## Summary
{description}

## Pseudocode
```
/* 
   TODO: Logic flow for {os.path.basename(original_path)}
   
   1. ...
*/
```
"""
    
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Created: {target_path}")

def main():
    print(f"Reading from {SUMMARY_FILE}...")
    files = parse_summary(SUMMARY_FILE)
    print(f"Found {len(files)} files to scaffold.")
    
    if not files:
        print("No files found. Check regex or file content.")
        return

    print(f"Creating scaffolding in {PSEUDO_DIR}/...")
    for file_info in files:
        create_pseudo_file(file_info)
        
    print("Done.")

if __name__ == "__main__":
    main()
