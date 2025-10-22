import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from './ui/drawer';
import { Button } from './ui/button';
import { useIncidentCreateStore } from '../store/incident-create-store';
import { IncidentForm } from './IncidentForm';
// incident-create-store used inside component

export function IncidentCreateDrawer() {
  const { isOpen, open, close, coordinates, beginLocationSelection, isSelectingLocation } =
    useIncidentCreateStore();

  return (
    <Drawer open={isOpen} onOpenChange={(openState: boolean) => (openState ? open() : close())}>
      <div className="flex items-center gap-2">
        <DrawerTrigger asChild>
          <Button variant="secondary" size="sm">
            New Incident
          </Button>
        </DrawerTrigger>
      </div>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create Incident</DrawerTitle>
          <DrawerDescription>Report a new incident using the form below.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isSelectingLocation ? 'secondary' : 'outline'}
              onClick={() => beginLocationSelection()}
            >
              {isSelectingLocation ? 'Selecting… Click map' : 'Pick location on map'}
            </Button>
            {coordinates && (
              <div className="text-sm text-muted-foreground">
                Selected: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </div>
            )}
          </div>
          <IncidentForm />
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="ghost">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
