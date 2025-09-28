import styles from "./card.module.css";

export default function Card({ children, className = "" }) {
  return <div className={`${styles.card} ${className}`.trim()}>{children}</div>;
}
