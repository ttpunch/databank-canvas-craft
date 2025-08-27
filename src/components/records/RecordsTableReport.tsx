import React from 'react';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface Record {
  id: string;
  title: string;
  description?: string;
  category?: string;
  notes_history?: { content: string; timestamp: string; }[]; // Updated to notes_history
  created_at: string;
  updated_at: string;
  status?: string; // Add status field
}

interface RecordsTableReportProps {
  records: Record[];
}

const RecordsTableReport: React.FC<RecordsTableReportProps> = ({ records }) => {
  if (records.length === 0) {
    return <p className="text-center text-muted-foreground">No records to display in the report.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableCaption>A detailed report of your records.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">S.No</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Last Update</TableHead>
            <TableHead>Notes History</TableHead> {/* Renamed to Notes History */}
            <TableHead>Status</TableHead> {/* Add Status column */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => (
            <TableRow key={record.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell className="font-medium">{record.title}</TableCell>
              <TableCell>{record.category || '-'}</TableCell>
              <TableCell className="max-w-[150px] truncate">{record.description?.replace(/<[^>]*>/g, '') || '-'}</TableCell> {/* Strip HTML */}
              <TableCell>{format(new Date(record.created_at), 'PPP')}</TableCell>
              <TableCell>{format(new Date(record.updated_at), 'PPP')}</TableCell>
              <TableCell className="max-w-[200px]">
                {record.notes_history && record.notes_history.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {record.notes_history.map((note, noteIndex) => (
                      <li key={noteIndex}>
                        <em>{format(new Date(note.timestamp), 'PPpp')}:</em> {note.content}
                      </li>
                    ))}
                  </ul>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>{record.status || '-'}</TableCell> {/* Display Status */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RecordsTableReport;
