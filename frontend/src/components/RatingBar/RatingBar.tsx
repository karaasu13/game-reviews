import { useMemo, useState } from "react";
import styles from "./RatingBar.module.css";

// Props para a barra de rating 0.5–10
export interface RatingBarProps {
	value?: number | null;
	onChange?: (value: number) => void;
	disabled?: boolean;
	label?: string;
	hint?: string;
}

// Degraus de 0.5 em 0.5 até 10
const STEPS = Array.from({ length: 20 }, (_v, i) => (i + 1) * 0.5);

// Mapeia valor para um gradiente HSL vermelho→verde
const colorForValue = (value: number): string => {
	// Map 0-10 to a smooth red→yellow→green gradient
	const clamped = Math.max(0, Math.min(10, value));
	const ratio = clamped / 10;
	// Hue from 0 (red) to 120 (green)
	const hue = 120 * ratio;
	return `hsl(${hue}, 75%, 52%)`;
};

export function RatingBar({ value, onChange, disabled, label, hint }: RatingBarProps) {
	const [hoverValue, setHoverValue] = useState<number | null>(null);

	const displayValue = useMemo(() => {
		if (hoverValue !== null) return hoverValue;
		if (typeof value === "number") return value;
		return 0;
	}, [hoverValue, value]);

	const handleClick = (next: number) => {
		if (disabled) return;
		onChange?.(next);
	};

	return (
		<div className={styles.wrapper}>
			<div className={styles.headerRow}>
				<div>
					{label && <div className={styles.label}>{label}</div>}
					{hint && <div className={styles.hint}>{hint}</div>}
				</div>
				<div className={styles.scoreBubble} aria-live="polite">
					<div className={styles.scoreValue}>{displayValue.toFixed(1)}</div>
					<div className={styles.scoreScale}>/ 10</div>
				</div>
			</div>

			<div className={styles.bar} role="group" aria-label="Atribuir pontuacao de 0.5 a 10">
				{STEPS.map((step) => {
					const isActive = displayValue >= step - 0.001;
					const isSelected = typeof value === "number" && value >= step - 0.001;
					const color = colorForValue(step);
					return (
						<button
							key={step}
							type="button"
							className={`${styles.segment} ${isActive ? styles.segmentActive : ""} ${isSelected ? styles.segmentSelected : ""}`}
							style={{ backgroundColor: color, borderColor: color }}
							onMouseEnter={() => setHoverValue(step)}
							onMouseLeave={() => setHoverValue(null)}
							onFocus={() => setHoverValue(step)}
							onBlur={() => setHoverValue(null)}
							onClick={() => handleClick(step)}
							disabled={disabled}
							aria-label={`${step} em 10`}
						/>
					);
				})}
			</div>
		</div>
	);
}
