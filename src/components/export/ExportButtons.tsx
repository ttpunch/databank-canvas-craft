import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import RecordsTableReport from '@/components/records/RecordsTableReport'; // Import RecordsTableReport
import ReactDOMServer from 'react-dom/server';

interface Record {
  id: string;
  title: string;
  description?: string;
  category?: string;
  notes_history?: { content: string; timestamp: string; }[]; // New field for notes history
  created_at: string;
  updated_at: string;
}

interface ExportButtonsProps {
  records: Record[];
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ records }) => {
  const { toast } = useToast();

  const exportToCSV = () => {
    if (records.length === 0) {
      toast({
        title: "No data to export",
        description: "Please create some records first.",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Title', 'Description', 'Category', 'Notes', 'Created At', 'Updated At'];
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        `"${record.title}"`,
        `"${record.description?.replace(/<[^>]*>/g, '') || ''}"`,
        `"${record.category || ''}"`,
        // Join all historical notes for CSV export
        `"${record.notes_history?.map(note => `[${new Date(note.timestamp).toLocaleString()}] ${note.content}`).join(' | ') || ''}"`,
        `"${new Date(record.created_at).toLocaleString()}"`,
        `"${new Date(record.updated_at).toLocaleString()}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-records-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Your records have been exported to CSV.",
    });
  };

  const exportToPDF = async () => {
    if (records.length === 0) {
      toast({
        title: "No data to export",
        description: "Please create some records first.",
        variant: "destructive",
      });
      return;
    }

    const reportTitle = "Data Records Export";
    const generatedOn = `Generated on: ${new Date().toLocaleString()}`; 
    const disclaimer = "NOTE: This report shows the full note history.";

    // Render RecordsTableReport component to a string
    const tableHtmlString = ReactDOMServer.renderToString(
      <RecordsTableReport records={records} />
    );

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #8B5CF6; margin-bottom: 20px; }
            p { margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; } /* Increased base font size for table */
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
            th { background-color: #f2f2f2; }
            .note-history ul { list-style: none; padding: 0; margin: 0; }
            .note-history li { margin-bottom: 5px; font-size: 9px; } /* Adjusted font size for note history items */
            .note-history em { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          <p>${generatedOn}</p>
          <p style="color: red; font-weight: bold;">${disclaimer}</p>
          ${tableHtmlString}
        </body>
      </html>
    `;

    const input = document.createElement('div');
    input.innerHTML = htmlContent;
    document.body.appendChild(input); // Temporarily add to DOM for html2canvas

    try {
      const canvas = await html2canvas(input, { scale: 2 }); // Scale for better resolution
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`data-records-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Export successful",
        description: "Your records have been exported to PDF.",
      });
    } catch (error: any) {
      toast({
        title: "Error exporting to PDF",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      document.body.removeChild(input); // Clean up temporary element
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={exportToCSV} className="gap-2">
        <Download className="h-4 w-4" />
        Export All
      </Button>
      <Button variant="outline" onClick={exportToPDF} className="gap-2">
        <FileText className="h-4 w-4" />
        Export to PDF
      </Button>
    </div>
  );
};

export default ExportButtons;