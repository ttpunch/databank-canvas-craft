import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import NewCategoryDialog from './NewCategoryDialog'; // Import the new component
import ReactQuill from 'react-quill'; // Import ReactQuill
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

interface Category {
  id: string;
  name: string;
  color: string;
}

// Update Record interface to use notes_history
interface Record {
  id: string;
  title: string;
  description?: string;
  category?: string;
  notes_history?: { content: string; timestamp: string; }[]; // New field for notes history
  created_at: string;
  updated_at: string;
}

interface NewRecordDialogProps {
  categories: Category[];
  onRecordCreated: () => void;
}

const NewRecordDialog: React.FC<NewRecordDialogProps> = ({ categories, onRecordCreated }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const [currentNote, setCurrentNote] = useState<string>(''); // State for the current note input
  const [descriptionHtml, setDescriptionHtml] = useState<string>(''); // State for rich text description

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const category = selectedCategory;
    
    // Prepare notes_history
    const newNotesHistory = [];
    if (currentNote.trim()) {
      newNotesHistory.push({
        content: currentNote.trim(),
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const { error } = await supabase
        .from('records')
        .insert([
          {
            title,
            description: descriptionHtml, // Use rich text description
            category,
            notes_history: newNotesHistory, // Use new notes_history
          },
        ]);

      if (error) throw error;

      toast({
        title: "Record created",
        description: "Your record has been successfully created.",
      });

      setOpen(false);
      onRecordCreated();
      (e.target as HTMLFormElement).reset();
      setSelectedCategory(undefined);
      setCurrentNote(''); // Reset current note input
      setDescriptionHtml(''); // Reset rich text description
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4 text-primary-foreground" />
          New Record
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Enter record title"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <ReactQuill 
              theme="snow"
              value={descriptionHtml}
              onChange={setDescriptionHtml}
              placeholder="Enter record description (rich text)"
              className="h-[150px] mb-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <div className="flex items-center gap-2">
              <Select name="category" value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-grow">
                  <SelectValue placeholder="Select a category">
                    {selectedCategory || "Select a category"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories && categories.length > 0 ? (
                    categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      No categories available. Create one first.
                    </div>
                  )}
                </SelectContent>
              </Select>
              <NewCategoryDialog onCategoryCreated={onRecordCreated} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Add a note..."
              rows={3}
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => {
              setOpen(false);
              setSelectedCategory(undefined);
              setCurrentNote(''); // Reset current note input on cancel
              setDescriptionHtml(''); // Reset rich text description on cancel
            }}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewRecordDialog;