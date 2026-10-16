import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  count?: number | string;
  action?: ReactNode;
};

export function PageHeader({ title, subtitle, count, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {(subtitle || count !== undefined) && (
          <p className="mt-1 text-sm text-muted">
            {subtitle}
            {subtitle && count !== undefined ? " · " : null}
            {count !== undefined ? (
              <span className="tabular-nums">{count}</span>
            ) : null}
          </p>
        )}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
