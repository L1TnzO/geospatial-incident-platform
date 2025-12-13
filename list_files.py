import os

root_dirs = ['server/src', 'client/src']

for root_dir in root_dirs:
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude node_modules if present (though we are in src, shouldn't be there)
        if 'node_modules' in dirnames:
            dirnames.remove('node_modules')
        
        for f in filenames:
            if f.endswith(('.ts', '.tsx', '.js', '.jsx')) and not ('.test.' in f or '.spec.' in f or '__tests__' in dirpath):
                full_path = os.path.join(dirpath, f)
                print(full_path)
