import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { ISRAELI_UNIVERSITIES, getUniversityLabel, type University } from "@/lib/universities";

interface UniversityComboboxProps {
  value?: string | null; // English code (e.g., "SCE")
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function UniversityCombobox({
  value,
  onValueChange,
  disabled = false,
  placeholder = "בחר מוסד אקדמי...",
}: UniversityComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedUniversity = ISRAELI_UNIVERSITIES.find((u) => u.value === value);
  const displayLabel = selectedUniversity?.label || placeholder;

  const handleSelect = (university: University) => {
    onValueChange(university.value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className={cn("truncate", !selectedUniversity && "text-muted-foreground")}>
            {displayLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="חפש מוסד אקדמי..." />
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center text-sm text-muted-foreground">
                לא נמצא מוסד אקדמי תואם
              </div>
            </CommandEmpty>
            <CommandGroup>
              {ISRAELI_UNIVERSITIES.map((university) => (
                <CommandItem
                  key={university.value}
                  value={university.label} // Search by Hebrew label
                  onSelect={() => handleSelect(university)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === university.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1">{university.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Export helper function for use in other components
export { getUniversityLabel };
