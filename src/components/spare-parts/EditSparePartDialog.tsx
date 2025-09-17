import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";

interface SparePart {
  id: string;
  name: string;
  description: string | null;
  quantity: number | null;
  category: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null; // New field
  usage_count: number; // New field
}

interface EditSparePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSparePartUpdated: () => void;
  sparePart: SparePart | null;
}

const EditSparePartDialog: React.FC<EditSparePartDialogProps> = ({ open, onOpenChange, onSparePartUpdated, sparePart }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [category, setCategory] = useState('');
  const [metadataFields, setMetadataFields] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [usageCount, setUsageCount] = useState<number>(0);
  const [lastUsedAt, setLastUsedAt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (sparePart) {
      setName(sparePart.name);
      setDescription(sparePart.description || '');
      setQuantity(sparePart.quantity || 0);
      setCategory(sparePart.category || '');
      setUsageCount(sparePart.usage_count || 0);
      setLastUsedAt(sparePart.last_used_at ? new Date(sparePart.last_used_at).toISOString().split('T')[0] : '');
      if (sparePart.metadata) {
        setMetadataFields(Object.entries(sparePart.metadata).map(([key, value]) => ({ key, value: String(value) })));
      } else {
        setMetadataFields([{ key: '', value: '' }]);
      }
    }
  }, [sparePart]);

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
    if (!sparePart) return;

    setLoading(true);
    try {
      const metadata: Record<string, any> = metadataFields.reduce((acc, field) => {
        if (field.key && field.value) {
          acc[field.key] = field.value;
        }
        return acc;
      }, {});

      const { error } = await supabase.from('spare_parts').update({
        name,
        description,
        quantity,
        category,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        usage_count: usageCount,
        last_used_at: lastUsedAt ? new Date(lastUsedAt).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sparePart.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Spare Part Updated",
        description: `'${name}' has been successfully updated.`,
      });
      onSparePartUpdated();
      onOpenChange(false); // Close dialog on success
    } catch (err: any) {
      toast({
        title: "Error updating spare part",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Spare Part</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Main fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3 h-10" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3 min-h-[2.5rem]" rows={3} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">Quantity</Label>
            <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="col-span-3 h-10" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">Category</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="col-span-3 h-10" />
          </div>

          {/* Usage fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="usageCount" className="text-right">Usage Count</Label>
            <Input id="usageCount" type="number" value={usageCount} onChange={(e) => setUsageCount(Number(e.target.value))} className="col-span-3 h-10" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastUsedAt" className="text-right">Last Used At</Label>
            <Input id="lastUsedAt" type="date" value={lastUsedAt} onChange={(e) => setLastUsedAt(e.target.value)} className="col-span-3 h-10" />
          </div>

          {/* Metadata fields */}
          <div className="col-span-4 mt-4">
            <h3 className="text-lg font-semibold mb-2">Metadata</h3>
            {metadataFields.map((field, index) => (
              <div key={index} className="grid grid-cols-4 items-center gap-4 mb-2">
                <Label htmlFor={`metadata-key-${index}`} className="text-right">Key</Label>
                <Input
                  id={`metadata-key-${index}`}
                  placeholder="Key"
                  value={field.key}
                  onChange={(e) => handleMetadataChange(index, 'key', e.target.value)}
                  className="col-span-1 h-10"
                />
                <Label htmlFor={`metadata-value-${index}`} className="sr-only">Value</Label> {/* sr-only to hide visually but keep for accessibility */}
                <Input
                  id={`metadata-value-${index}`}
                  placeholder="Value"
                  value={field.value}
                  onChange={(e) => handleMetadataChange(index, 'value', e.target.value)}
                  className="col-span-1 h-10"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveMetadataField(index)}
                  disabled={metadataFields.length === 1 && index === 0}
                  className="col-span-1 h-10" 
                >
                  -
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={handleAddMetadataField} className="mt-2">
              + Add Custom Field
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSparePartDialog;
