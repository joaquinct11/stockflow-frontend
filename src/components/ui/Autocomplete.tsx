import { useState, useRef, useEffect } from 'react';
import { Input } from './Input';
import { Search, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  id: number | string;
  label: string;
  subtitle?: string;
}

interface AutocompleteProps {
  options: Option[];
  value?: Option | null;
  onChange: (option: Option | null) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function Autocomplete({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  emptyMessage = 'No se encontraron resultados',
  disabled = false,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrar opciones
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resetear búsqueda al cerrar
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Actualizar input cuando cambia el value
  useEffect(() => {
    if (value) {
      setSearch(value.label);
    } else {
      setSearch('');
    }
  }, [value]);

  const handleSelect = (option: Option) => {
    onChange(option);
    setSearch(option.label);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="pl-8"
        />
      </div>

      {/* Dropdown - ✅ FONDO SÓLIDO */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-card shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="max-h-60 overflow-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.id}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                    highlightedIndex === index
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground',
                    value?.id === option.id && 'bg-accent'
                  )}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{option.label}</div>
                    {option.subtitle && (
                      <div className="text-xs text-muted-foreground">
                        {option.subtitle}
                      </div>
                    )}
                  </div>
                  {value?.id === option.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}