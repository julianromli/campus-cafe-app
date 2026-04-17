import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@campus-cafe/ui/components/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

export type TrendDay = {
	date: string;
	orderCount: number;
	reservations: number;
};

const chartConfig = {
	reservations: {
		color: "var(--chart-1)",
		label: "Reservasi",
	},
} satisfies ChartConfig;

function formatAxisDate(isoDate: string): string {
	const parts = isoDate.split("-");
	if (parts.length !== 3) {
		return isoDate;
	}

	const [, month, day] = parts;
	return `${month}-${day}`;
}

type ReservationsTrendChartProps = {
	data: TrendDay[];
};

export default function ReservationsTrendChart({
	data,
}: ReservationsTrendChartProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Tren reservasi (30 hari)</CardTitle>
				<CardDescription>
					Jumlah reservasi terkonfirmasi per hari (UTC)
				</CardDescription>
			</CardHeader>
			<CardContent className="pl-0">
				<ChartContainer
					config={chartConfig}
					className="h-[280px] w-full min-w-0"
				>
					<LineChart
						accessibilityLayer
						data={data}
						margin={{ left: 8, right: 12, top: 8, bottom: 0 }}
					>
						<CartesianGrid
							vertical={false}
							strokeDasharray="3 3"
							className="stroke-border/60"
						/>
						<XAxis
							dataKey="date"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={16}
							tickFormatter={formatAxisDate}
						/>
						<YAxis
							allowDecimals={false}
							tickLine={false}
							axisLine={false}
							width={32}
						/>
						<ChartTooltip content={<ChartTooltipContent indicator="line" />} />
						<Line
							dataKey="reservations"
							type="monotone"
							stroke="var(--color-reservations)"
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 4 }}
						/>
						{/* TODO(B-028): <Line dataKey="orderCount" ... /> */}
					</LineChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
