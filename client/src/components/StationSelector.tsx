import { useStationsData } from '../hooks/useStationsData';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export interface IncidentUnit {
    stationCode: string;
    stationName: string;
    assignmentRole: string;
    dispatchedAt: string;
    clearedAt: string;
}

interface StationSelectorProps {
    selectedUnits: IncidentUnit[];
    onChange: (units: IncidentUnit[]) => void;
}

export function StationSelector({ selectedUnits = [], onChange }: StationSelectorProps) {
    // Protección contra datos nulos
    const { stations = [], isLoading } = useStationsData({ isActive: true }) || { stations: [], isLoading: false };
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const getCurrentDateTimeLocal = () => {
        try {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            return now.toISOString().slice(0, 16);
        } catch (e) {
            return '';
        }
    };

    // --- CORRECCIÓN CLAVE AQUÍ ---
    const handleSelect = (station: any) => {
        if (!station) return;

        // INTENTAMOS OBTENER EL CÓDIGO DE VARIAS FORMAS POSIBLES
        // Esto arregla el error "undefined is already added"
        const rawCode = station.stationCode || station.code || station.id || station.station_code;
        const rawName = station.name || station.stationName || rawCode || 'Unknown Station';

        if (!rawCode) {
            console.error("Station object invalid:", station);
            return;
        }

        // Verificación de duplicados usando el código normalizado
        if (selectedUnits.some(u => u.stationCode === rawCode)) {
            toast.warning(`${rawCode} is already added.`);
            setInputValue('');
            setIsOpen(false);
            return;
        }

        const newUnit: IncidentUnit = {
            stationCode: rawCode,
            stationName: rawName,
            assignmentRole: 'Support',
            dispatchedAt: getCurrentDateTimeLocal(),
            clearedAt: ''
        };

        // Usamos Spread Operator para asegurar que React detecte el cambio de array
        onChange([...selectedUnits, newUnit]);

        setInputValue('');
        setIsOpen(false);
    };

    const handleRemove = (codeToRemove: string) => {
        onChange(selectedUnits.filter((u) => u.stationCode !== codeToRemove));
    };

    const handleUpdateField = (code: string, field: keyof IncidentUnit, value: string) => {
        onChange(selectedUnits.map(u =>
            u.stationCode === code ? { ...u, [field]: value } : u
        ));
    };

    // Filtrado seguro para la lista visual
    const filteredStations = Array.isArray(stations) ? stations.filter(s => {
        // Normalizamos también aquí para el filtro
        const code = s.stationCode || (s as any).code || (s as any).id || '';
        const name = s.name || '';
        const search = inputValue.toLowerCase();
        return name.toLowerCase().includes(search) || code.toLowerCase().includes(search);
    }).slice(0, 5) : [];

    return (
        <div className="space-y-3 relative">
            <div className="flex justify-between items-center">
                <Label>Response Units & Timings</Label>
                <span className="text-xs text-muted-foreground">{selectedUnits.length} assigned</span>
            </div>

            <div className="relative">
                <Input
                    placeholder={isLoading ? "Loading..." : "Add unit (Type 'B1')..."}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                    <Plus className="h-4 w-4" />
                </div>

                {isOpen && inputValue && (
                    <div className="absolute z-50 w-full bg-popover text-popover-foreground rounded-md border shadow-lg mt-1 max-h-60 overflow-auto">
                        {filteredStations.length > 0 ? (
                            filteredStations.map((station, idx) => {
                                // Normalizamos para visualización
                                const displayCode = station.stationCode || (station as any).code || (station as any).id;
                                const displayName = station.name;

                                return (
                                    <div
                                        key={`${displayCode}-${idx}`}
                                        className="px-3 py-2 cursor-pointer text-sm border-b hover:bg-muted flex justify-between items-center"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelect(station);
                                        }}
                                    >
                                        <div>
                                            <span className="font-bold mr-2">{displayCode}</span>
                                            <span className="text-muted-foreground">{displayName}</span>
                                        </div>
                                        <Plus className="h-3 w-3 text-primary" />
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-3 text-xs text-center text-muted-foreground">No stations found.</div>
                        )}
                    </div>
                )}
            </div>

            {selectedUnits.length > 0 && (
                <div className="border rounded-md overflow-hidden overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="h-8 min-w-[80px]">Unit</TableHead>
                                <TableHead className="h-8 min-w-[100px]">Role</TableHead>
                                <TableHead className="h-8 min-w-[130px]">Times</TableHead>
                                <TableHead className="h-8 w-[30px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedUnits.map((unit) => (
                                <TableRow key={unit.stationCode}>
                                    <TableCell className="py-2 align-top font-medium text-xs">
                                        {unit.stationCode}
                                        <div className="text-[10px] text-muted-foreground truncate w-24">
                                            {unit.stationName}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2 align-top">
                                        <Input
                                            className="h-7 text-xs px-2"
                                            value={unit.assignmentRole}
                                            onChange={(e) => handleUpdateField(unit.stationCode, 'assignmentRole', e.target.value)}
                                            placeholder="Role"
                                        />
                                    </TableCell>
                                    <TableCell className="py-2 align-top space-y-1">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] w-6 text-muted-foreground">Out:</span>
                                            <Input
                                                type="datetime-local"
                                                className="h-6 text-[10px] p-1 w-full"
                                                value={unit.dispatchedAt}
                                                onChange={(e) => handleUpdateField(unit.stationCode, 'dispatchedAt', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] w-6 text-muted-foreground">In:</span>
                                            <Input
                                                type="datetime-local"
                                                className="h-6 text-[10px] p-1 w-full"
                                                value={unit.clearedAt}
                                                onChange={(e) => handleUpdateField(unit.stationCode, 'clearedAt', e.target.value)}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2 text-right align-top">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRemove(unit.stationCode)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}