import { useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { X, Plus, Package } from 'lucide-react';
import { toast } from 'sonner';

export interface IncidentAsset {
    assetIdentifier: string;
    assetType: string;
    status: string;
    notes: string;
}

interface AssetSelectorProps {
    selectedAssets: IncidentAsset[];
    onChange: (assets: IncidentAsset[]) => void;
}

const ASSET_TYPES = ['Vehicle', 'Equipment', 'Aircraft', 'Marine', 'Personnel', 'Other'];
const ASSET_STATUSES = ['Active', 'Standby', 'Maintenance', 'Released', 'Damaged'];

export function AssetSelector({ selectedAssets = [], onChange }: AssetSelectorProps) {
    // Estado para el nuevo activo que se está escribiendo
    const [newAsset, setNewAsset] = useState<IncidentAsset>({
        assetIdentifier: '',
        assetType: 'Equipment',
        status: 'Active',
        notes: ''
    });

    const handleAdd = () => {
        if (!newAsset.assetIdentifier.trim()) {
            toast.warning("Asset Identifier is required");
            return;
        }

        // Evitar duplicados por ID
        if (selectedAssets.some(a => a.assetIdentifier.toLowerCase() === newAsset.assetIdentifier.toLowerCase())) {
            toast.warning(`Asset '${newAsset.assetIdentifier}' is already added.`);
            return;
        }

        onChange([...selectedAssets, newAsset]);

        // Resetear formulario (mantenemos tipo y estado por comodidad)
        setNewAsset({
            ...newAsset,
            assetIdentifier: '',
            notes: ''
        });
    };

    const handleRemove = (identifier: string) => {
        onChange(selectedAssets.filter(a => a.assetIdentifier !== identifier));
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <Label>Equipment & Assets</Label>
                <span className="text-xs text-muted-foreground">{selectedAssets.length} assets</span>
            </div>

            {/* Formulario de Ingreso (En línea) */}
            <div className="grid grid-cols-12 gap-2 p-3 border rounded-md bg-muted/20">
                <div className="col-span-3">
                    <Label className="text-[10px] text-muted-foreground uppercase">ID / Name</Label>
                    <Input
                        placeholder="e.g. Drone-1"
                        className="h-8 text-xs"
                        value={newAsset.assetIdentifier}
                        onChange={(e) => setNewAsset({ ...newAsset, assetIdentifier: e.target.value })}
                    />
                </div>
                <div className="col-span-3">
                    <Label className="text-[10px] text-muted-foreground uppercase">Type</Label>
                    <Select
                        value={newAsset.assetType}
                        onValueChange={(v) => setNewAsset({ ...newAsset, assetType: v })}
                    >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="col-span-3">
                    <Label className="text-[10px] text-muted-foreground uppercase">Status</Label>
                    <Select
                        value={newAsset.status}
                        onValueChange={(v) => setNewAsset({ ...newAsset, status: v })}
                    >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {ASSET_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="col-span-3 flex items-end gap-2">
                    <div className="flex-1">
                        <Label className="text-[10px] text-muted-foreground uppercase">Notes</Label>
                        <Input
                            placeholder="Optional notes"
                            className="h-8 text-xs"
                            value={newAsset.notes}
                            onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                        />
                    </div>
                    <Button type="button" size="icon" className="h-8 w-8 shrink-0" onClick={handleAdd}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Tabla de Activos */}
            {selectedAssets.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="h-8 py-1">ID</TableHead>
                                <TableHead className="h-8 py-1">Type</TableHead>
                                <TableHead className="h-8 py-1">Status</TableHead>
                                <TableHead className="h-8 py-1">Notes</TableHead>
                                <TableHead className="h-8 py-1 w-[30px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedAssets.map((asset, idx) => (
                                <TableRow key={`${asset.assetIdentifier}-${idx}`}>
                                    <TableCell className="py-2 font-medium text-xs">{asset.assetIdentifier}</TableCell>
                                    <TableCell className="py-2 text-xs">{asset.assetType}</TableCell>
                                    <TableCell className="py-2 text-xs">{asset.status}</TableCell>
                                    <TableCell className="py-2 text-xs text-muted-foreground">{asset.notes || '-'}</TableCell>
                                    <TableCell className="py-2 text-right">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRemove(asset.assetIdentifier)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md bg-muted/5 flex items-center justify-center gap-2">
                    <Package className="h-4 w-4 opacity-50" /> No assets added yet.
                </div>
            )}
        </div>
    );
}