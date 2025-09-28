import styles from "./button.module.css";

export default function Button({
  children,
  variant = "default",
  className = "",
  ...props
}) {
  return (
    <button
      data-variant={variant}
      className={`${styles.btn} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
