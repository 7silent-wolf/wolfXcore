// import { useEffect, useState } from 'react';
// import { motion } from 'framer-motion';

// // Floating neon dots animated background
// const NeonBackground = () => {
//   const [dots, setDots] = useState([]);

//   useEffect(() => {
//     // Generate random dots
//     const generateDots = () => {
//       const newDots = [];
//       for (let i = 0; i < 50; i++) {
//         newDots.push({
//           id: i,
//           x: Math.random() * 100,
//           y: Math.random() * 100,
//           size: Math.random() * 4 + 1,
//           delay: Math.random() * 5,
//           duration: Math.random() * 3 + 2,
//         });
//       }
//       setDots(newDots);
//     };

//     generateDots();
//   }, []);

//   return (
//     <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
//       {/* Gradient overlay */}
//       <div 
//         className="absolute inset-0"
//         style={{
//           background: 'radial-gradient(ellipse at center, hsl(120 100% 5% / 0.3) 0%, hsl(120 100% 2%) 100%)'
//         }}
//       />
      
//       {/* Scan line effect */}
//       <div 
//         className="absolute inset-0 opacity-5"
//         style={{
//           backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(120 100% 50% / 0.03) 2px, hsl(120 100% 50% / 0.03) 4px)',
//         }}
//       />

//       {/* Animated scan line */}
//       <motion.div
//         className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-20"
//         animate={{
//           y: ['-100vh', '100vh'],
//         }}
//         transition={{
//           duration: 8,
//           repeat: Infinity,
//           ease: 'linear',
//         }}
//       />

//       {/* Floating dots */}
//       {dots.map((dot) => (
//         <motion.div
//           key={dot.id}
//           className="absolute rounded-full"
//           style={{
//             left: `${dot.x}%`,
//             top: `${dot.y}%`,
//             width: dot.size,
//             height: dot.size,
//             background: 'hsl(120 100% 50%)',
//             boxShadow: `0 0 ${dot.size * 2}px hsl(120 100% 50% / 0.5)`,
//           }}
//           animate={{
//             y: [-20, 20, -20],
//             opacity: [0.2, 0.6, 0.2],
//           }}
//           transition={{
//             duration: dot.duration,
//             delay: dot.delay,
//             repeat: Infinity,
//             ease: 'easeInOut',
//           }}
//         />
//       ))}

//       {/* Corner glow effects */}
//       <div 
//         className="absolute top-0 left-0 w-96 h-96"
//         style={{
//           background: 'radial-gradient(circle at top left, hsl(120 100% 50% / 0.1) 0%, transparent 50%)'
//         }}
//       />
//       <div 
//         className="absolute bottom-0 right-0 w-96 h-96"
//         style={{
//           background: 'radial-gradient(circle at bottom right, hsl(120 100% 50% / 0.1) 0%, transparent 50%)'
//         }}
//       />
//     </div>
//   );
// };

// export default NeonBackground;






import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Floating neon dots animated background
const NeonBackground = () => {
  const [gridNodes, setGridNodes] = useState([]);

  useEffect(() => {
    // Generate grid nodes (intersections of grid lines)
    const generateGrid = () => {
      const nodes = [];
      const gridSizeX = Math.ceil(window.innerWidth / 80); // ~80px spacing
      const gridSizeY = Math.ceil(window.innerHeight / 80);
      
      for (let x = 0; x < gridSizeX; x++) {
        for (let y = 0; y < gridSizeY; y++) {
          nodes.push({
            id: `${x}-${y}`,
            x: (x / gridSizeX) * 100,
            y: (y / gridSizeY) * 100,
            size: Math.random() * 1.5 + 0.5, // Very small dots like in image
            delay: Math.random() * 10,
            pulseSpeed: Math.random() * 6 + 4,
            opacity: Math.random() * 0.3 + 0.1, // Subtle opacity
          });
        }
      }
      setGridNodes(nodes);
    };

    generateGrid();

    // Regenerate on resize
    const handleResize = () => {
      generateGrid();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-black">
      {/* Solid black background */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Grid pattern - exactly like the image */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(120 100% 50% / 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(120 100% 50% / 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
      
      {/* Diagonal grid lines - subtle secondary grid */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(120 100% 50% / 0.05) 10px, hsl(120 100% 50% / 0.05) 20px)
          `,
        }}
      />

      {/* Grid nodes/intersections - glowing dots at grid intersections */}
      {gridNodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute rounded-full"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            width: node.size,
            height: node.size,
            background: 'hsl(120 100% 50%)',
            boxShadow: `
              0 0 ${node.size * 1.5}px hsl(120 100% 50% / ${node.opacity}),
              0 0 ${node.size * 3}px hsl(120 100% 50% / ${node.opacity * 0.5})
            `,
            filter: 'blur(0.5px)',
          }}
          animate={{
            opacity: [node.opacity * 0.3, node.opacity, node.opacity * 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: node.pulseSpeed,
            delay: node.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Subtle horizontal scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        style={{
          top: '30%',
        }}
        animate={{
          y: ['0vh', '100vh'],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Very subtle corner glows */}
      <div 
        className="absolute top-0 left-0 w-64 h-64 opacity-10"
        style={{
          background: 'radial-gradient(circle at top left, hsl(120 100% 50% / 0.2) 0%, transparent 70%)',
        }}
      />
      <div 
        className="absolute bottom-0 right-0 w-64 h-64 opacity-10"
        style={{
          background: 'radial-gradient(circle at bottom right, hsl(120 100% 50% / 0.2) 0%, transparent 70%)',
        }}
      />

      {/* Subtle data stream lines - like in image */}
      {[20, 40, 60, 80].map((position) => (
        <motion.div
          key={`stream-${position}`}
          className="absolute top-0 w-[1px] h-full"
          style={{
            left: `${position}%`,
            background: 'linear-gradient(to bottom, transparent, hsl(120 100% 50% / 0.05), transparent)',
          }}
          animate={{
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{
            duration: 4,
            delay: position * 0.1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Connection lines between major nodes (optional, adds more tech feel) */}
      {gridNodes
        .filter((_, index) => index % 15 === 0) // Only some nodes
        .slice(0, 10) // Limit number of connections
        .map((node, index) => (
          <motion.div
            key={`line-${node.id}`}
            className="absolute h-[1px] bg-gradient-to-r from-primary/10 to-primary/0"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: '100px',
              transform: `rotate(${index * 36}deg)`,
              transformOrigin: 'left center',
            }}
            animate={{
              opacity: [0, 0.1, 0],
            }}
            transition={{
              duration: 3,
              delay: index * 0.3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
    </div>
  );
};

export default NeonBackground;