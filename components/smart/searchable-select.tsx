// components/smart/searchable-select.tsx
// Obsidian ERP v4.0 - Searchable Select with Scrollbar

"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface SelectOption {
  /** Unique value for the option */
  value: string;
  /** Display label */
  label: string;
  /** Optional description shown below label */
  description?: string;
  /** Whether this option is disabled */
  disabled?: boolean;
}

interface SearchableSelectProps {
  /** Options to display */
  options: SelectOption[];
  /** Currently selected value */
  value?: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether options are loading */
  loading?: boolean;
  /** Additional class names */
  className?: string;
  /** Max height for the dropdown */
  maxHeight?: number;
}

/**
 * SearchableSelect - Premium searchable dropdown with scrollbar
 *
 * @example
 * ```tsx
 * const [value, setValue] = useState("");
 *
 * <SearchableSelect
 *   options={[
 *     { value: "1", label: "Option 1" },
 *     { value: "2", label: "Option 2" },
 *   ]}
 *   value={value}
 *   onChange={setValue}
 *   placeholder="Select an option"
 *   searchPlaceholder="Search options..."
 * />
 * ```
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  loading = false,
  className,
  maxHeight = 280,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Find selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerSearch) ||
        opt.description?.toLowerCase().includes(lowerSearch)
    );
  }, [options, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "w-full justify-between font-normal rounded-xl h-11",
            "bg-background hover:bg-accent/50",
            "border-input hover:border-ring",
            "transition-all duration-200",
            !value && "text-muted-foreground",
            className
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[var(--radix-popover-trigger-width)] p-0",
          "rounded-xl border-0 shadow-xl",
          "bg-popover/95 backdrop-blur-xl"
        )}
        align="start"
        sideOffset={4}
      >
        <Command className="rounded-xl">
          {/* Search Input */}
          <div className="flex items-center border-b border-border/50 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
              className="h-10 border-0 bg-transparent focus:ring-0 placeholder:text-muted-foreground"
            />
          </div>

          {/* Options List with Scrollbar */}
          <CommandList
            className="custom-scrollbar"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup className="p-1">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  onSelect={() => {
                    onChange(option.value === value ? "" : option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "rounded-lg cursor-pointer py-2.5 px-3 my-0.5",
                    "transition-colors duration-150",
                    option.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {option.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SearchableSelect;
