import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FollowUp {
  id: string;
  due_date: string;
}

interface RescheduleFollowUpDialogProps {
  followUp: FollowUp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFollowUpRescheduled: () => void;
}

const RescheduleFollowUpDialog: React.FC<RescheduleFollowUpDialogProps> = ({
  followUp,
  open,
  onOpenChange,
  onFollowUpRescheduled,
}) => {
  const [loading, setLoading] = useState(false);
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (followUp && open) {
      setNewDueDate(new Date(followUp.due_date));
    } else if (!open) {
      setNewDueDate(undefined);
    }
  }, [followUp, open]);

  const handleReschedule = async () => {
    if (!followUp || !newDueDate) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('follow_ups')
        .update({
          due_date: newDueDate.toISOString(),
          status: 'pending', // Reset status to pending on reschedule
          updated_at: new Date().toISOString(),
        })
        .eq('id', followUp.id);

      if (error) throw error;

      toast({
        title: "Follow-up rescheduled",
        description: "The reminder has been successfully rescheduled.",
      });

      onOpenChange(false);
      onFollowUpRescheduled();
    } catch (error: any) {
      toast({
        title: "Error rescheduling follow-up",
        description: error.message,
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
          <DialogTitle>Reschedule Reminder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-due-date">New Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newDueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDueDate ? format(newDueDate, "PPP") : <span>Pick a new date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={newDueDate}
                  onSelect={setNewDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleReschedule} disabled={loading || !newDueDate}>
            {loading ? "Rescheduling..." : "Reschedule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleFollowUpDialog;
