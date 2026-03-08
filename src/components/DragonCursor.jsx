import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export default function DragonCursor() {
    const [isVisible, setIsVisible] = useState(false);
    const cursorX = useMotionValue(-500);
    const cursorY = useMotionValue(-500);

    // Springs for exact, tight tracking (like a responsive F1 car)
    const springConfig = { damping: 40, stiffness: 400, mass: 0.5 };
    const carX = useSpring(cursorX, springConfig);
    const carY = useSpring(cursorY, springConfig);

    // Derive a rotation value based on movement velocity
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        let lastX = cursorX.get();
        let lastY = cursorY.get();

        const handleMouseMove = (e) => {
            const cx = e.clientX;
            const cy = e.clientY;

            if (!isVisible) setIsVisible(true);

            // Determine angle of movement
            const dx = cx - lastX;
            const dy = cy - lastY;

            // Calculate angle if moving, otherwise keep previous
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                // Adjust angle because car points "up" initially in SVG
                angle += 90;
                setRotation(angle);
            }

            lastX = cx;
            lastY = cy;

            cursorX.set(cx);
            cursorY.set(cy);
        };

        const handleMouseLeave = () => setIsVisible(false);
        const handleMouseEnter = () => setIsVisible(true);

        window.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('mouseenter', handleMouseEnter);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('mouseenter', handleMouseEnter);
        };
    }, [cursorX, cursorY, isVisible]);

    return (
        <motion.div
            className="pointer-events-none fixed z-[9999]"
            style={{
                x: carX,
                y: carY,
                opacity: isVisible ? 1 : 0,
                // Center the car on the cursor
                translateX: '-50%',
                translateY: '-50%',
            }}
        >
            <motion.div
                animate={{ rotate: rotation }}
                transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                className="w-[200px] h-[200px] origin-center"
            >
                <svg
                    width="100%" height="100%" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"
                    style={{ filter: "drop-shadow(0px 15px 25px rgba(0,0,0,0.9))" }}
                >
                    {/* F1 Car Top-Down Silhouette */}

                    {/* Front Wing */}
                    <path d="M60 40 L 140 40 L 135 50 L 65 50 Z" fill="#111" />
                    <path d="M50 45 L 60 45 L 60 55 L 50 55 Z" fill="#222" />
                    <path d="M140 45 L 150 45 L 150 55 L 140 55 Z" fill="#222" />

                    {/* Nose Cone */}
                    <path d="M95 40 L 105 40 L 110 90 L 90 90 Z" fill="#0A0A0A" />

                    {/* Front Suspension Arms */}
                    <line x1="100" y1="70" x2="60" y2="80" stroke="#333" strokeWidth="2" />
                    <line x1="100" y1="80" x2="60" y2="90" stroke="#333" strokeWidth="2" />
                    <line x1="100" y1="70" x2="140" y2="80" stroke="#333" strokeWidth="2" />
                    <line x1="100" y1="80" x2="140" y2="90" stroke="#333" strokeWidth="2" />

                    {/* Front Tires */}
                    <rect x="50" y="65" width="15" height="35" rx="3" fill="#050505" />
                    <rect x="135" y="65" width="15" height="35" rx="3" fill="#050505" />

                    {/* Main Chassis / Cockpit */}
                    <path d="M85 90 L 115 90 L 120 120 L 110 150 L 90 150 L 80 120 Z" fill="#111" />

                    {/* Halo / Driver Helmet */}
                    <circle cx="100" cy="115" r="8" fill="#FFF" />
                    <path d="M90 105 L 110 105 L 115 125 L 100 130 L 85 125 Z" fill="transparent" stroke="#333" strokeWidth="2" />

                    {/* Sidepods */}
                    <path d="M70 100 L 85 100 L 80 145 L 65 145 Z" fill="#1A1A1A" />
                    <path d="M115 100 L 130 100 L 135 145 L 120 145 Z" fill="#1A1A1A" />

                    {/* Red/Neon Accents on Sidepods */}
                    <path d="M75 105 L 80 105 L 75 140 Z" fill="#E11D48" />
                    <path d="M125 105 L 120 105 L 125 140 Z" fill="#E11D48" />

                    {/* Rear Suspension */}
                    <line x1="100" y1="140" x2="60" y2="155" stroke="#333" strokeWidth="2" />
                    <line x1="100" y1="150" x2="60" y2="165" stroke="#333" strokeWidth="2" />
                    <line x1="100" y1="140" x2="140" y2="155" stroke="#333" strokeWidth="2" />
                    <line x1="100" y1="150" x2="140" y2="165" stroke="#333" strokeWidth="2" />

                    {/* Rear Tires (Thicker) */}
                    <rect x="45" y="145" width="20" height="40" rx="3" fill="#050505" />
                    <rect x="135" y="145" width="20" height="40" rx="3" fill="#050505" />

                    {/* Engine Cover & Exhaust */}
                    <path d="M90 150 L 110 150 L 105 175 L 95 175 Z" fill="#0A0A0A" />
                    <circle cx="100" cy="170" r="3" fill="#E11D48" style={{ filter: "drop-shadow(0 0 5px #E11D48)" }} />

                    {/* Rear Wing */}
                    <path d="M65 175 L 135 175 L 130 185 L 70 185 Z" fill="#111" />
                    <path d="M60 170 L 65 170 L 65 190 L 60 190 Z" fill="#222" />
                    <path d="M135 170 L 140 170 L 140 190 L 135 190 Z" fill="#222" />

                    {/* Animated Exhaust Flame */}
                    <motion.g
                        animate={{ scaleY: [1, 1.5, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ repeat: Infinity, duration: 0.1, ease: 'linear' }}
                        style={{ transformOrigin: "100px 175px" }}
                    >
                        <path d="M95 178 L 105 178 L 100 190 Z" fill="#38BDF8" style={{ filter: "drop-shadow(0 0 8px #38BDF8)" }} />
                    </motion.g>
                </svg>
            </motion.div>
        </motion.div>
    );
}
