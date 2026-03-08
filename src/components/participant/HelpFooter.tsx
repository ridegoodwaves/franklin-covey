import { PROGRAM_ADMIN } from "@/lib/config";
import { cn } from "@/lib/utils";

export function HelpFooter({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <footer
      id="help-footer"
      className={cn(
        "text-sm text-muted-foreground text-center space-y-1 pt-6",
        className
      )}
      style={style}
    >
      <p>Need help? Contact your {PROGRAM_ADMIN.role}.</p>
      <p>
        <span className="font-semibold text-foreground">
          {PROGRAM_ADMIN.name}
        </span>
        {" \u2014 "}
        <a
          href={`mailto:${PROGRAM_ADMIN.email}`}
          className="text-fc-600 underline underline-offset-2 hover:text-fc-700 transition-colors"
        >
          {PROGRAM_ADMIN.email}
        </a>
      </p>
    </footer>
  );
}
