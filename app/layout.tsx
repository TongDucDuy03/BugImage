import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
	title: "Báo cáo lỗi hàng ngày",
	description: "Dashboard và trình chiếu TV — báo cáo ngày, import Excel, theo dõi lỗi"
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="vi" suppressHydrationWarning>
			<body className="bg-bg text-text antialiased">
				{children}
			</body>
		</html>
	);
}

