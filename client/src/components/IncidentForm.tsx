import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useIncidentMetadataQuery } from '../hooks/useIncidentMetadataQuery';
import { useCreateIncident } from '../hooks/useCreateIncident';
import { useIncidentCreateStore } from '../store/incident-create-store';

// Importamos los 3 selectores especializados
import { StationSelector, type IncidentUnit } from './StationSelector';
import { AssetSelector, type IncidentAsset } from './AssetSelector';
import { NoteSelector, type IncidentNote } from './NoteSelector';

const STATUS_OPTIONS = [
  { code: 'REPORTED', label: 'Reported (Awaiting dispatch)' },
  { code: 'DISPATCHED', label: 'Dispatched (Units en route)' },
  { code: 'ON_SCENE', label: 'On Scene (Response underway)' },
  { code: 'RESOLVED', label: 'Resolved (Closed)' },
  { code: 'CANCELLED', label: 'Cancelled' },
];

export function IncidentForm() {
  const navigate = useNavigate();
  const metadataQuery = useIncidentMetadataQuery();
  const createMutation = useCreateIncident();
  const { coordinates, close } = useIncidentCreateStore();
  const typeOptions = metadataQuery.data?.types ?? [];
  const severityOptions = metadataQuery.data?.severities ?? [];

  // --- ESTADO DEL FORMULARIO ---
  const [formData, setFormData] = useState({
    type: '',
    severity: '',
    statusCode: 'REPORTED',
    isActive: 'true',
    date: '',
    time: '',
    title: '',         // Título obligatorio (Short Description)
    narrative: '',     // Narrativa opcional
    latitude: '',
    longitude: '',
  });

  // Estados para las listas complejas (Arrays)
  const [selectedUnits, setSelectedUnits] = useState<IncidentUnit[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<IncidentAsset[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<IncidentNote[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sincronizar coordenadas desde el mapa
  useEffect(() => {
    if (coordinates) {
      setFormData((prev) => ({
        ...prev,
        latitude: coordinates.lat.toString(),
        longitude: coordinates.lng.toString(),
      }));
    }
  }, [coordinates]);

  // --- VALIDACIÓN ---
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) newErrors.type = 'Incident type is required';
    if (!formData.severity) newErrors.severity = 'Severity is required';
    if (!formData.statusCode) newErrors.statusCode = 'Status is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';

    // El título es obligatorio, la narrativa no
    if (!formData.title) newErrors.title = 'Short description (Title) is required';

    if (!formData.latitude) newErrors.latitude = 'Location is required (Pick on map)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- ENVÍO ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      if (!formData.latitude || !formData.longitude) {
        toast.error('Please pick a location on the map.');
        return;
      }

      // Construcción del Payload
      const payload = {
        incidentNumber: `INC-${Date.now()}`,

        // Campos principales
        title: formData.title,
        typeCode: formData.type,
        severityCode: formData.severity,
        statusCode: formData.statusCode,
        isActive: formData.isActive === 'true',
        occurrenceAt: new Date(`${formData.date}T${formData.time}`).toISOString(),
        reportedAt: new Date().toISOString(),

        // Ubicación
        location: {
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
        },
        address: `Lat: ${Number(formData.latitude).toFixed(4)}, Lng: ${Number(formData.longitude).toFixed(4)}`,

        // Narrativa
        narrative: formData.narrative,

        // Metadatos Estructurados (Aquí guardamos todo lo extra)
        metadata: {
          response_units: selectedUnits.map(u => ({
            station_code: u.stationCode,
            role: u.assignmentRole,
            dispatched_at: u.dispatchedAt,
            cleared_at: u.clearedAt
          })),
          equipment_assets: selectedAssets,
          field_notes: selectedNotes,

          generated_address: `Lat: ${Number(formData.latitude).toFixed(4)}, Lng: ${Number(formData.longitude).toFixed(4)}`
        }
      };

      createMutation.mutate(payload as any, {
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to create incident.';
          toast.error(message);
        },
        onSuccess: () => {
          toast.success('Incident created successfully!');
          close();
          // Opcional: Redirigir al mapa
          // navigate('/map'); 
        },
      });
    } else {
      toast.error('Please fix validation errors');
    }
  };

  const handleCancel = () => {
    close();
    navigate('/map');
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-10">
      <Card>
        <CardHeader>
          <CardTitle>Incident Report</CardTitle>
          <CardDescription>
            Enter incident details. Location address will be auto-detected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Fila 1: Tipo y Severidad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Incident Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: string) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type" className={errors.type ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type.code} value={type.code}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value: string) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger id="severity" className={errors.severity ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map((severity) => (
                      <SelectItem key={severity.code} value={severity.code}>{severity.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.severity && <p className="text-sm text-destructive">{errors.severity}</p>}
              </div>
            </div>

            {/* Fila 2: Estatus y Activo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Current Status *</Label>
                <Select
                  value={formData.statusCode}
                  onValueChange={(value: string) => setFormData({ ...formData, statusCode: value })}
                >
                  <SelectTrigger id="status" className={errors.statusCode ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.code} value={status.code}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="active">Is Active? *</Label>
                <Select
                  value={formData.isActive}
                  onValueChange={(value: string) => setFormData({ ...formData, isActive: value })}
                >
                  <SelectTrigger id="active"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes (Active)</SelectItem>
                    <SelectItem value="false">No (Inactive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fila 3: Fecha y Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date" type="date" value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={errors.date ? 'border-destructive' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time" type="time" value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className={errors.time ? 'border-destructive' : ''}
                />
              </div>
            </div>

            {/* Título (Short Description) */}
            <div className="space-y-2">
              <Label htmlFor="title">Short Description / Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Structure Fire on Main St."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            {/* Narrativa (Opcional) */}
            <div className="space-y-2">
              <Label htmlFor="narrative">Incident Narrative (Optional)</Label>
              <Textarea
                id="narrative"
                placeholder="Detailed timeline of events and observations..."
                value={formData.narrative}
                onChange={(e) => setFormData({ ...formData, narrative: e.target.value })}
                rows={4}
              />
            </div>

            {/* --- SECCIÓN OPERATIVA (Los 3 Selectores) --- */}
            <div className="space-y-6 pt-4 border-t">
              <h3 className="text-sm font-medium">Operational Details (Optional)</h3>

              {/* 1. Unidades */}
              <StationSelector
                selectedUnits={selectedUnits}
                onChange={setSelectedUnits}
              />

              {/* 2. Activos */}
              <AssetSelector
                selectedAssets={selectedAssets}
                onChange={setSelectedAssets}
              />

              {/* 3. Notas de Campo */}
              <NoteSelector
                notes={selectedNotes}
                onChange={setSelectedNotes}
              />
            </div>

            {/* Coordenadas */}
            <div className="space-y-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    value={formData.latitude}
                    readOnly
                    className="bg-muted text-muted-foreground"
                    placeholder="Select on map ->"
                  />
                  {errors.latitude && <p className="text-xs text-destructive">{errors.latitude}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    value={formData.longitude}
                    readOnly
                    className="bg-muted text-muted-foreground"
                    placeholder="Select on map ->"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                * Location address will be automatically identified.
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1">Save Incident</Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}