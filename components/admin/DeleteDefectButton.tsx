 "use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteDefectButton({ defectId }: { defectId: string }) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	async function onDelete() {
		const ok = window.confirm("Bạn chắc chắn muốn xóa lỗi này? (xóa mềm)");
		if (!ok) return;
		setLoading(true);
		const res = await fetch(`/api/defects/${defectId}`, { method: "DELETE" });
		setLoading(false);
		if (res.ok) router.refresh();
		else alert("Xóa thất bại");
	}

	return (
		<button
			type="button"
			onClick={onDelete}
			disabled={loading}
			className="underline text-danger disabled:opacity-60"
		>
			{loading ? "Đang xóa..." : "Xóa"}
		</button>
	);
}

