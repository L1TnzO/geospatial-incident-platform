import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Filters } from '../types';
import { incidentTypes, severityLevels } from '../data/mockData';

interface FiltersPanelProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function FiltersPanel({ filters, onFiltersChange }: FiltersPanelProps) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    const resetFilters: Filters = {
      idSearch: '',
      dateRange: { start: '', end: '' },
      types: [],
      severity: '',
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const toggleType = (type: string) => {
    const newTypes = localFilters.types.includes(type)
      ? localFilters.types.filter((t) => t !== type)
      : [...localFilters.types, type];
    setLocalFilters({ ...localFilters, types: newTypes });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Filters & Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="idSearch">Search by ID</Label>
          <Input
            id="idSearch"
            placeholder="e.g., INC-2025-001"
            value={localFilters.idSearch}
            onChange={(e) => setLocalFilters({ ...localFilters, idSearch: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="space-y-2">
            <Input
              type="date"
              value={localFilters.dateRange.start}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  dateRange: { ...localFilters.dateRange, start: e.target.value },
                })
              }
            />
            <Input
              type="date"
              value={localFilters.dateRange.end}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  dateRange: { ...localFilters.dateRange, end: e.target.value },
                })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Incident Type</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {incidentTypes.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={localFilters.types.includes(type)}
                  onCheckedChange={() => toggleType(type)}
                />
                <label htmlFor={type} className="text-sm cursor-pointer">
                  {type}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Severity</Label>
          <Select
            value={localFilters.severity}
            onValueChange={(value) => setLocalFilters({ ...localFilters, severity: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {severityLevels.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
          <Button onClick={handleReset} variant="outline">
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
