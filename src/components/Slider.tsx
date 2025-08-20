'use client';
import styles from '@/styles/Sliders.module.css';

type Props = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  rightAddon?: React.ReactNode;
};

export default function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  rightAddon,
}: Props) {
  return (
    <div className={styles.sliderRow}>
      <div className={styles.sliderHeader}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.sliderValue}>{value.toFixed(2)}</span>
        {rightAddon ? (
          <span className={styles.sliderInfo}>{rightAddon}</span>
        ) : null}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={styles.sliderInput}
      />
    </div>
  );
}
