import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function StatsCard({ title, value, description, icon: Icon }: StatsCardProps) {
  return (
    <Card className="border border-muted bg-card">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-extrabold tracking-tight text-foreground">{value}</p>
          {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
        </div>
        <div className="h-10 w-10 bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
