import { buttonVariants } from "@campus-cafe/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@campus-cafe/ui/components/sheet";
import { cn } from "@campus-cafe/ui/lib/utils";
import { NavLink } from "react-router";

type SignInPromptSheetProps = {
	onOpenChange: (open: boolean) => void;
	open: boolean;
	redirectPath: string;
};

export default function SignInPromptSheet({
	onOpenChange,
	open,
	redirectPath,
}: SignInPromptSheetProps) {
	const encoded = encodeURIComponent(redirectPath);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-md" side="bottom">
				<SheetHeader>
					<SheetTitle>Masuk untuk memesan</SheetTitle>
					<SheetDescription>
						Kamu bisa melihat menu tanpa login. Untuk mengirim pesanan ke dapur,
						masuk dulu.
					</SheetDescription>
				</SheetHeader>
				<SheetFooter className="flex-col gap-2 sm:flex-col">
					<NavLink
						className={cn(buttonVariants(), "w-full justify-center")}
						to={`/sign-in?redirect=${encoded}`}
					>
						Masuk
					</NavLink>
					<NavLink
						className={cn(
							buttonVariants({ variant: "outline" }),
							"w-full justify-center",
						)}
						to={`/sign-up?redirect=${encoded}`}
					>
						Daftar
					</NavLink>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
