import { motion } from 'framer-motion';

const GlassCard = ({ 
  children, 
  className = '', 
  hover = true,
  glow = false,
  onClick = null,
  ...props 
}) => {
  const baseClasses = 'glass-card p-6 transition-all duration-300';
  const hoverClasses = hover ? 'cursor-pointer' : '';
  const glowClasses = glow ? 'animate-glow-pulse' : '';

  return (
    <motion.div
      className={`${baseClasses} ${hoverClasses} ${glowClasses} ${className}`}
      whileHover={hover ? { scale: 1.01, y: -2 } : {}}
      whileTap={onClick ? { scale: 0.99 } : {}}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
