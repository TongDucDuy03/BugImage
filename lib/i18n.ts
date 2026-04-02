export function severityLabelVi(value: string): string {
	switch (value) {
		case "low":
			return "Thấp";
		case "medium":
			return "Trung bình";
		case "high":
			return "Cao";
		case "critical":
			return "Nghiêm trọng";
		default:
			return value;
	}
}

