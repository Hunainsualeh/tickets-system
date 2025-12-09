'use client'; // This directive fixes the error by making this a Client Component

import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F2F1EF] text-gray-900 font-sans p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Main Card Container */}
      <div className="w-full max-w-[1400px] bg-white rounded-[40px] shadow-sm relative z-10 overflow-hidden flex flex-col min-h-[80vh]">
        
        {/* Header / Nav - Empty as requested */}
        <header className="w-full p-8 flex justify-between items-center h-24">
           {/* Icons removed */}
        </header>

        {/* Content Body */}
        <main className="flex-1 flex flex-col lg:flex-row items-center justify-center w-full max-w-7xl mx-auto px-6 pb-12 lg:pb-0">
          
          {/* Left Side: Isometric TV SVG Illustration */}
          <div className="w-full lg:w-1/2 flex justify-center items-center mb-12 lg:mb-0">
            <div className="relative w-full max-w-[500px] aspect-square animate-float">
              {/* Custom SVG to replicate the Isometric TV */}
              <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
                {/* Shadow Base */}
                <ellipse cx="250" cy="420" rx="180" ry="40" fill="#000000" fillOpacity="0.2" />
                
                {/* TV Body Back/Side (Darker Beige) */}
                <path d="M140 160 L360 100 L430 320 L210 390 Z" fill="#E5E0D6" stroke="#262626" strokeWidth="2" strokeLinejoin="round"/>
                
                {/* TV Body Side Panel (Vents) */}
                <path d="M140 160 L140 300 L210 390 L210 390 L140 300" fill="#F0ECE4" stroke="#262626" strokeWidth="2" />
                <path d="M140 300 L140 360 L210 420 L210 390" fill="#E5E0D6" stroke="#262626" strokeWidth="2" />
                
                {/* Vents */}
                <g transform="translate(155, 330) skewY(25)">
                   <rect width="40" height="6" rx="3" fill="#262626" />
                   <rect y="12" width="40" height="6" rx="3" fill="#262626" />
                   <rect y="24" width="40" height="6" rx="3" fill="#262626" />
                </g>

                {/* TV Face (Front Bezel) */}
                <path d="M140 160 L380 160 L380 390 L140 390 Z" fill="#F7F5F0" /> {/* Base filler to hide back */}
                
                {/* 3D Extrusion of Face */}
                <path d="M140 160 L360 100 L460 300 L240 400 Z" fill="#FFFBF2" stroke="#262626" strokeWidth="3" strokeLinejoin="round"/>
                <path d="M240 400 L240 440 L460 340 L460 300" fill="#E5E0D6" stroke="#262626" strokeWidth="3" strokeLinejoin="round"/>
                <path d="M140 160 L140 300 L240 440 L240 400" fill="#E5E0D6" stroke="#262626" strokeWidth="3" strokeLinejoin="round"/>
                
                {/* Screen Container (The Monitor) */}
                <path d="M190 180 L400 130 L470 320 L260 400 Z" fill="#262626" stroke="#4ade80" strokeWidth="4" strokeLinejoin="round"/>
                
                {/* Screen Content - Color Bars */}
                <g clipPath="url(#screenClip)">
                    {/* Clipping mask path matching screen shape */}
                    <clipPath id="screenClip">
                        <path d="M195 185 L395 135 L465 315 L265 395 Z" />
                    </clipPath>
                    
                    {/* Bars */}
                    <rect x="150" y="100" width="60" height="400" fill="#00dcb4" transform="rotate(-15 250 250)" />
                    <rect x="210" y="100" width="60" height="400" fill="#9de849" transform="rotate(-15 250 250)" />
                    <rect x="270" y="100" width="60" height="400" fill="#ff2a6d" transform="rotate(-15 250 250)" />
                    <rect x="330" y="100" width="60" height="400" fill="#7d3cff" transform="rotate(-15 250 250)" />
                    <rect x="390" y="100" width="60" height="400" fill="#ff9100" transform="rotate(-15 250 250)" />
                </g>

                 {/* 404 Black Bar */}
                 <path d="M170 320 L400 250 L420 310 L190 380 Z" fill="#1a1a1a" stroke="#ffffff" strokeWidth="1"/>
                 
                 {/* Text 404 - Pixelated Style */}
                 <text x="230" y="340" fontFamily="monospace" fontSize="48" fill="white" fontWeight="bold" transform="rotate(-16 260 330)" style={{letterSpacing: '0.5em'}}>
                    4 0 4
                 </text>

                 {/* Knob Area Side */}
                 <circle cx="150" cy="240" r="25" fill="#F7F5F0" stroke="#262626" strokeWidth="2" transform="skewY(20)"/>
                 <circle cx="150" cy="240" r="15" fill="#ff7e5f" stroke="#262626" strokeWidth="2" transform="skewY(20)"/>
                 <rect x="148" y="225" width="4" height="15" fill="#262626" transform="skewY(20) rotate(45 150 240)"/>
              </svg>
            </div>
          </div>

          {/* Right Side: Typography */}
          <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            <h1 className="text-7xl md:text-8xl font-bold tracking-tight text-black">
              Oops!
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 font-medium max-w-md">
              We couldn't find the page you were looking for
            </p>
            
            <button 
              className="mt-4 px-8 py-4 bg-black text-white rounded-full flex items-center gap-3 font-semibold hover:bg-gray-800 transition-all hover:gap-4 active:scale-95"
              onClick={() => window.location.href = '/'}
            >
              <ArrowLeft size={20} />
              <span>Go home</span>
            </button>
          </div>

        </main>
      </div>

      {/* Global Style for Floating Animation */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}