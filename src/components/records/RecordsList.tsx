import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Edit, Trash2, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Record {
  id: string;
  title: string;
  description?: string;
  category?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface RecordsListProps {
  records: Record[];
  onEdit: (record: Record) => void;
  onDelete: (id: string) => void;
}

const RecordsList: React.FC<RecordsListProps> = ({ records, onEdit, onDelete }) => {
  if (records.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No records found</h3>
          <p className="text-sm text-muted-foreground">Create your first record to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {records.map((record) => (
        <Card key={record.id} className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg leading-tight">{record.title}</CardTitle>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onEdit(record)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onDelete(record.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {record.category && (
              <Badge variant="secondary" className="w-fit">
                {record.category}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {record.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {record.description}
              </p>
            )}
            {record.notes && (
              <div className="bg-muted/50 rounded-md p-2">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {record.notes}
                </p>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
              </div>
              {record.updated_at !== record.created_at && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Updated {formatDistanceToNow(new Date(record.updated_at), { addSuffix: true })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RecordsList;