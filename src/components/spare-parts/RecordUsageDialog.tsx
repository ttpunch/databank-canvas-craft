import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RecordUsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordUsage: (quantityUsed: number, areaOfUse: string) => void;
  currentPartName: string;
  currentQuantity: number;
}

const RecordUsageDialog: React.FC<RecordUsageDialogProps> = ({
  open,
  onOpenChange,
  onRecordUsage,
  currentPartName,
  currentQuantity,
}) => {
  const [quantityUsed, setQuantityUsed] = useState<number>(1);
  const [areaOfUse, setAreaOfUse] = useState<string>('');

  const handleSubmit = () => {
    if (quantityUsed > 0 && quantityUsed <= currentQuantity && areaOfUse.trim() !== '') {
      onRecordUsage(quantityUsed, areaOfUse);
      setQuantityUsed(1);
      setAreaOfUse('');
      onOpenChange(false);
    } else {
      // Optionally, show a toast or error message for invalid input
      alert('Please enter a valid quantity (less than or equal to current stock) and area of use.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Usage for {currentPartName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantityUsed" className="text-right">
              Quantity Used
            </Label>
            <Input
              id="quantityUsed"
              type="number"
              value={quantityUsed}
              onChange={(e) => setQuantityUsed(Number(e.target.value))}
              className="col-span-3"
              min="1"
              max={currentQuantity}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="areaOfUse" className="text-right">
              Area of Use
            </Label>
            <Input
              id="areaOfUse"
              value={areaOfUse}
              onChange={(e) => setAreaOfUse(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4 text-sm text-muted-foreground">
            <div className="col-span-4 text-center">Balance Quantity: {currentQuantity - quantityUsed}</div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>Record Usage</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecordUsageDialog;

