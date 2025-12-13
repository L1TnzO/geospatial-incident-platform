MÓDULO components/CollapsibleSidebar

IMPORTAR: FiltersPanel. UI Button.

COMPONENTE CollapsibleSidebar(props):

- PROPS: defaultOpen.
- ESTADO: isOpen.

- RENDER:
  - aside element: Width transition (w-80 vs w-0).
  - FiltersPanel container (hidden if closed).
  - Toggle Button (Absolute position): Chevron icon changes.
