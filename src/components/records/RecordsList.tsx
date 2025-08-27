import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Edit, Trash2, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import RecordsFilter from './RecordsFilter';

interface Record {
  id: string;
  title: string;
  description?: string;
  category?: string;
  notes_history?: { content: string; timestamp: string; }[]; // Updated to notes_history
  created_at: string;
  updated_at: string;
}

interface RecordsListProps {
  records: Record[];
  onEdit: (record: Record) => void;
  onDelete: (id: string) => void;
  onViewDetails: (record: Record) => void; // New prop to handle detail view
}

const RecordsList: React.FC<RecordsListProps> = ({ records, onEdit, onDelete, onViewDetails }) => {
  const [filters, setFilters] = useState({ searchTerm: '', category: '' });

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSearchTerm = 
        record.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        // Search rich text description by stripping HTML tags
        record.description?.replace(/<[^>]*>/g, '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        record.notes_history?.some(note => note.content.toLowerCase().includes(filters.searchTerm.toLowerCase()));

      const matchesCategory = 
        filters.category === '' ||
        record.category?.toLowerCase() === filters.category.toLowerCase();

      return matchesSearchTerm && matchesCategory;
    });
  }, [records, filters]);

  if (filteredRecords.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No records found</h3>
          <p className="text-sm text-muted-foreground">Create your first record to get started or adjust your filter criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <div className="col-span-full">
        <RecordsFilter onFilter={setFilters} />
      </div>
      {filteredRecords.map((record) => (
        <Card 
          key={record.id} 
          className="transition-all hover:shadow-md cursor-pointer"
          onClick={() => onViewDetails(record)} // Make card clickable
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg leading-tight">{record.title}</CardTitle>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onEdit(record); }}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
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
              <div className="text-sm text-muted-foreground line-clamp-2">
                {/* 
                  WARNING: Rendering HTML directly can expose to XSS vulnerabilities 
                  if content is not sanitized. Ensure description is sanitized on backend 
                  or use a library like 'dompurify' on frontend if needed.
                */}
                <div dangerouslySetInnerHTML={{ __html: record.description }} />
              </div>
            )}
            {/* Display only the latest note from history, if available */}
            {record.notes_history && record.notes_history.length > 0 && (
              <div className="bg-muted/50 rounded-md p-2">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {record.notes_history[record.notes_history.length - 1].content}
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