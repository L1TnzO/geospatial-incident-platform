import { useState } from 'react';
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

export function IncidentForm() {
  const navigate = useNavigate();
  const metadataQuery = useIncidentMetadataQuery();
  const createMutation = useCreateIncident();
  const { coordinates, close } = useIncidentCreateStore();
  const typeOptions = metadataQuery.data?.types ?? [];
  const severityOptions = metadataQuery.data?.severities ?? [];
  const [formData, setFormData] = useState({
    type: '',
    severity: '',
    date: '',
    time: '',
    description: '',
    latitude: '',
    longitude: '',
    address: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) newErrors.type = 'Incident type is required';
    if (!formData.severity) newErrors.severity = 'Severity is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.latitude) newErrors.latitude = 'Latitude is required';
    else if (
      isNaN(Number(formData.latitude)) ||
      Number(formData.latitude) < -90 ||
      Number(formData.latitude) > 90
    ) {
      newErrors.latitude = 'Invalid latitude (-90 to 90)';
    }
    if (!formData.longitude) newErrors.longitude = 'Longitude is required';
    else if (
      isNaN(Number(formData.longitude)) ||
      Number(formData.longitude) < -180 ||
      Number(formData.longitude) > 180
    ) {
      newErrors.longitude = 'Invalid longitude (-180 to 180)';
    }
    if (!formData.address) newErrors.address = 'Address is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      if (!coordinates) {
        toast.error('Please pick a location on the map.');
        return;
      }

      const payload = {
        incidentNumber: `INC-${Date.now()}`,
        title: formData.description.slice(0, 120) || 'New incident',
        typeCode: formData.type,
        severityCode: formData.severity,
        statusCode: 'OPEN',
        occurrenceAt: new Date(`${formData.date}T${formData.time}`).toISOString(),
        reportedAt: new Date().toISOString(),
        location: {
          latitude: Number(coordinates.lat),
          longitude: Number(coordinates.lng),
        },
        narrative: formData.description,
      };

      createMutation.mutate(payload, {
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to create incident.';
          toast.error(message);
        },
        onSuccess: () => {
          toast.success('Incident created successfully!');
          // close drawer
          close();
        },
      });
    } else {
      toast.error('Please fix validation errors');
    }
  };

  const handleCancel = () => {
    // close drawer if open
    close();
    navigate('/map');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Incident</CardTitle>
          <CardDescription>
            Enter incident details with accurate information for proper record keeping
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                      <SelectItem key={type.code} value={type.code}>
                        {type.name}
                      </SelectItem>
                    ))}
                    {!metadataQuery.isLoading && typeOptions.length === 0 && (
                      <SelectItem value="" disabled>
                        No incident types available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {metadataQuery.isLoading && (
                  <p className="text-xs text-muted-foreground">Loading incident types…</p>
                )}
                {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value: string) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger
                    id="severity"
                    className={errors.severity ? 'border-destructive' : ''}
                  >
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map((severity) => (
                      <SelectItem key={severity.code} value={severity.code}>
                        {severity.name}
                      </SelectItem>
                    ))}
                    {!metadataQuery.isLoading && severityOptions.length === 0 && (
                      <SelectItem value="" disabled>
                        No severities available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {metadataQuery.isLoading && (
                  <p className="text-xs text-muted-foreground">Loading severities…</p>
                )}
                {errors.severity && <p className="text-sm text-destructive">{errors.severity}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={errors.date ? 'border-destructive' : ''}
                />
                {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className={errors.time ? 'border-destructive' : ''}
                />
                {errors.time && <p className="text-sm text-destructive">{errors.time}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of the incident"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="space-y-4">
              <h3>Location Information</h3>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  placeholder="Street address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={errors.address ? 'border-destructive' : ''}
                />
                {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude *</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.0001"
                    placeholder="e.g., 40.7128"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className={errors.latitude ? 'border-destructive' : ''}
                  />
                  {errors.latitude && <p className="text-sm text-destructive">{errors.latitude}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude *</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.0001"
                    placeholder="e.g., -74.0060"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className={errors.longitude ? 'border-destructive' : ''}
                  />
                  {errors.longitude && (
                    <p className="text-sm text-destructive">{errors.longitude}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1">
                Save Incident
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
