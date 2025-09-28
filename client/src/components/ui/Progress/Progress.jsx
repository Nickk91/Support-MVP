import styles from "./progress.module.css";
export default function Progress({ value = 0, className = "" }) {
  return (
    <div className={`${styles.bar} ${className}`.trim()}>
      <div
        className={styles.fill}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
