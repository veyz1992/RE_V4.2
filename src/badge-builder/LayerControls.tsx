
import React from 'react';
import { useDesign } from '../context/DesignContext';
import LayerControl from './LayerControl';

const LayerControls: React.FC = () => {
  const { state, actions } = useDesign();

  return (
    <div className="space-y-4">
      {state.layers.filter(l => l.enabled && l.type === 'text').map(layer => (
        <LayerControl 
          key={layer.id} 
          layer={layer} // Type assertion handled by filter, but TextLayer check is good
          imageWidth={state.imageWidth}
          imageHeight={state.imageHeight}
          activeTemplateId={state.templateId}
          onUpdate={actions.updateLayer}
        />
      ))}
    </div>
  );
};

export default LayerControls;
