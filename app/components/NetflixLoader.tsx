'use client';

import { useEffect, useState } from 'react';

interface NetflixLoaderProps {
  onComplete: () => void;
}

export default function NetflixLoader({ onComplete }: NetflixLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const steps = [
      { duration: 1200, step: 1 }, // Logo fade in
      { duration: 1800, step: 2 }, // Logo with effects - longer to avoid jumps
      { duration: 500, step: 3 }, // Quick fade out - only 0.5s black screen
    ];
// hi my name is this
    let timeoutId: NodeJS.Timeout;
    let currentStepIndex = 0;

    const runStep = () => {
      if (currentStepIndex < steps.length) {
        setCurrentStep(steps[currentStepIndex].step);
        timeoutId = setTimeout(() => {
          currentStepIndex++;
          runStep();
        }, steps[currentStepIndex].duration);
      } else {
        onComplete();
      }
    };

    // Start the animation sequence (no skip functionality)
    runStep();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 overflow-hidden">
      {/* Vignette overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          currentStep >= 2 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%)'
        }}
      />
      
      {/* Netflix Logo Animation */}
      <div className="relative flex items-center justify-center">
        {/* Glow effect behind */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${
            currentStep === 2 ? 'opacity-30' : currentStep === 3 ? 'opacity-5' : 'opacity-0'
          }`}
        >
          <h1 className="text-netflix-red text-6xl md:text-7xl font-black tracking-wider blur-2xl curved-text">
            SUMANTH SAMALA
          </h1>
        </div>

        {/* Main Logo */}
        <div
          className={`relative z-10 transition-all ${
            currentStep === 1
              ? 'opacity-100 scale-100 duration-1200 ease-out'
              : currentStep === 2
              ? 'opacity-100 scale-100 duration-1800 ease-in-out'
              : currentStep === 3
              ? 'opacity-100 scale-[3] blur-sm duration-500 ease-in'
              : 'opacity-0 scale-100 duration-0'
          }`}
        >
          <h1 className="text-netflix-red text-6xl md:text-7xl font-black tracking-wider drop-shadow-2xl curved-text">
            VIDAANT
          </h1>
        </div>

        {/* Expanding circle effect */}
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            currentStep === 2 ? 'animate-ping' : ''
          }`}
        >
          <div
            className={`w-4 h-4 bg-netflix-red rounded-full transition-opacity duration-500 ${
              currentStep === 2 ? 'opacity-20' : 'opacity-0'
            }`}
          />
        </div>
      </div>

      {/* Loading dots */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
        <div
          className={`flex space-x-3 transition-opacity duration-500 ${
            currentStep >= 1 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="w-3 h-3 bg-white rounded-full animate-bounce"
              style={{
                animationDelay: `${index * 0.3}s`,
                animationDuration: '1.5s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Particle effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {currentStep === 2 &&
          Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="absolute w-1 h-1 bg-netflix-red rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${index * 0.2}s`,
                animationDuration: '2s',
              }}
            />
          ))}
      </div>

      <style jsx>{`
        .curved-text {
          transform: perspective(300px) rotateX(15deg);
          transform-style: preserve-3d;
          /* Prevent pixelation during scaling */
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          backface-visibility: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
}
