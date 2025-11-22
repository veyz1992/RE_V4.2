
import React, { useState } from 'react';
import { TextLayer, FONT_FAMILIES, Layer } from '../types';
import { DEFAULT_TEMPLATES } from '../constants';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Type, 
  Move,
  Eye,
  EyeOff,
  RotateCcw,
  AlertTriangle,
  Palette,
  Sparkles,
  PenTool
} from 'lucide-react';

interface LayerControlProps {
  layer: Layer;
  imageWidth: number;
  imageHeight: number;
  activeTemplateId: string;
  onUpdate: (updatedLayer: Layer) => void;
}

const LayerControl: React.FC<LayerControlProps> = ({ layer, imageWidth, imageHeight, activeTemplateId, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'effects'>('basic');
  
  // Type Guard
  if (layer.type !== 'text') return null;

  const textLayer = layer as TextLayer;

  const handleChange = (field: keyof TextLayer, value: any) => {
    onUpdate({ ...textLayer, [field]: value });
  };

  const handleNestedChange = (parent: 'gradient' | 'stroke', field: string, value: any) => {
    onUpdate({
      ...textLayer,
      [parent]: { ...textLayer[parent], [field]: value }
    });
  };

  // Reset Logic
  const handleReset = () => {
    const template = DEFAULT_TEMPLATES.find(t => t.id === activeTemplateId);
    const active = template || DEFAULT_TEMPLATES[0];
    
    if (active && active.layers[textLayer.id]) {
      const defaults = active.layers[textLayer.id];
      onUpdate({
        ...textLayer,
        x: defaults.x,
        y: defaults.y,
        fontFamily: defaults.fontFamily,
        fontSize: defaults.fontSize,
        fontWeight: defaults.fontWeight,
        color: defaults.color,
        align: defaults.align,
        shadow: defaults.shadow,
        gradient: defaults.gradient || { enabled: false, startColor: '#ffffff', endColor: '#000000', type: 'vertical' },
        letterSpacing: defaults.letterSpacing || 0,
        textTransform: defaults.textTransform || 'none'
      });
    }
  };

  const applyPreset = (type: 'bold' | 'clean' | 'contrast') => {
    if (type === 'bold') {
      onUpdate({
        ...textLayer,
        fontWeight: '900',
        shadow: true,
        stroke: { ...textLayer.stroke, enabled: true, width: 1, color: '#000000' },
        letterSpacing: 1
      });
    } else if (type === 'clean') {
      onUpdate({
        ...textLayer,
        fontWeight: 'normal',
        shadow: false,
        stroke: { ...textLayer.stroke, enabled: false },
        letterSpacing: 0.5,
        fontFamily: 'SF Pro Display'
      });
    } else if (type === 'contrast') {
      onUpdate({
        ...textLayer,
        color: '#FFFFFF',
        stroke: { ...textLayer.stroke, enabled: true, width: 3, color: '#000000' },
        shadow: true
      });
    }
  };

  const isLongText = textLayer.text.length > 25;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg mb-4 shadow-sm hover:border-slate-700 transition-colors overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 text-blue-400 font-semibold">
           <Type size={16} />
           <span className="text-sm">{textLayer.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleReset}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-blue-400 transition-colors"
            title="Reset to Template Defaults"
          >
            <RotateCcw size={14} />
          </button>
          <button 
            onClick={() => handleChange('enabled', !textLayer.enabled)}
            className={`p-1.5 rounded hover:bg-slate-800 ${textLayer.enabled ? 'text-green-400' : 'text-slate-500'}`}
            title={textLayer.enabled ? "Layer Visible" : "Layer Hidden"}
          >
            {textLayer.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {textLayer.enabled && (
        <div>
          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            <button 
              onClick={() => setActiveTab('basic')}
              className={`flex-1 py-2 text-xs font-medium ${activeTab === 'basic' ? 'text-blue-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Layout & Font
            </button>
            <button 
              onClick={() => setActiveTab('effects')}
              className={`flex-1 py-2 text-xs font-medium ${activeTab === 'effects' ? 'text-purple-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Effects & Gradient
            </button>
          </div>

          <div className="p-4 space-y-4">
            
            {activeTab === 'basic' && (
              <>
                {/* Content Input */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Content</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={textLayer.text}
                      onChange={(e) => handleChange('text', e.target.value)}
                      className={`w-full bg-slate-800 border rounded p-2 text-sm focus:border-blue-500 outline-none pr-8 ${isLongText ? 'border-yellow-600' : 'border-slate-700'}`}
                      placeholder="Enter text..."
                    />
                    {isLongText && (
                      <div className="absolute right-2 top-2.5 text-yellow-500 group" title="Long text detected">
                        <AlertTriangle size={16} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Typography Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Font Family</label>
                    <select 
                      value={textLayer.fontFamily} 
                      onChange={(e) => handleChange('fontFamily', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs"
                    >
                      <optgroup label="Recommended">
                        <option value="SF Pro Display">SF Pro Display</option>
                        <option value="SF Pro Text">SF Pro Text</option>
                        <option value="SF Pro Rounded">SF Pro Rounded</option>
                        <option value="Helvetica">Helvetica</option>
                      </optgroup>
                      <optgroup label="Standard">
                        {FONT_FAMILIES.slice(4).map(f => <option key={f} value={f}>{f}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Weight</label>
                    <select 
                      value={textLayer.fontWeight} 
                      onChange={(e) => handleChange('fontWeight', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                      <option value="900">Heavy</option>
                    </select>
                  </div>
                </div>

                {/* Spacing & Transform */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block flex justify-between">
                      Spacing <span className="text-slate-500">{textLayer.letterSpacing}px</span>
                    </label>
                    <input 
                      type="range" 
                      min="-2" 
                      max="10" 
                      step="0.5"
                      value={textLayer.letterSpacing || 0}
                      onChange={(e) => handleChange('letterSpacing', parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                     <label className="text-xs text-slate-400 mb-1 block">Transform</label>
                     <select 
                      value={textLayer.textTransform || 'none'} 
                      onChange={(e) => handleChange('textTransform', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs"
                    >
                      <option value="none">None</option>
                      <option value="uppercase">Uppercase</option>
                      <option value="lowercase">Lowercase</option>
                      <option value="capitalize">Capitalize</option>
                    </select>
                  </div>
                </div>

                {/* Size & Color */}
                <div className="grid grid-cols-2 gap-3">
                   <div>
                    <label className="text-xs text-slate-400 mb-1 block">Size ({textLayer.fontSize}px)</label>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      value={textLayer.fontSize}
                      onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                   </div>
                   <div>
                     <label className="text-xs text-slate-400 mb-1 block">Color</label>
                     <div className="flex items-center gap-2">
                       <input 
                          type="color" 
                          value={textLayer.color}
                          onChange={(e) => handleChange('color', e.target.value)}
                          className="h-8 w-8 rounded bg-transparent cursor-pointer"
                       />
                       <span className="text-xs text-slate-500 font-mono">{textLayer.color}</span>
                     </div>
                   </div>
                </div>

                {/* Positioning */}
                <div className="p-3 bg-slate-800/50 rounded border border-slate-800">
                   <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs">
                      <Move size={12} />
                      <span>Position (X, Y)</span>
                   </div>
                   
                   <div className="space-y-2">
                     <div className="flex items-center gap-2">
                       <span className="w-4 text-xs font-mono text-slate-500">X</span>
                       <input 
                          type="range"
                          min="0"
                          max={imageWidth || 1200}
                          value={textLayer.x}
                          onChange={(e) => handleChange('x', parseInt(e.target.value))}
                          className="flex-1 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                       />
                       <input 
                         type="number"
                         value={textLayer.x}
                         onChange={(e) => handleChange('x', parseInt(e.target.value))}
                         className="w-14 bg-slate-900 border border-slate-700 rounded px-1 text-xs text-right"
                       />
                     </div>
                     <div className="flex items-center gap-2">
                       <span className="w-4 text-xs font-mono text-slate-500">Y</span>
                       <input 
                          type="range"
                          min="0"
                          max={imageHeight || 600}
                          value={textLayer.y}
                          onChange={(e) => handleChange('y', parseInt(e.target.value))}
                          className="flex-1 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                       />
                       <input 
                         type="number"
                         value={textLayer.y}
                         onChange={(e) => handleChange('y', parseInt(e.target.value))}
                         className="w-14 bg-slate-900 border border-slate-700 rounded px-1 text-xs text-right"
                       />
                     </div>
                   </div>
                </div>

                 {/* Alignment */}
                <div className="flex items-center justify-between">
                  <div className="flex bg-slate-800 rounded p-1 border border-slate-700">
                     <button 
                      onClick={() => handleChange('align', 'left')}
                      className={`p-1.5 rounded ${textLayer.align === 'left' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                     >
                       <AlignLeft size={16} />
                     </button>
                     <button 
                      onClick={() => handleChange('align', 'center')}
                      className={`p-1.5 rounded ${textLayer.align === 'center' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                     >
                       <AlignCenter size={16} />
                     </button>
                     <button 
                      onClick={() => handleChange('align', 'right')}
                      className={`p-1.5 rounded ${textLayer.align === 'right' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                     >
                       <AlignRight size={16} />
                     </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'effects' && (
              <div className="space-y-5">
                {/* Gradient Control */}
                <div className="p-3 bg-slate-800/50 rounded border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-slate-400 flex items-center gap-2">
                      <input 
                         type="checkbox" 
                         checked={textLayer.gradient?.enabled}
                         onChange={(e) => handleNestedChange('gradient', 'enabled', e.target.checked)}
                         className="rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-0"
                       />
                       <Palette size={12} /> Gradient Fill
                    </label>
                  </div>

                  {textLayer.gradient?.enabled && (
                    <div className="space-y-3 pl-2 mt-2 border-l-2 border-slate-700">
                       <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500 block mb-1">Start</label>
                            <input 
                              type="color" 
                              value={textLayer.gradient.startColor}
                              onChange={(e) => handleNestedChange('gradient', 'startColor', e.target.value)}
                              className="w-full h-6 bg-transparent rounded cursor-pointer"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500 block mb-1">End</label>
                            <input 
                              type="color" 
                              value={textLayer.gradient.endColor}
                              onChange={(e) => handleNestedChange('gradient', 'endColor', e.target.value)}
                              className="w-full h-6 bg-transparent rounded cursor-pointer"
                            />
                          </div>
                       </div>
                       <div>
                         <label className="text-[10px] text-slate-500 block mb-1">Direction</label>
                         <select 
                            value={textLayer.gradient.type} 
                            onChange={(e) => handleNestedChange('gradient', 'type', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs"
                          >
                            <option value="vertical">Top to Bottom</option>
                            <option value="horizontal">Left to Right</option>
                            <option value="diagonal">Diagonal</option>
                          </select>
                       </div>
                    </div>
                  )}
                </div>

                 {/* Stroke Control */}
                 <div className="p-3 bg-slate-800/50 rounded border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-slate-400 flex items-center gap-2">
                      <input 
                         type="checkbox" 
                         checked={textLayer.stroke?.enabled}
                         onChange={(e) => handleNestedChange('stroke', 'enabled', e.target.checked)}
                         className="rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-0"
                       />
                       <PenTool size={12} /> Text Stroke
                    </label>
                  </div>

                  {textLayer.stroke?.enabled && (
                    <div className="space-y-3 pl-2 mt-2 border-l-2 border-slate-700">
                       <div className="flex items-center gap-3">
                          <div>
                             <label className="text-[10px] text-slate-500 block mb-1">Color</label>
                             <input 
                              type="color" 
                              value={textLayer.stroke.color}
                              onChange={(e) => handleNestedChange('stroke', 'color', e.target.value)}
                              className="w-8 h-8 bg-transparent rounded cursor-pointer"
                            />
                          </div>
                          <div className="flex-1">
                             <label className="text-[10px] text-slate-500 block mb-1">Width ({textLayer.stroke.width}px)</label>
                             <input 
                                type="range" 
                                min="0.5" 
                                max="5" 
                                step="0.5"
                                value={textLayer.stroke.width}
                                onChange={(e) => handleNestedChange('stroke', 'width', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                              />
                          </div>
                       </div>
                    </div>
                  )}
                </div>

                {/* Shadow */}
                <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded border border-slate-800">
                   <input 
                     type="checkbox" 
                     checked={textLayer.shadow}
                     onChange={(e) => handleChange('shadow', e.target.checked)}
                     className="rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-0"
                   />
                   <label className="text-xs text-slate-400">Drop Shadow</label>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default LayerControl;
