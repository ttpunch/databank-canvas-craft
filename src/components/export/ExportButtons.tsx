import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf'; // Change to named import
import autoTable from "jspdf-autotable"; // Import autoTable directly

interface Record {
  id: string;
  title: string;
  description?: string;
  category?: string;
  notes_history?: { content: string; timestamp: string; }[]; // New field for notes history
  created_at: string;
  updated_at: string;
  status?: string; // Add status field
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

    const headers = ['Title', 'Description', 'Category', 'Notes', 'Created At', 'Updated At', 'Status'];
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        `"${record.title}"`,
        `"${record.description?.replace(/<[^>]*>/g, '') || ''}"`,
        `"${record.category || ''}"`,
        // Join all historical notes for CSV export
        `"${record.notes_history?.map(note => `[${new Date(note.timestamp).toLocaleString()}] ${note.content}`).join(' | ') || ''}"`,
        `"${new Date(record.created_at).toLocaleString()}"`,
        `"${new Date(record.updated_at).toLocaleString()}"`,
        `"${record.status || ''}"` // Include status in CSV
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

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      // applyPlugin(jsPDF); // Apply the plugin to jsPDF

      let yPos = 10; // Initial Y position

      // Title
      doc.setFontSize(24);
      doc.setTextColor(139, 92, 246); // Equivalent to #8B5CF6
      doc.text("Data Records Export", 10, yPos);
      yPos += 15;

      // Generated On
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0); // Black
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 10, yPos);
      yPos += 10;

      // Disclaimer
      doc.setTextColor(255, 0, 0); // Red
      doc.setFontSize(10);
      doc.text("NOTE: This report shows the full note history and record status.", 10, yPos);
      yPos += 10; // Increased spacing for disclaimer

      // Table Headers
      const headers = [['S.No', 'Title', 'Category', 'Description', 'Created At', 'Last Update', 'Notes History']];

      // Table Data
      const data = records.map((record, index) => [
        index + 1,
        record.title,
        record.category || '-',
        record.description ? record.description.replace(/<p>/g, '\n').replace(/<br>/g, '\n').replace(/<[^>]*>/g, '').trim() : '-',
        new Date(record.created_at).toLocaleDateString(),
        new Date(record.updated_at).toLocaleDateString(),
        record.notes_history?.map(note => 
          `[${new Date(note.timestamp).toLocaleDateString()}] ${note.content}`
        ).join('\n') || '-',
      ]);

      // Remove console logs
      // console.log("Checking jsPDF doc object before autoTable:", doc);
      // console.log("Is autoTable a function?", typeof (doc as any).autoTable);

      // Add table to PDF
      autoTable(doc, {
        startY: yPos,
        head: headers,
        body: data,
        theme: 'grid',
        margin: { right: 10 }, // Adjust overall right margin
        headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], fontSize: 10, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 10 }, // S.No
          1: { cellWidth: 30 }, // Title
          2: { cellWidth: 20 }, // Category
          3: { cellWidth: 95 }, // Description (increased from 43)
          4: { cellWidth: 18 }, // Created At
          5: { cellWidth: 18 }, // Last Update
          6: { cellWidth: 80 }, // Notes History (increased from 55)
        },
        didDrawPage: function (data: any) {
          // Footer
          let str = "Page " + (doc.internal as any).getNumberOfPages()
          doc.setFontSize(10)
          doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10)
        },
      });

      doc.save(`data-records-${new Date().toISOString().split('T')[0]}.pdf`);

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