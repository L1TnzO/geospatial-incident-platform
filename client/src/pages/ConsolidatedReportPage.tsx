import { DashboardContent } from '../layouts/DashboardLayout';
import { StrategicLayout } from '../components/strategic/StrategicLayout';
import { DashboardProvider } from '../providers/dashboard-provider';
import { Button } from '../components/ui/button';
import { Printer } from 'lucide-react';

export function ConsolidatedReportPage() {

    const handlePrint = () => {
        window.print();
    };

    return (
        <DashboardProvider>
            <div className="min-h-screen bg-background">
                {/* Header - Hidden in Print */}
                <div className="container mx-auto p-4 flex justify-between items-center border-b print:hidden">
                    <div>
                        <h1 className="text-2xl font-bold">Consolidated Incident Report</h1>
                        <p className="text-muted-foreground">
                            Summary of dashboard statistics and strategic analysis
                        </p>
                    </div>
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="h-4 w-4" />
                        Print Report
                    </Button>
                </div>

                {/* Report Content */}
                <div className="print:p-0">

                    {/* Dashboard Section */}
                    <div className="print:break-after-page">
                        <div className="bg-muted/30 p-4 mb-4 print:hidden">
                            <h2 className="text-xl font-semibold text-center">Dashboard Overview</h2>
                        </div>
                        {/* Override overflow to visible for print/full view */}
                        <DashboardContent className="overflow-visible h-auto" />
                    </div>

                    <hr className="my-8 border-t-2 print:hidden" />

                    {/* Strategic Section */}
                    <div>
                        <div className="bg-muted/30 p-4 mb-4 print:hidden">
                            <h2 className="text-xl font-semibold text-center">Strategic Analysis</h2>
                        </div>
                        <StrategicLayout hideMap={true} className="overflow-visible h-auto" />
                    </div>
                </div>

                {/* Print Styles Injection */}
                <style>{`
          @media print {
            /* Hide general UI elements if any leak through */
            nav, header, footer {
              display: none !important;
            }
            /* Ensure the report container is visible */
            .min-h-screen {
              height: auto !important;
              min-height: 0 !important;
            }
            /* Force expansion of what are usually scrollable areas */
            .overflow-y-auto, .overflow-hidden {
              overflow: visible !important;
              height: auto !important;
            }
            
            /* Remove shadows, backgrounds for cleaner print */
            .shadow-sm, .shadow-md, .shadow-lg {
              box-shadow: none !important;
              border: 1px solid #ddd !important;
            }
            
            body {
              background: white !important;
              color: black !important;
            }
          }
        `}</style>
            </div>
        </DashboardProvider>
    );
}
