import React, { useRef, useEffect, useState } from 'react';
import { useDesign } from '../context/DesignContext';
import { TextLayer } from '../types';
import { ZoomIn, ZoomOut, Crosshair } from 'lucide-react';

const PreviewArea: React.FC = () => {
  const { state } = useDesign();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [showGuides, setShowGuides] = useState(true);

  // Initial draw and update on changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to actual high-res size
    canvas.width = state.imageWidth;
    canvas.height = state.imageHeight;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    const bgImage = new Image();
    bgImage.crossOrigin = "Anonymous";
    
    const drawEverything = () => {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
        drawLayers(ctx);
        if (showGuides) drawGuides(ctx);
    };

    if (state.backgroundImage) {
      bgImage.src = state.backgroundImage;
      bgImage.onload = drawEverything;
      if (bgImage.complete) {
        drawEverything();
      }
    } else {
        // Placeholder background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#475569';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("Upload an image to start", canvas.width / 2, canvas.height / 2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, showGuides]);

  const drawLayers = (ctx: CanvasRenderingContext2D) => {
    state.layers.forEach(layer => {
      if (!layer.enabled || layer.type !== 'text') return;
      const textLayer = layer as TextLayer;

      ctx.save();
      
      let textToDraw = textLayer.text;
      if (textLayer.textTransform === 'uppercase') textToDraw = textToDraw.toUpperCase();
      if (textLayer.textTransform === 'lowercase') textToDraw = textToDraw.toLowerCase();
      if (textLayer.textTransform === 'capitalize') {
        textToDraw = textToDraw.replace(/\b\w/g, l => l.toUpperCase());
      }

      ctx.font = `${textLayer.fontWeight} ${textLayer.fontSize}px "${textLayer.fontFamily}"`;
      ctx.textAlign = textLayer.align;
      ctx.textBaseline = 'middle';
      
      // @ts-ignore
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = `${textLayer.letterSpacing}px`;

      if (textLayer.shadow) {
        ctx.shadowColor = textLayer.shadowColor;
        ctx.shadowBlur = textLayer.shadowBlur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      if (textLayer.gradient?.enabled) {
        const metrics = ctx.measureText(textToDraw);
        const textHeight = textLayer.fontSize;
        
        let gradient;
        if (textLayer.gradient.type === 'horizontal') {
            let xStart = textLayer.x;
            if (textLayer.align === 'center') xStart = textLayer.x - (metrics.width / 2);
            if (textLayer.align === 'right') xStart = textLayer.x - metrics.width;
            gradient = ctx.createLinearGradient(xStart, textLayer.y, xStart + metrics.width, textLayer.y);
        } else if (textLayer.gradient.type === 'diagonal') {
            let xStart = textLayer.x;
            if (textLayer.align === 'center') xStart = textLayer.x - (metrics.width / 2);
            gradient = ctx.createLinearGradient(xStart, textLayer.y - textHeight/2, xStart + metrics.width, textLayer.y + textHeight/2);
        } else {
            gradient = ctx.createLinearGradient(textLayer.x, textLayer.y - (textHeight / 2), textLayer.x, textLayer.y + (textHeight / 2));
        }

        gradient.addColorStop(0, textLayer.gradient.startColor);
        gradient.addColorStop(1, textLayer.gradient.endColor);
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = textLayer.color;
      }

      if (textLayer.stroke?.enabled) {
          ctx.lineWidth = textLayer.stroke.width;
          ctx.strokeStyle = textLayer.stroke.color;
          const sColor = ctx.shadowColor;
          ctx.shadowColor = 'transparent'; 
          ctx.strokeText(textToDraw, textLayer.x, textLayer.y);
          ctx.shadowColor = sColor; 
      }

      ctx.fillText(textToDraw, textLayer.x, textLayer.y);
      ctx.restore();
    });
  };

  const drawGuides = (ctx: CanvasRenderingContext2D) => {
    state.layers.forEach(layer => {
      if (!layer.enabled || layer.type !== 'text') return;
      const textLayer = layer as TextLayer;

      ctx.save();
      
      ctx.font = `${textLayer.fontWeight} ${textLayer.fontSize}px "${textLayer.fontFamily}"`;
      // @ts-ignore
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = `${textLayer.letterSpacing}px`;
      
      let textToMeasure = textLayer.text;
      if (textLayer.textTransform === 'uppercase') textToMeasure = textToMeasure.toUpperCase();
      const metrics = ctx.measureText(textToMeasure);
      const width = metrics.width;
      
      const isDynamic = textLayer.id === 'member-name' || textLayer.id === 'location';
      const isOverflowing = width > 200;

      if (isDynamic && isOverflowing) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          
          let x = textLayer.x;
          if (textLayer.align === 'center') x -= width / 2;
          if (textLayer.align === 'right') x -= width;
          const y = textLayer.y - (textLayer.fontSize / 2);
          
          ctx.strokeRect(x - 2, y - 2, width + 4, textLayer.fontSize + 4);
          
          ctx.fillStyle = '#ef4444';
          ctx.font = '10px sans-serif';
          ctx.fillText("⚠️ Too Long", x, y - 6);
      } else {
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          
          ctx.beginPath();
          ctx.moveTo(0, textLayer.y);
          ctx.lineTo(ctx.canvas.width, textLayer.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(textLayer.x, 0);
          ctx.lineTo(textLayer.x, ctx.canvas.height);
          ctx.stroke();
          
          ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(textLayer.x, textLayer.y, 3, 0, Math.PI * 2);
          ctx.fill();
      }
      
      ctx.restore();
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 lg:border-l border-slate-800">
      {/* Header Controls */}
      <div className="min-h-[3.5rem] border-b border-slate-800 flex flex-wrap items-center justify-between px-4 py-2 bg-slate-900/50 backdrop-blur gap-2">
        <h2 className="text-sm font-semibold text-slate-300 whitespace-nowrap">Live Preview</h2>
        
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end flex-1">
            <button 
                onClick={() => setShowGuides(!showGuides)}
                className={`px-3 py-2 rounded text-xs flex items-center gap-1 transition-colors ${showGuides ? 'bg-blue-900/30 text-blue-400' : 'text-slate-400 hover:bg-slate-800'}`}
            >
                <Crosshair size={14} />
                <span className="hidden sm:inline">Guides</span>
            </button>
            <div className="h-4 w-px bg-slate-700 mx-2 hidden sm:block"></div>
            <div className="flex items-center bg-slate-800 rounded-lg">
              <button 
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-l-lg"
              >
                  <ZoomOut size={16} />
              </button>
              <span className="text-xs font-mono w-10 text-center text-slate-500">
                  {Math.round(zoom * 100)}%
              </span>
              <button 
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-r-lg"
              >
                  <ZoomIn size={16} />
              </button>
            </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-slate-950"
      >
        {/* Wrapper handles the aspect ratio and scaling, constrained to parent width */}
        <div 
            className="relative bg-slate-900 shadow-2xl border-2 border-slate-800 transition-transform duration-200 ease-out"
            style={{ 
                // Intrinsic size
                width: state.imageWidth,
                height: state.imageHeight,
                // Responsive constraints: prevent overflow on mobile
                maxWidth: '100%',
                aspectRatio: `${state.imageWidth} / ${state.imageHeight}`,
                // Zoom scaling
                transform: `scale(${zoom})`,
                transformOrigin: 'center center'
            }}
        >
            {/* Canvas fills the wrapper's calculated size */}
            <canvas 
              ref={canvasRef} 
              className="block w-full h-full"
              style={{
                maxWidth: '100%',
                height: 'auto'
              }}
            />
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="p-2 bg-slate-900 border-t border-slate-800 text-center flex flex-wrap justify-between px-4 gap-2">
          <p className="text-[10px] text-slate-500 font-mono">
            {state.imageWidth} x {state.imageHeight}px
          </p>
          <p className="text-[10px] text-slate-600">
             {showGuides ? 'Guides On' : 'Guides Off'}
          </p>
      </div>
    </div>
  );
};

export default PreviewArea;