MÓDULO components/NoteSelector

IMPORTAR: UI Textarea, Button, List.

COMPONENTE NoteSelector(props):

- PROPS: notes[], onChange.
- ESTADO: newNote (author, content).

- HANDLERS: Add with timestamp generation, Remove index.

- RENDER:
  - Input Author + Textarea Note + Add Button.
  - ScrollArea con lista de notas existentes (format date).
