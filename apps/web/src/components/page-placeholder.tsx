type PagePlaceholderProps = {
	description: string;
	title: string;
};

export default function PagePlaceholder({
	description,
	title,
}: PagePlaceholderProps) {
	return (
		<section className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-lg border border-border bg-card p-6">
			<p className="text-muted-foreground text-sm uppercase tracking-[0.2em]">
				Sprint 1 Skeleton
			</p>
			<div className="flex flex-col gap-2">
				<h1 className="font-semibold text-3xl">{title}</h1>
				<p className="text-muted-foreground text-sm leading-6">{description}</p>
			</div>
		</section>
	);
}
