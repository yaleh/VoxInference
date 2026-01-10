import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface PulseVisualizerProps {
  volume: number; // 0.0 - 1.0
  isActive: boolean;
}

const PulseVisualizer: React.FC<PulseVisualizerProps> = ({ volume, isActive }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Clear previous
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${centerX},${centerY})`);

    // Base circle (The Core)
    g.append('circle')
      .attr('r', 40)
      .attr('fill', '#111')
      .attr('stroke', isActive ? '#22d3ee' : '#4b5563')
      .attr('stroke-width', 2);

    // Dynamic Pulsing Ring
    const pulseRing = g.append('circle')
      .attr('r', 40)
      .attr('fill', 'none')
      .attr('stroke', isActive ? '#06b6d4' : 'transparent')
      .attr('stroke-width', 2)
      .attr('opacity', 0.5);

    // Data-driven update function for animation
    // Since React handles re-renders, we use a ref to store the D3 selection for updates
    // inside a separate useEffect or via the main update loop. 
    // However, simpler to just re-render small parts or use CSS transforms for the heavy lifting.
    
    // Let's use CSS transforms via style prop for high perf, but initialize D3 for structure.
    
  }, [isActive]); // Re-init on active toggle

  // Direct DOM manipulation for high-frequency volume updates
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const pulseRing = svg.select('circle:nth-child(2)'); // The second circle
    const core = svg.select('circle:nth-child(1)');

    // Non-linear scaling for better visual effect
    const scale = 1 + (volume * 4); 
    
    if (isActive) {
        pulseRing
            .transition()
            .duration(50)
            .attr('r', 40 * scale)
            .attr('stroke-opacity', 1 - volume) // Fade out as it expands
            .attr('stroke', `rgb(${34 + volume * 100}, ${211 - volume * 50}, ${238})`); // Cyan drift
            
        core
            .transition()
            .duration(50)
            .attr('fill', `rgba(6, 182, 212, ${volume * 0.8})`); // Core lights up
    } else {
        pulseRing.transition().duration(500).attr('r', 40).attr('stroke-opacity', 0);
        core.transition().duration(500).attr('fill', '#111');
    }

  }, [volume, isActive]);

  return (
    <div className="w-full h-64 flex items-center justify-center relative overflow-hidden">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 opacity-10" 
             style={{
                 backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', 
                 backgroundSize: '20px 20px'
             }}
        />
        
        <svg ref={svgRef} className="w-full h-full z-10" />
        
        {/* Status Text */}
        <div className="absolute bottom-4 text-xs tracking-[0.2em] text-cyan-500 uppercase font-mono">
            {isActive ? `SYSTEM ONLINE // GAIN: ${(volume * 100).toFixed(0)}%` : 'SYSTEM STANDBY'}
        </div>
    </div>
  );
};

export default PulseVisualizer;