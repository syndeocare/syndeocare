import { useEffect, useMemo, useState } from "react";
import { Search, Plus, X, Loader2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { backendDb } from "@/integrations/backend/client";
import { useTranslation } from "react-i18next";

export interface TaxonomyOption {
  id: string;
  name: string;
  name_ar: string | null;
}

interface TaxonomyPickerProps {
  /** Table to fetch from (must expose name, name_ar, is_active, display_order) */
  table: "specialties" | "certifications" | "job_roles";
  /** Currently selected canonical English names */
  value: string[];
  onChange: (next: string[]) => void;
  /** Optional translated placeholder for search input */
  searchPlaceholder?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Allow free-text custom entries */
  allowCustom?: boolean;
  /** Color theme for chips */
  variant?: "primary" | "secondary";
}

/**
 * Reusable searchable multi-select bound to an admin-managed catalog table.
 * Displays Arabic names when the UI is in Arabic but always persists the
 * canonical English name so downstream search/matching stays consistent.
 */
const TaxonomyPicker = ({
  table,
  value,
  onChange,
  searchPlaceholder,
  emptyMessage,
  allowCustom = true,
  variant = "primary",
}: TaxonomyPickerProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const [options, setOptions] = useState<TaxonomyOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      const { data, error } = await backendDb
        .from(table as any)
        .select("id, name, name_ar")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (mounted) {
        if (!error && data) setOptions(data as any);
        setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [table]);

  const displayName = (o: TaxonomyOption) =>
    isRTL && o.name_ar ? o.name_ar : o.name;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.name_ar || "").toLowerCase().includes(q),
    );
  }, [options, query]);

  const isSelected = (name: string) => value.includes(name);

  const toggle = (name: string) => {
    if (isSelected(name)) {
      onChange(value.filter((v) => v !== name));
    } else {
      onChange([...value, name]);
    }
  };

  const addCustom = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
    setQuery("");
  };

  const remove = (name: string) => onChange(value.filter((v) => v !== name));

  const chipBase =
    variant === "primary"
      ? "bg-primary/10 text-primary hover:bg-primary/20"
      : "bg-secondary text-foreground hover:bg-muted";

  // Show selected names in localized form when available
  const labelFor = (canonical: string) => {
    const match = options.find((o) => o.name === canonical);
    return match ? displayName(match) : canonical;
  };

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2" role="list">
          {value.map((name) => (
            <Badge
              key={name}
              variant="secondary"
              className={`gap-1 px-3 py-1.5 text-sm font-normal ${chipBase}`}
              role="listitem"
            >
              {labelFor(name)}
              <button
                type="button"
                onClick={() => remove(name)}
                aria-label={t("common.delete")}
                className="ms-1 rounded-full p-0.5 hover:bg-background/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder || t("common.search")}
          className={`${isRTL ? "pr-10" : "pl-10"} min-h-[44px]`}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length === 1) {
                toggle(filtered[0].name);
                setQuery("");
              } else if (allowCustom && filtered.length === 0) {
                addCustom();
              }
            }
          }}
        />
      </div>

      {/* Options list */}
      <div className="rounded-lg border border-border bg-card max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {emptyMessage || t("common.noResults")}
            </p>
            {allowCustom && query.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustom}
              >
                <Plus className="w-4 h-4 me-1" />
                {t("onboarding.fields.addCustom", { value: query.trim() })}
              </Button>
            )}
          </div>
        ) : (
          <ul
            role="listbox"
            aria-multiselectable="true"
            className="divide-y divide-border"
          >
            {filtered.map((o) => {
              const selected = isSelected(o.name);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggle(o.name)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-start transition-colors min-h-[44px] ${
                      selected ? "bg-primary/5" : "hover:bg-secondary/60"
                    }`}
                  >
                    <span className="text-sm text-foreground truncate">
                      {displayName(o)}
                      {isRTL && o.name_ar && (
                        <span className="ms-2 text-xs text-muted-foreground">
                          ({o.name})
                        </span>
                      )}
                    </span>
                    {selected && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TaxonomyPicker;
