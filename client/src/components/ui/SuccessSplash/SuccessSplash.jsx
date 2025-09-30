// src/components/ui/SuccessSplash/SuccessSplash.jsx
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { FaBolt } from "react-icons/fa"; // big lightning bolt

export default function SuccessSplash({ show = false, onComplete }) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        if (onComplete) onComplete();
      }, 2500); // splash lasts ~2.5s
      return () => clearTimeout(t);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Lightning bolt */}
          <motion.div
            initial={{ scale: 0.2, rotate: -20, opacity: 0 }}
            animate={{ scale: 1.5, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.2, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.9)]"
          >
            <FaBolt size={120} />
          </motion.div>

          {/* Frankenstein text */}
          <motion.h1
            className="mt-6 text-5xl font-extrabold text-primary drop-shadow-lg"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
          >
            It’s alive!
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
