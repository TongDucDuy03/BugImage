import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
	title: "BugImage - Trưng bày lỗi sản phẩm",
	description: "Trưng bày lỗi sản phẩm với trình chiếu đẹp mắt và trang quản trị"
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

