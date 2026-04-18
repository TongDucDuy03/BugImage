import { redirect } from "next/navigation";

export default async function EditDailyReportPage() {
	redirect("/admin/reports");
}
