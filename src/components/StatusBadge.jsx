import { motion } from 'framer-motion';

const StatusBadge = ({ status = 'online', label = null }) => {
  const isOnline = status === 'online' || status === 'active';
  
  const statusConfig = {
    online: { color: 'hsl(120 100% 50%)', label: 'Online' },
    active: { color: 'hsl(120 100% 50%)', label: 'Active' },
    offline: { color: 'hsl(0 80% 50%)', label: 'Offline' },
    pending: { color: 'hsl(45 100% 50%)', label: 'Pending' },
    completed: { color: 'hsl(120 100% 50%)', label: 'Completed' },
  };

  const config = statusConfig[status] || statusConfig.offline;

  return (
    <div className="flex items-center gap-2">
      <motion.div
        className="w-2 h-2 rounded-full"
        style={{
          background: config.color,
          boxShadow: `0 0 10px ${config.color}`,
        }}
        animate={isOnline ? { 
          opacity: [1, 0.5, 1],
          scale: [1, 1.1, 1],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <span 
        className="text-sm font-mono uppercase tracking-wide"
        style={{ color: config.color }}
      >
        {label || config.label}
      </span>
    </div>
  );
};

export default StatusBadge;
