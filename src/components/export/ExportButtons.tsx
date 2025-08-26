import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Record {
  id: string;
  title: string;
  description?: string;
  category?: string;
  notes?: string;
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
        `"${record.description || ''}"`,
        `"${record.category || ''}"`,
        `"${record.notes || ''}"`,
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

  const exportToPDF = () => {
    if (records.length === 0) {
      toast({
        title: "No data to export",
        description: "Please create some records first.",
        variant: "destructive",
      });
      return;
    }

    // Simple PDF-like export using HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Data Records Export</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #8B5CF6; margin-bottom: 20px; }
            .record { border: 1px solid #ddd; margin-bottom: 20px; padding: 15px; border-radius: 8px; }
            .record-title { font-weight: bold; font-size: 18px; margin-bottom: 10px; }
            .record-meta { color: #666; font-size: 12px; margin-top: 10px; }
            .category { background: #8B5CF6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Data Records Export</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          ${records.map(record => `
            <div class="record">
              <div class="record-title">${record.title}</div>
              ${record.category ? `<span class="category">${record.category}</span>` : ''}
              ${record.description ? `<p><strong>Description:</strong> ${record.description}</p>` : ''}
              ${record.notes ? `<p><strong>Notes:</strong> ${record.notes}</p>` : ''}
              <div class="record-meta">
                Created: ${new Date(record.created_at).toLocaleString()} | 
                Updated: ${new Date(record.updated_at).toLocaleString()}
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-records-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Your records have been exported to PDF format.",
    });
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