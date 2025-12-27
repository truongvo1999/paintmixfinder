"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type AutocompleteOption = {
  value: string;
  label: string;
  meta?: Record<string, string>;
};

type AutocompleteProps = {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  onSearch: (query: string) => Promise<AutocompleteOption[]>;
};

export default function Autocomplete({
  value,
  placeholder,
  disabled,
  onChange,
  onSelect,
  onSearch
}: AutocompleteProps) {
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const hasOptions = options.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    const timer = setTimeout(() => {
      onSearch(value)
        .then((result) => {
          setOptions(result);
          setActiveIndex(result.length > 0 ? 0 : -1);
        })
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [value, onSearch, isOpen]);

  const handleSelect = (option: AutocompleteOption) => {
    onChange(option.value);
    onSelect?.(option);
    setIsOpen(false);
  };

  const statusText = useMemo(() => {
    if (isLoading) return "loading";
    if (!hasOptions) return "empty";
    return "ready";
  }, [hasOptions, isLoading]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (!isOpen) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((prev) => Math.max(prev - 1, 0));
            }
            if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              handleSelect(options[activeIndex]);
            }
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400"
          >
            ×
          </button>
        )}
      </div>
      {isOpen && (
        <div
          role="listbox"
          aria-label="Autocomplete options"
          className="absolute z-10 mt-2 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {statusText === "loading" && (
            <div className="px-3 py-2 text-xs text-slate-400">...</div>
          )}
          {statusText === "empty" && (
            <div className="px-3 py-2 text-xs text-slate-400">-</div>
          )}
          {statusText === "ready" &&
            options.map((option, index) => (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
                className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                  index === activeIndex
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
