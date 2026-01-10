import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

export type ResourceTable = "academic_institutions" | "academic_degrees";

interface ResourceComboboxProps {
  table: ResourceTable;
  value?: string | null; // The name (text value)
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface Resource {
  id: string;
  name: string;
}

export function ResourceCombobox({
  table,
  value,
  onChange,
  disabled = false,
  placeholder,
}: ResourceComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch resources from Supabase
  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: [`resources-${table}`],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error(`Error fetching ${table}:`, error);
        throw error;
      }

      return (data || []) as Resource[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Mutation for inserting new resource
  const insertMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from(table)
        .insert({ name })
        .select()
        .single();

      if (error) {
        // Check if it's a unique constraint violation (name already exists)
        if (error.code === "23505") {
          throw new Error("ערך זה כבר קיים ברשימה");
        }
        console.error(`Error inserting into ${table}:`, error);
        throw error;
      }

      return data as Resource;
    },
    onSuccess: (newResource) => {
      // Invalidate and refetch the resources list
      queryClient.invalidateQueries({ queryKey: [`resources-${table}`] });
      
      // Update the form value with the new resource name
      onChange(newResource.name);
      
      toast({
        title: "התווסף בהצלחה",
        description: `${newResource.name} נוסף לרשימה`,
      });
      
      setOpen(false);
      setSearchQuery("");
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה",
        description: error.message || "נכשל בהוספת הערך",
        variant: "destructive",
      });
    },
  });

  // Filter resources based on search query (client-side filtering)
  const filteredResources = resources.filter((resource) =>
    resource.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if search query matches any resource exactly
  const exactMatch = resources.find(
    (resource) => resource.name.toLowerCase() === searchQuery.toLowerCase()
  );

  // Check if we should show "Add new" option
  const shouldShowCreate =
    searchQuery.trim().length > 0 &&
    !exactMatch &&
    !filteredResources.some((r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleSelect = (resourceName: string) => {
    onChange(resourceName);
    setOpen(false);
    setSearchQuery("");
  };

  const handleCreate = () => {
    if (searchQuery.trim()) {
      insertMutation.mutate(searchQuery.trim());
    }
  };

  // Get display text
  const displayText = value || placeholder || `בחר ${table === "academic_institutions" ? "מוסד אקדמי" : "תואר"}...`;

  // Check if current value exists in resources
  const isValueInList = value
    ? resources.some((r) => r.name === value)
    : false;

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
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {displayText}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`חפש ${table === "academic_institutions" ? "מוסד אקדמי" : "תואר"}...`}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                טוען...
              </div>
            )}
            {!isLoading && resources.length === 0 && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  אין פריטים ברשימה
                </div>
              </CommandEmpty>
            )}
            {!isLoading && resources.length > 0 && filteredResources.length === 0 && !shouldShowCreate && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  לא נמצאו תוצאות תואמות
                </div>
              </CommandEmpty>
            )}
            {!isLoading && filteredResources.length > 0 && (
              <CommandGroup>
                {filteredResources.map((resource) => (
                  <CommandItem
                    key={resource.id}
                    value={resource.name}
                    onSelect={() => handleSelect(resource.name)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === resource.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1">{resource.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!isLoading && shouldShowCreate && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreate}
                  className="text-primary"
                  disabled={insertMutation.isPending}
                >
                  {insertMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  <span>הוסף '{searchQuery.trim()}' לרשימה</span>
                </CommandItem>
              </CommandGroup>
            )}
            {/* Show current value if it's not in the list */}
            {!isLoading && value && !isValueInList && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => handleSelect(value)}
                  className="bg-muted/50"
                >
                  <Check className="mr-2 h-4 w-4 opacity-100" />
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
