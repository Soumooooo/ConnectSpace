import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Minus,
  Square,
  Circle,
  RotateCcw,
  Trash2,
  Download,
  Palette
} from 'lucide-react';

export interface StrokePoint {
  x: number;
  y: number;
}

export interface StrokeData {
  id: string;
  tool: 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle';
  color: string;
  size: number;
  points: StrokePoint[];
}

interface WhiteboardProps {
  strokes: StrokeData[];
  onEmitStroke: (stroke: StrokeData) => void;
  onEmitClear: () => void;
  onEmitUndo: (strokeId: string) => void;
  isCollaborative?: boolean;
}

const PALETTE = [
  { label: 'White', value: '#FFFFFF' },
  { label: 'Cyan', value: '#38BDF8' },
  { label: 'Indigo', value: '#818CF8' },
  { label: 'Emerald', value: '#34D399' },
  { label: 'Amber', value: '#FBBF24' },
  { label: 'Rose', value: '#FB7185' },
  { label: 'Dark Gray', value: '#334155' }
];

const BRUSH_SIZES = [2, 4, 8, 16];

export const Whiteboard: React.FC<WhiteboardProps> = ({
  strokes,
  onEmitStroke,
  onEmitClear,
  onEmitUndo
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle'>('pen');
  const [currentColor, setCurrentColor] = useState('#FFFFFF');
  const [currentSize, setCurrentSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const currentPointsRef = useRef<StrokePoint[]>([]);

  // Redraw all strokes on canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dark canvas background
    ctx.fillStyle = '#0B1120';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    const dotSpacing = 24;
    for (let x = 12; x < canvas.width; x += dotSpacing) {
      for (let y = 12; y < canvas.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render strokes
    for (const stroke of strokes) {
      drawStrokeToContext(ctx, stroke);
    }
  }, [strokes]);

  const drawStrokeToContext = (ctx: CanvasRenderingContext2D, stroke: StrokeData) => {
    if (!stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.strokeStyle = '#0B1120';
      ctx.lineWidth = stroke.size * 2.5;
    } else if (stroke.tool === 'highlighter') {
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = stroke.size * 2.5;
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
    }

    if (stroke.tool === 'line') {
      if (stroke.points.length >= 2) {
        const p1 = stroke.points[0];
        const p2 = stroke.points[stroke.points.length - 1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    } else if (stroke.tool === 'rect') {
      if (stroke.points.length >= 2) {
        const p1 = stroke.points[0];
        const p2 = stroke.points[stroke.points.length - 1];
        ctx.beginPath();
        ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      }
    } else if (stroke.tool === 'circle') {
      if (stroke.points.length >= 2) {
        const p1 = stroke.points[0];
        const p2 = stroke.points[stroke.points.length - 1];
        const radius = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Freehand pen or highlighter
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  };

  // Adjust canvas size to match container
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redraw();
      }
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  // Redraw when strokes change
  useEffect(() => {
    redraw();
  }, [strokes, redraw]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): StrokePoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasCoords(e);
    if (!point) return;
    setIsDrawing(true);
    currentPointsRef.current = [point];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = getCanvasCoords(e);
    if (!point) return;

    currentPointsRef.current.push(point);

    // Live preview on canvas
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    if (currentTool === 'pen' || currentTool === 'highlighter' || currentTool === 'eraser') {
      // Draw intermediate segment
      const pts = currentPointsRef.current;
      if (pts.length >= 2) {
        const p1 = pts[pts.length - 2];
        const p2 = pts[pts.length - 1];

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (currentTool === 'eraser') {
          ctx.strokeStyle = '#0B1120';
          ctx.lineWidth = currentSize * 2.5;
        } else if (currentTool === 'highlighter') {
          ctx.strokeStyle = currentColor;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = currentSize * 2.5;
        } else {
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = currentSize;
        }
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Shapes require full redraw with preview
      redraw();
      drawStrokeToContext(ctx, {
        id: 'preview',
        tool: currentTool,
        color: currentColor,
        size: currentSize,
        points: currentPointsRef.current
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPointsRef.current.length > 0) {
      const newStroke: StrokeData = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tool: currentTool,
        color: currentColor,
        size: currentSize,
        points: [...currentPointsRef.current]
      };
      onEmitStroke(newStroke);
    }
    currentPointsRef.current = [];
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    if (confirmClear) {
      onEmitClear();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
    }
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const lastStroke = strokes[strokes.length - 1];
    onEmitUndo(lastStroke.id);
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `connectspace-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-slate-800 gap-2 flex-wrap">
        {/* Tool selector */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setCurrentTool('pen')}
            title="Pen tool"
            className={`p-1.5 rounded transition-colors ${
              currentTool === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Pen className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentTool('highlighter')}
            title="Highlighter"
            className={`p-1.5 rounded transition-colors ${
              currentTool === 'highlighter' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Highlighter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentTool('line')}
            title="Straight line"
            className={`p-1.5 rounded transition-colors ${
              currentTool === 'line' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentTool('rect')}
            title="Rectangle"
            className={`p-1.5 rounded transition-colors ${
              currentTool === 'rect' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentTool('circle')}
            title="Circle"
            className={`p-1.5 rounded transition-colors ${
              currentTool === 'circle' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentTool('eraser')}
            title="Eraser"
            className={`p-1.5 rounded transition-colors ${
              currentTool === 'eraser' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette */}
        {currentTool !== 'eraser' && (
          <div className="flex items-center gap-1.5">
            {PALETTE.map(c => (
              <button
                key={c.value}
                onClick={() => setCurrentColor(c.value)}
                title={c.label}
                className={`w-5 h-5 rounded-full border transition-transform ${
                  currentColor === c.value
                    ? 'border-white scale-125 shadow-sm'
                    : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        )}

        {/* Brush Size */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {BRUSH_SIZES.map(s => (
            <button
              key={s}
              onClick={() => setCurrentSize(s)}
              className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                currentSize === s ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}px
            </button>
          ))}
        </div>

        {/* Actions: Undo, Clear, Save */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            title="Undo stroke"
            className="p-1.5 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            disabled={strokes.length === 0}
            title={confirmClear ? "Click again to confirm clear" : "Clear whiteboard"}
            className={`p-1.5 rounded transition-all text-xs flex items-center gap-1 ${
              confirmClear
                ? 'bg-rose-600 text-white font-medium px-2 shadow-md animate-pulse'
                : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 disabled:opacity-30 disabled:hover:text-rose-400 disabled:hover:bg-transparent'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {confirmClear && <span>Confirm clear?</span>}
          </button>
          <button
            onClick={handleDownloadImage}
            title="Save as PNG"
            className="p-1.5 rounded text-slate-400 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="relative flex-1 w-full h-full cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full block"
        />
        {strokes.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-500 gap-2">
            <Palette className="w-8 h-8 opacity-40 text-slate-400" />
            <span className="text-sm font-medium">Shared Whiteboard</span>
            <span className="text-xs text-slate-500">Pick a pen or shape tool to begin collaborating</span>
          </div>
        )}
      </div>
    </div>
  );
};
