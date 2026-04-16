type PagePlaceholderProps = {
  description: string;
  title: string;
};

export default function PagePlaceholder({ description, title }: PagePlaceholderProps) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Sprint 1 Skeleton</p>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
