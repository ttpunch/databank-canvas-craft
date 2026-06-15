import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default'
}) => {
  const getIconWrapperStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-success/10 text-success';
      case 'warning':
        return 'bg-warning/10 text-warning';
      case 'info':
        return 'bg-info/10 text-info';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${getIconWrapperStyles()} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
