import { redirect } from "next/navigation";

/** Đường dẫn cũ — chuyển sang báo cáo ngày. */
export default function AdminDefectsLegacyRedirect() {
	redirect("/admin/reports");
}
