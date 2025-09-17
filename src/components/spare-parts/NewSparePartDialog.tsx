import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";

interface NewSparePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSparePartAdded: () => void;
}

const NewSparePartDialog: React.FC<NewSparePartDialogProps> = ({ open, onOpenChange, onSparePartAdded }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [category, setCategory] = useState('');
  const [metadataFields, setMetadataFields] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAddMetadataField = () => {
    setMetadataFields([...metadataFields, { key: '', value: '' }]);
  };

  const handleMetadataChange = (index: number, type: 'key' | 'value', value: string) => {
    const newFields = [...metadataFields];
    newFields[index][type] = value;
    setMetadataFields(newFields);
  };

  const handleRemoveMetadataField = (index: number) => {
    const newFields = metadataFields.filter((_, i) => i !== index);
    setMetadataFields(newFields);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const metadata: Record<string, any> = metadataFields.reduce((acc, field) => {
        if (field.key && field.value) {
          acc[field.key] = field.value;
        }
        return acc;
      }, {});

      const { error } = await supabase.from('spare_parts').insert({
        name,
        description,
        quantity,
        category,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Spare Part Added",
        description: `'${name}' has been successfully added.`, 
      });
      onSparePartAdded();
      onOpenChange(false); // Close dialog on success
      // Reset form fields
      setName('');
      setDescription('');
      setQuantity(0);
      setCategory('');
      setMetadataFields([{ key: '', value: '' }]);
    } catch (err: any) {
      toast({
        title: "Error adding spare part",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90%] md:max-w-3xl lg:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Add New Spare Part</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Label htmlFor="name" className="w-full md:w-1/4 text-left md:text-right">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Label htmlFor="description" className="w-full md:w-1/4 text-left md:text-right">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="flex-1" />
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Label htmlFor="quantity" className="w-full md:w-1/4 text-left md:text-right">Quantity</Label>
            <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="flex-1" />
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Label htmlFor="category" className="w-full md:w-1/4 text-left md:text-right">Category</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="flex-1" />
          </div>

          <div className="col-span-full mt-4">
            <h3 className="text-lg font-semibold mb-2">Metadata</h3>
            {metadataFields.map((field, index) => (
              <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-2 mb-2">
                <Input
                  placeholder="Key"
                  value={field.key}
                  onChange={(e) => handleMetadataChange(index, 'key', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Value"
                  value={field.value}
                  onChange={(e) => handleMetadataChange(index, 'value', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveMetadataField(index)}
                  disabled={metadataFields.length === 1 && index === 0}
                  className="flex-shrink-0"
                >
                  -
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={handleAddMetadataField} className="mt-2">+ Add Custom Field</Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add Spare Part"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewSparePartDialog;
