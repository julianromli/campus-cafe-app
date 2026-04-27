const formatter = new Intl.NumberFormat("id-ID", {
	style: "currency",
	currency: "IDR",
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
});

export function formatIdr(amount: number): string {
	return formatter.format(amount);
}
