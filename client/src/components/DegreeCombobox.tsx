import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
import { getDegreesForUniversity } from "@/lib/universities";

interface DegreeComboboxProps {
  value?: string | null; // Degree name (Hebrew text)
  onValueChange: (value: string | null) => void;
  universityCode?: string | null; // University code (e.g., "SCE", "BGU")
  disabled?: boolean;
  placeholder?: string;
}

export function DegreeCombobox({
  value,
  onValueChange,
  universityCode,
  disabled = false,
  placeholder = "בחר או הקלד שם תואר...",
}: DegreeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get available degrees for the selected university
  const availableDegrees = getDegreesForUniversity(universityCode);

  // Check if current value is in the list
  const isValueInList = value ? availableDegrees.includes(value) : false;

  // Filter degrees based on search query
  const filteredDegrees = availableDegrees.filter((degree) =>
    degree.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if search query matches any degree exactly
  const exactMatch = availableDegrees.find(
    (degree) => degree.toLowerCase() === searchQuery.toLowerCase()
  );

  // Check if we should show "Create" option (user typed something not in list)
  const shouldShowCreate = 
    searchQuery.trim().length > 0 && 
    !exactMatch && 
    !availableDegrees.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSelect = (degree: string) => {
    onValueChange(degree);
    setOpen(false);
    setSearchQuery("");
  };

  const handleCreate = () => {
    // Use the search query as the new degree name
    if (searchQuery.trim()) {
      onValueChange(searchQuery.trim());
      setOpen(false);
      setSearchQuery("");
    }
  };

  // Handle Enter key or when popover closes with text in search
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && searchQuery.trim() && !exactMatch) {
      // User closed the popover with text that doesn't match - save it
      onValueChange(searchQuery.trim());
      setSearchQuery("");
    }
    // Update open state (controlled by parent, but we need to handle the logic)
  };

  // Reset search query when popover closes (but only if we didn't save a custom value)
  useEffect(() => {
    if (!open && searchQuery.trim() && !exactMatch) {
      // Don't reset if there's a custom value that should be saved
      // This is handled in onOpenChange
    } else if (!open) {
      setSearchQuery("");
    }
  }, [open, searchQuery, exactMatch]);

  return (
    <Popover 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          // Popover is closing
          if (searchQuery.trim() && !exactMatch && !availableDegrees.some(d => d.toLowerCase() === searchQuery.toLowerCase())) {
            // User typed something custom that's not in the list - save it
            onValueChange(searchQuery.trim());
          }
          setSearchQuery("");
        }
        setOpen(newOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="חפש או הקלד שם תואר..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {availableDegrees.length === 0 && !universityCode && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  בחר מוסד אקדמי תחילה
                </div>
              </CommandEmpty>
            )}
            {availableDegrees.length === 0 && universityCode && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  אין תוארים מוגדרים למוסד זה. הקלד שם תואר מותאם אישית.
                </div>
              </CommandEmpty>
            )}
            {availableDegrees.length > 0 && filteredDegrees.length === 0 && !shouldShowCreate && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  לא נמצאו תוארים תואמים
                </div>
              </CommandEmpty>
            )}
            {filteredDegrees.length > 0 && (
              <CommandGroup>
                {filteredDegrees.map((degree) => (
                  <CommandItem
                    key={degree}
                    value={degree}
                    onSelect={() => handleSelect(degree)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === degree ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1">{degree}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {shouldShowCreate && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreate}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>צור "{searchQuery.trim()}"</span>
                </CommandItem>
              </CommandGroup>
            )}
            {/* Show current value if it's not in the list */}
            {value && !isValueInList && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => handleSelect(value)}
                  className="bg-muted/50"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      "opacity-100"
                    )}
                  />
                  <span className="flex-1">{value}</span>
                  <span className="text-xs text-muted-foreground">מותאם אישית</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
