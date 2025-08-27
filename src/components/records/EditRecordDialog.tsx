import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns'; // Added for date formatting
import NewFollowUpDialog from '@/components/follow-ups/NewFollowUpDialog'; // Import new follow-up dialog
import ReactQuill from 'react-quill'; // Import ReactQuill
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Record {
  id: string;
  title: string;
  description?: string;
  category?: string;
  notes_history?: { content: string; timestamp: string; }[]; // Updated to notes_history
  created_at: string;
  updated_at: string;
}

interface EditRecordDialogProps {
  record: Record | null;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordUpdated: () => void;
}

const EditRecordDialog: React.FC<EditRecordDialogProps> = ({ record, categories, open, onOpenChange, onRecordUpdated }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [currentNote, setCurrentNote] = useState(''); // State for adding a new note
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(record?.category);
  const [descriptionHtml, setDescriptionHtml] = useState<string>(record?.description || ''); // State for rich text description

  // Effect to reset form when record changes or dialog opens/closes
  useEffect(() => {
    if (record) {
      setSelectedCategory(record.category);
      setDescriptionHtml(record.description || ''); // Set rich text description
    } else {
      setSelectedCategory(undefined);
      setDescriptionHtml(''); // Clear rich text description
    }
    setCurrentNote(''); // Clear current note input
  }, [record, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!record) return;

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const category = selectedCategory;

    let updatedNotesHistory = record.notes_history ? [...record.notes_history] : [];
    if (currentNote.trim()) {
      updatedNotesHistory.push({
        content: currentNote.trim(),
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const { error } = await supabase
        .from('records')
        .update({
          title,
          description: descriptionHtml, // Update with rich text description
          category,
          notes_history: updatedNotesHistory, // Update with new history
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (error) throw error;

      toast({
        title: "Record updated",
        description: "Your record has been successfully updated.",
      });

      onOpenChange(false);
      onRecordUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Record</DialogTitle>
        </DialogHeader>
        {record && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter record title"
                required
                defaultValue={record.title}
              />
            </div>
            
            <div className="space-y-2 mb-6"> {/* Increased margin to mb-6 */}
              <Label htmlFor="description">Description</Label>
              <div className="min-h-[150px]"> {/* New wrapper div with min-height */}
                <ReactQuill 
                  theme="snow"
                  value={descriptionHtml}
                  onChange={setDescriptionHtml}
                  placeholder="Enter record description (rich text)"
                  className="h-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category">
                    {selectedCategory || "Select a category"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes History Display */}
            {record.notes_history && record.notes_history.length > 0 && (
              <div className="space-y-2">
                <Label>Notes History</Label>
                <div className="border rounded-md p-2 max-h-[150px] overflow-y-auto bg-muted/50">
                  {record.notes_history.map((note, index) => (
                    <p key={index} className="text-xs text-muted-foreground mb-1">
                      <em>{format(new Date(note.timestamp), 'PPpp')}:</em> {note.content}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-note">Add New Note</Label>
              <Textarea
                id="new-note"
                name="new-note"
                placeholder="Add a new note..."
                rows={2}
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
              />
            </div>
            
            <div className="flex justify-between items-center gap-2 pt-4 border-t">
              <NewFollowUpDialog recordId={record.id} onFollowUpCreated={onRecordUpdated} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditRecordDialog;