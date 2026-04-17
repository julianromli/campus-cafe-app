import {
	FLOOR_PLAN_HEIGHT,
	FLOOR_PLAN_WIDTH,
} from "@/components/reserve/floor-plan-config";

const PLACEHOLDER_RECTS: { h: number; w: number; x: number; y: number }[] = [
	{ h: 64, w: 108, x: 80, y: 80 },
	{ h: 64, w: 108, x: 240, y: 120 },
	{ h: 64, w: 108, x: 420, y: 90 },
	{ h: 64, w: 108, x: 580, y: 200 },
	{ h: 64, w: 108, x: 120, y: 280 },
	{ h: 64, w: 108, x: 360, y: 320 },
	{ h: 64, w: 108, x: 520, y: 380 },
	{ h: 64, w: 108, x: 200, y: 440 },
];

export function FloorPlanSkeleton() {
	return (
		<div className="w-full overflow-x-auto rounded-lg border bg-muted/20">
			<svg
				className="min-w-[720px] text-muted"
				height={FLOOR_PLAN_HEIGHT}
				viewBox={`0 0 ${FLOOR_PLAN_WIDTH} ${FLOOR_PLAN_HEIGHT}`}
				width={FLOOR_PLAN_WIDTH}
			>
				<title>Memuat denah meja</title>
				<rect
					className="fill-muted/40"
					height={FLOOR_PLAN_HEIGHT}
					width={FLOOR_PLAN_WIDTH}
					x={0}
					y={0}
				/>
				{PLACEHOLDER_RECTS.map((r, i) => (
					<rect
						className="animate-pulse fill-muted-foreground/25"
						height={r.h}
						key={i}
						rx={6}
						width={r.w}
						x={r.x}
						y={r.y}
					/>
				))}
			</svg>
		</div>
	);
}
