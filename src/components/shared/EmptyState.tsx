import { PackageOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  const RenderIcon = Icon ?? PackageOpen;

  return (
    <div className="flex h-[420px] flex-col items-center justify-center gap-5 text-center px-6">
      {/* Icono con fondo degradado suave */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-150" />
        <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 p-5">
          <RenderIcon size={40} className="text-primary/60" />
        </div>
      </div>

      {/* Texto */}
      <div className="space-y-1.5 max-w-xs">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
