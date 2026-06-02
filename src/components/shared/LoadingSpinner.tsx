export function LoadingSpinner() {
  return (
    <div className="flex h-[450px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-10 w-10">
          {/* Anillo de fondo */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
          {/* Anillo giratorio */}
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
        </div>
        <p className="text-sm text-muted-foreground font-medium animate-pulse">Cargando...</p>
      </div>
    </div>
  );
}
