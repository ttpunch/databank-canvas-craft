import React from 'react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SparePart } from '@/pages/SpareParts'; // Adjust import path as needed

interface ExportToPdfButtonProps {
  data: SparePart[];
  filename: string;
}

const ExportToPdfButton: React.FC<ExportToPdfButtonProps> = ({ data, filename }) => {
  const handleExport = async () => {
    const input = document.getElementById('spare-parts-table-export');
    if (!input) {
      console.error("Table element not found for PDF export.");
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const addPageWithHeader = (doc: jsPDF, pageNum: number) => {
      doc.setFontSize(10);
      doc.text(`Page ${pageNum}`, pdfWidth - 20, 10);
      doc.text("CNC Spare Parts Report", 10, 10);
      doc.line(10, 12, pdfWidth - 10, 12); // Underline for header
    };

    addPageWithHeader(pdf, 1);
    let pageNumber = 1;

    // Use html2canvas to capture the table
    html2canvas(input, {
      scale: 2, // Increase scale for better resolution
      useCORS: true,
      windowWidth: input.scrollWidth, // Capture full width
      windowHeight: input.scrollHeight, // Capture full height
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 15; // Start position below header

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pageNumber++;
        addPageWithHeader(pdf, pageNumber);
        pdf.addImage(imgData, 'PNG', 0, position + 15, imgWidth, imgHeight); // +15 for header offset
        heightLeft -= pageHeight;
      }
      pdf.save(filename + '.pdf');
    });
  };

  return (
    <Button onClick={handleExport}>
      Export to PDF
    </Button>
  );
};

export default ExportToPdfButton;
