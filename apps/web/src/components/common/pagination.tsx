import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@clinic/shared";
import { Button } from "@/components/ui/button";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}

export function Pagination({
  pagination,
  onPageChange,
  itemLabel = "result",
  className,
}: PaginationProps) {
  const { page, limit, total, totalPages } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        {total === 0
          ? `No ${pluralize(2, itemLabel)} found`
          : `Showing ${start}–${end} of ${total} ${pluralize(total, itemLabel)}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <span className="min-w-20 text-center text-xs font-medium text-muted-foreground">
          Page {totalPages === 0 ? 0 : page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
