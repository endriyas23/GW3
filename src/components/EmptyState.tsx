import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionLink,
  onAction
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-muted/20 rounded-[2.5rem] border-2 border-dashed border-muted">
      <div className="p-6 bg-background rounded-full shadow-sm mb-6">
        <Icon className="w-12 h-12 text-muted-foreground/50" />
      </div>
      <h3 className="text-2xl font-black mb-2 tracking-tight">{title}</h3>
      <p className="text-muted-foreground max-w-xs mb-8 font-medium">
        {description}
      </p>
      {actionLink ? (
        <Link to={actionLink}>
          <Button size="lg" className="rounded-2xl font-black px-8 h-14 shadow-xl shadow-primary/20">
            {actionLabel}
          </Button>
        </Link>
      ) : actionLabel && onAction ? (
        <Button 
          size="lg" 
          className="rounded-2xl font-black px-8 h-14 shadow-xl shadow-primary/20"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
