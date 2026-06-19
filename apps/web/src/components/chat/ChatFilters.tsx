import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MessageSquare, Image, File, Link } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatFilterType = "all" | "media" | "files" | "links";

interface ChatFiltersProps {
  activeFilter: ChatFilterType;
  onFilterChange: (filter: ChatFilterType) => void;
  counts?: {
    all: number;
    media: number;
    files: number;
    links: number;
  };
}

export const ChatFilters = ({
  activeFilter,
  onFilterChange,
  counts,
}: ChatFiltersProps) => {
  const { t } = useTranslation();

  const filters: {
    id: ChatFilterType;
    icon: React.ReactNode;
    label: string;
  }[] = [
    {
      id: "all",
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      label: t("chat.filterAll"),
    },
    {
      id: "media",
      icon: <Image className="h-3.5 w-3.5" />,
      label: t("chat.filterMedia"),
    },
    {
      id: "files",
      icon: <File className="h-3.5 w-3.5" />,
      label: t("chat.filterFiles"),
    },
    {
      id: "links",
      icon: <Link className="h-3.5 w-3.5" />,
      label: t("chat.filterLinks"),
    },
  ];

  return (
    <div className="flex gap-1 px-4 py-2 border-b bg-muted/30 overflow-x-auto">
      {filters.map((filter) => (
        <Button
          key={filter.id}
          variant={activeFilter === filter.id ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onFilterChange(filter.id)}
          className={cn(
            "h-7 px-2.5 text-xs gap-1.5 shrink-0",
            activeFilter === filter.id && "bg-primary/10 text-primary",
          )}
        >
          {filter.icon}
          {filter.label}
          {counts && counts[filter.id] > 0 && (
            <span className="text-[10px] bg-muted px-1 rounded">
              {counts[filter.id]}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
};
