import React, { useEffect, useRef } from 'react';
import { select } from 'd3';

interface PulseVisualizerProps {
  volume: number; // 0.0 - 1.0
  isActive: boolean;
}

const PulseVisualizer: React.FC<PulseVisualizerProps> = ({ volume, isActive }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Configuration
    const barCount = 30; // Number of bars across the header
    const barWidth = width / barCount;
    const barGap = 2;

    // Clear previous
    svg.selectAll('*').remove();

    // Create bars
    const bars = svg.selectAll('rect')
      .data(new Array(barCount).fill(0))
      .enter()
      .append('rect')
      .attr('x', (d, i) => i * barWidth)
      .attr('y', height) // Start at bottom
      .attr('width', barWidth - barGap)
      .attr('height', 0)
      .attr('fill', isActive ? '#06b6d4' : '#374151') // Cyan if active, Gray if idle
      .attr('opacity', 0.6);

  }, [isActive]); // Re-init on resize/active toggle

  // Animation Loop
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const svg = select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Animate bars based on single volume value (simulated frequency distribution)
    svg.selectAll('rect')
        .transition()
        .duration(100)
        .ease((t) => t) // Linear ease for snappy feel
        .attr('y', (d, i) => {
            // Create a symmetrical wave pattern centered in the middle
            // Using a simple sine wave modulated by volume
            if (!isActive) return height - 2; // Flat line if inactive

            const center = 15; // approximate center index (barCount/2)
            const dist = Math.abs(i - center);
            const dropoff = Math.max(0, 1 - (dist / 15)); // 1.0 at center, 0.0 at edges
            
            // Random jitter + smooth wave
            const jitter = Math.random() * 0.2;
            const barHeight = Math.min(height, (volume * height * dropoff) + (volume * height * jitter));
            
            return height - Math.max(2, barHeight); 
        })
        .attr('height', (d, i) => {
             if (!isActive) return 2;
             
             const center = 15;
             const dist = Math.abs(i - center);
             const dropoff = Math.max(0, 1 - (dist / 15));
             
             const jitter = Math.random() * 0.2;
             const barHeight = Math.min(height, (volume * height * dropoff) + (volume * height * jitter));
             
             return Math.max(2, barHeight);
        })
        .attr('fill', isActive ? '#22d3ee' : '#374151');

  }, [volume, isActive]);

  return (
    <div ref={containerRef} className="w-full h-full">
        <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default PulseVisualizer;