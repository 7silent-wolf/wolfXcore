import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = 'default', text = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    default: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        className={`${sizeClasses[size]} border-2 border-primary/30 border-t-primary rounded-full`}
        style={{
          boxShadow: '0 0 20px hsl(120 100% 50% / 0.3)',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      {text && (
        <motion.span
          className="text-sm text-muted-foreground font-mono"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.span>
      )}
    </div>
  );
};

export default LoadingSpinner;
