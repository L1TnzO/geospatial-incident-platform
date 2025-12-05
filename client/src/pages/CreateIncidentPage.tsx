import { IncidentForm } from '../components/IncidentForm';
import { LocationPickerMap } from '../components/LocationPickerMap';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

export function CreateIncidentPage() {
    return (
        <div className="container mx-auto p-6 h-full overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">

                {/* Columna Izquierda: Formulario */}
                <div className="h-full overflow-y-auto pr-2 pb-10">
                    <IncidentForm />
                </div>

                {/* Columna Derecha: Mapa e Instrucciones */}
                <div className="flex flex-col gap-4 h-full pb-6">

                    {/* CAMBIO CLAVE AQUÍ: flex flex-col para que el hijo ocupe el espacio */}
                    <Card className="flex-1 min-h-[400px] flex flex-col overflow-hidden">
                        <CardHeader className="pb-2 shrink-0"> {/* shrink-0 evita que el header se aplaste */}
                            <CardTitle>Location Selection</CardTitle>
                            <CardDescription>
                                Click on the map to pinpoint the exact location.
                            </CardDescription>
                        </CardHeader>

                        {/* CAMBIO CLAVE AQUÍ: flex-1 para ocupar el resto y relative */}
                        <CardContent className="flex-1 p-0 relative min-h-0">
                            <LocationPickerMap />
                        </CardContent>
                    </Card>

                    <Card className="shrink-0">
                        <CardHeader>
                            <CardTitle>Instructions</CardTitle>
                            <CardDescription>
                                1. Select location on the map.<br />
                                2. Fill out incident details.<br />
                                3. Click "Save Incident".
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        </div>
    );
}