import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Record {
  id: string;
  title: string;
  description?: string;
  category?: string;
  notes_history?: { content: string; timestamp: string; }[];
  created_at: string;
  updated_at: string;
}

interface FollowUp {
  id: string;
  record_id: string;
  title: string;
  description?: string;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

interface RecordDetailDialogProps {
  record: Record | null;
  followUps: FollowUp[]; // Pass relevant follow-ups for this record
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RecordDetailDialog: React.FC<RecordDetailDialogProps> = ({
  record,
  followUps,
  open,
  onOpenChange,
}) => {
  if (!record) return null;

  const recordFollowUps = followUps.filter(fu => fu.record_id === record.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {record.category && (
            <p className="text-sm text-muted-foreground">
              <strong>Category:</strong> <Badge variant="secondary">{record.category}</Badge>
            </p>
          )}

          {record.description && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Description:</p>
              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                {/* 
                  WARNING: Rendering HTML directly can expose to XSS vulnerabilities 
                  if content is not sanitized. Ensure description is sanitized on backend 
                  or use a library like 'dompurify' on frontend if needed.
                */}
                <div dangerouslySetInnerHTML={{ __html: record.description }} />
              </div>
            </div>
          )}

          {record.notes_history && record.notes_history.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Notes History:</p>
              <div className="border rounded-md p-2 max-h-[150px] overflow-y-auto bg-muted/50">
                {record.notes_history.map((note, index) => (
                  <p key={index} className="text-xs text-muted-foreground mb-1">
                    <em>{format(new Date(note.timestamp), 'PPpp')}:</em> {note.content}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-muted-foreground mt-4 pt-4 border-t">
            <div>
              <strong>Added On:</strong> {format(new Date(record.created_at), 'PPpp')}
            </div>
            <div>
              <strong>Last Updated On:</strong> {format(new Date(record.updated_at), 'PPpp')}
            </div>
          </div>

          {recordFollowUps.length > 0 && (
            <div className="space-y-2 mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Associated Reminders:</p>
              <div className="grid gap-2">
                {recordFollowUps.map(fu => (
                  <div key={fu.id} className="flex justify-between items-center text-xs bg-muted/50 p-2 rounded-md">
                    <span>{fu.title} - Due: {format(new Date(fu.due_date), 'PPP')}</span>
                    <Badge variant={fu.status === 'overdue' ? 'destructive' : (fu.status === 'completed' ? 'default' : 'secondary')}>
                      {fu.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordDetailDialog;

