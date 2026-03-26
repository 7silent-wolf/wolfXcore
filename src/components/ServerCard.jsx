import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Server, 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  Terminal,
  Cpu,
  HardDrive
} from 'lucide-react';
import GlassCard from './GlassCard';
import NeonProgress from './NeonProgress';
import StatusBadge from './StatusBadge';

const ServerCard = ({ server, onStart, onStop, onRestart, onDelete, onConsole }) => {
  const [loading, setLoading] = useState(null);

  const handleAction = async (action, handler) => {
    setLoading(action);
    try {
      await handler(server.id);
    } finally {
      setLoading(null);
    }
  };

  const ActionButton = ({ icon: Icon, label, action, handler, variant = 'default' }) => {
    const isLoading = loading === action;
    const isDisabled = loading !== null;

    const variants = {
      default: 'hover:bg-primary/20 hover:border-primary/50',
      danger: 'hover:bg-destructive/20 hover:border-destructive/50 text-destructive',
    };

    return (
      <motion.button
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 
          transition-all duration-200 text-sm font-mono
          ${variants[variant]}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={() => handleAction(action, handler)}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
      >
        {isLoading ? (
          <motion.div
            className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          <Icon size={16} />
        )}
        <span className="hidden sm:inline">{label}</span>
      </motion.button>
    );
  };

  return (
    <GlassCard className="overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center neon-border">
            <Server size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg">{server.name}</h3>
            <p className="text-sm text-muted-foreground font-mono">{server.ip}</p>
          </div>
        </div>
        <StatusBadge status={server.status} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">CPU Usage</span>
          </div>
          <NeonProgress value={server.cpu} max={100} showPercentage={true} size="sm" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">RAM Usage</span>
          </div>
          <NeonProgress value={server.ram} max={100} showPercentage={true} size="sm" />
        </div>
      </div>

      {/* Plan & Created */}
      <div className="flex items-center justify-between text-sm mb-4 pb-4 border-b border-border/30">
        <span className="text-muted-foreground">Plan: <span className="text-primary">{server.plan}</span></span>
        <span className="text-muted-foreground font-mono text-xs">{server.createdAt}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {server.status === 'offline' ? (
          <ActionButton icon={Play} label="Start" action="start" handler={onStart} />
        ) : (
          <ActionButton icon={Square} label="Stop" action="stop" handler={onStop} />
        )}
        <ActionButton icon={RotateCcw} label="Restart" action="restart" handler={onRestart} />
        <ActionButton icon={Terminal} label="Console" action="console" handler={onConsole} />
        <ActionButton icon={Trash2} label="Delete" action="delete" handler={onDelete} variant="danger" />
      </div>
    </GlassCard>
  );
};

export default ServerCard;
