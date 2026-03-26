import { motion } from 'framer-motion';

const NeonProgress = ({ value = 0, max = 100, label = '', showPercentage = true, size = 'default' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const sizeClasses = {
    sm: 'h-1',
    default: 'h-2',
    lg: 'h-3',
  };

  // Color based on percentage
  const getColor = () => {
    if (percentage < 50) return 'hsl(120 100% 50%)';
    if (percentage < 80) return 'hsl(60 100% 50%)';
    return 'hsl(0 100% 50%)';
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1 text-sm">
          <span className="text-muted-foreground">{label}</span>
          {showPercentage && (
            <span className="neon-text font-mono">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className={`neon-progress ${sizeClasses[size] || sizeClasses.default}`}>
        <motion.div
          className="neon-progress-bar"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            background: `linear-gradient(90deg, hsl(120 100% 30%), ${getColor()})`,
            boxShadow: `0 0 10px ${getColor()}, 0 0 20px ${getColor()}`,
          }}
        />
      </div>
    </div>
  );
};

export default NeonProgress;
