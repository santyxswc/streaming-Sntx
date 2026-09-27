'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const PageLoader = ({ fullScreen = true, message = 'Iniciando transmisión' }) => {
  return (
    <div className={cn(
      "bg-background flex flex-col items-center justify-center overflow-hidden",
      fullScreen ? "fixed inset-0 z-[100]" : "absolute inset-0 z-10"
    )}>
      <div className="relative">
        {/* Animated Background Pulse */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-primary blur-[100px] rounded-full"
        />

        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ 
            scale: [0.8, 1.1, 1],
            opacity: 1
          }}
          transition={{ 
            duration: 1.2,
            ease: "easeOut"
          }}
          className="relative text-primary text-5xl md:text-7xl font-black tracking-tighter uppercase select-none"
        >
          streaming<span className="text-secondary">-Sntx</span>
          
          {/* Shine Effect */}
          <motion.div 
            animate={{ 
              x: ['-100%', '200%']
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 0.5
            }}
            className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 translate-x-full"
          />
        </motion.div>
      </div>

      {/* Progress Bar Container */}
      <div className="mt-12 w-48 h-1 bg-white/10 rounded-full overflow-hidden relative">
        <motion.div 
          animate={{ 
            x: ['-100%', '100%']
          }}
          transition={{ 
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 bg-primary rounded-full shadow-[0_0_15px_rgba(139,92,246,0.8)]"
        />
      </div>

      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="mt-6 text-gray-500 uppercase tracking-[0.3em] text-[10px] font-bold"
      >
        {message}
      </motion.p>
    </div>
  );
};

export default PageLoader;
