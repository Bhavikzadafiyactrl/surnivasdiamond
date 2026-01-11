import React from 'react';

const NeonDiamond = () => {
  return (
    <div className="relative w-full h-[500px] flex items-center justify-center bg-[#0a192f] overflow-hidden rounded-3xl">
      {/* Background Matrix/Binary Effect */}
      <div className="absolute inset-0 opacity-20 pointer-events-none select-none">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48dGV4dCB4PSIwIiB5PSIyMCIgZmlsbD0iIzAwZmZmZiIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMCIgb3BhY2l0eT0iMC41Ij4xIDAgMSAwPC90ZXh0Pjwvc3ZnPg==')] animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a192f] via-transparent to-transparent"></div>
      </div>

      {/* Glowing Orbs/Nebula Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-400/10 rounded-full blur-[60px]"></div>

      {/* Diamond SVG */}
      <svg
        viewBox="0 0 400 350"
        className="relative w-[300px] md:w-[400px] drop-shadow-[0_0_15px_rgba(34,211,238,0.6)] animate-float"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)">
          {/* Outer Outline of the Diamond */}
          {/* Top Table */}
          <path d="M120 50 L280 50 L380 140 L200 330 L20 140 Z" fill="rgba(6, 182, 212, 0.05)" />
          
          {/* Internal Facet Lines */}
          {/* Table (Top Flat) */}
          <path d="M150 70 L250 70 L270 90 L130 90 Z" opacity="0.8" />
          
          {/* Crown (Top Slopes) */}
          <path d="M120 50 L150 70" />
          <path d="M280 50 L250 70" />
          <path d="M380 140 L270 90" />
          <path d="M20 140 L130 90" />
          
          {/* Connecting Crown Triangles */}
           <path d="M150 70 L200 110 L250 70" />
           <path d="M130 90 L200 110 L270 90" />
           
           <path d="M120 50 L20 140" />
           <path d="M280 50 L380 140" />

           {/* Pavilion (Bottom Cone) */}
           <path d="M20 140 L200 330" />
           <path d="M380 140 L200 330" />
           
           {/* Pavilion Facets */}
           <path d="M130 90 L200 330" opacity="0.6"/>
           <path d="M270 90 L200 330" opacity="0.6"/>
           
           <path d="M20 140 L130 90" />
           <path d="M380 140 L270 90" />
           
           {/* Cross Connections for 'Tech' feel */}
           <circle cx="200" cy="110" r="3" fill="#22d3ee" className="animate-pulse" />
           <circle cx="200" cy="330" r="3" fill="#22d3ee" />
           <circle cx="20" cy="140" r="3" fill="#22d3ee" />
           <circle cx="380" cy="140" r="3" fill="#22d3ee" />
           <circle cx="120" cy="50" r="3" fill="#22d3ee" />
           <circle cx="280" cy="50" r="3" fill="#22d3ee" />

           {/* Random mesh lines for the 'Network' look */}
           <path d="M120 50 L200 110" opacity="0.5"/>
           <path d="M280 50 L200 110" opacity="0.5"/>
           <path d="M20 140 L200 110" opacity="0.5"/>
           <path d="M380 140 L200 110" opacity="0.5"/>
           
        </g>
      </svg>
      
      {/* Floating Particles */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping"></div>
          <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-blue-300 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-cyan-200 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
      </div>

    </div>
  );
};

export default NeonDiamond;
