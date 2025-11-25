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
      <div className="flex h-full flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]/70 px-4 py-2 backdrop-blur">
          <h2 className="text-sm font-semibold text-[var(--text-main)] whitespace-nowrap">Live Preview</h2>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
              <button
                  onClick={() => setShowGuides(!showGuides)}
                  className={`px-3 py-2 rounded text-xs flex items-center gap-1 transition-colors ${showGuides ? 'bg-info/10 text-info' : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'}`}
              >
                  <Crosshair size={14} />
                  <span className="hidden sm:inline">Guides</span>
              </button>
              <div className="h-4 w-px bg-[var(--border-subtle)] mx-2 hidden sm:block"></div>
              <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                <button
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                    <ZoomOut size={16} />
                </button>
                <span className="text-xs font-mono w-12 text-center text-[var(--text-muted)]">
                    {Math.round(zoom * 100)}%
                </span>
                <button
                    onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                    <ZoomIn size={16} />
                </button>
              </div>
              <button
                  onClick={() => setZoom(1)}
                  className="px-3 py-2 rounded text-xs flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]"
              >
                  1:1
              </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 md:p-6"
        >
          <div
              className="relative mx-auto bg-slate-900 shadow-lg border border-slate-800"
              style={{
                  width: state.imageWidth,
                  height: state.imageHeight,
                  maxWidth: '100%',
                  aspectRatio: `${state.imageWidth} / ${state.imageHeight}`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center'
              }}
          >
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

        <div className="flex flex-wrap justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[10px] text-[var(--text-muted)]">
            <p className="font-mono">
              {state.imageWidth} x {state.imageHeight}px
            </p>
            <p>
               {showGuides ? 'Guides On' : 'Guides Off'}
            </p>
        </div>
      </div>
    );
};

export default PreviewArea;
