import { PackageOpen } from 'lucide-react';
import { Button } from '../ui/Button';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex h-[450px] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-muted p-6">
        <PackageOpen size={48} className="text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </div>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}