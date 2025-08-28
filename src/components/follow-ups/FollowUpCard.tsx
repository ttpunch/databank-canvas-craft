import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, CheckCircle, RotateCcw } from 'lucide-react';
import { format, isPast } from 'date-fns';

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

interface FollowUpCardProps {
  followUp: FollowUp;
  onReschedule: (followUp: FollowUp) => void;
  onComplete: (id: string) => void;
}

const FollowUpCard: React.FC<FollowUpCardProps> = ({
  followUp,
  onReschedule,
  onComplete,
}) => {
  const isOverdue = isPast(new Date(followUp.due_date)) && followUp.status === 'pending';
  const isCompleted = followUp.status === 'completed';

  return (
    <Card className={`transition-all bg-card text-card-foreground ${isOverdue ? 'border-destructive shadow-md' : ''} ${isCompleted ? 'opacity-70' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg leading-tight text-foreground">{followUp.title}</CardTitle>
          <Badge 
            variant={isOverdue ? 'destructive' : (isCompleted ? 'default' : 'secondary')}
            className="w-fit"
          >
            {isOverdue ? 'Overdue' : (isCompleted ? 'Completed' : 'Pending')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {followUp.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 text-muted-foreground">
            {followUp.description}
          </p>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarIcon className="h-3 w-3" />
          Due: {format(new Date(followUp.due_date), 'PPP')}
        </div>
        <div className="flex gap-2 pt-4 border-t">
          {!isCompleted && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onReschedule(followUp)}
              className="gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Reschedule
            </Button>
          )}
          {!isCompleted && (
            <Button 
              size="sm" 
              onClick={() => onComplete(followUp.id)}
              className="gap-1"
            >
              <CheckCircle className="h-3 w-3" /> Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FollowUpCard;
