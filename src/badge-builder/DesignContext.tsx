
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { DesignState, TextLayer, Layer, Template } from '../types';
import { INITIAL_LAYERS, DEFAULT_TEMPLATES } from '../constants';
import { generateTemplateBackground } from '../utils/templateHelpers';

interface UIState {
  isStartupOpen: boolean;
  isCodeModalOpen: boolean;
  isLoading: boolean;
  showSuccess: boolean;
  toastMessage: string | null;
}

interface DesignContextType {
  state: DesignState;
  ui: UIState;
  actions: {
    applyTemplate: (templateId: string, company: string, location: string, rating: string) => void;
    updateLayer: (updatedLayer: Layer) => void;
    updateBackground: (file: File) => void;
    saveCustomTemplate: (name: string) => void;
    deleteCustomTemplate: (id: string) => void;
    importDesign: (file: File) => void;
    setStartupOpen: (isOpen: boolean) => void;
    setCodeModalOpen: (isOpen: boolean) => void;
    resetDesign: () => void;
    
    // Persistence Actions
    saveDesign: () => void;
    clearSavedDesign: () => void;
    
    // Backend Placeholders
    saveDesignToBackend: () => Promise<void>;
    loadDesignFromBackend: (designId: string) => Promise<void>;
    listDesignsFromBackend: () => Promise<void>;
  };
  // Helper to get all available templates (default + custom)
  availableTemplates: Template[]; 
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

const STORAGE_KEY_DESIGN = 'badgeDesigner.designState';

const DEFAULT_STATE: DesignState = {
  templateId: 'standard-member',
  companyName: '',
  location: '',
  rating: 'A',
  backgroundImage: null,
  imageWidth: 1200,
  imageHeight: 600,
  layers: INITIAL_LAYERS,
  customTemplates: []
};

export const DesignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from LocalStorage if available
  const [state, setState] = useState<DesignState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DESIGN);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with default state to ensure new properties are present
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load saved design:', e);
    }
    return DEFAULT_STATE;
  });

  const [ui, setUi] = useState<UIState>({
    isStartupOpen: !localStorage.getItem(STORAGE_KEY_DESIGN), // Only show startup if no saved design
    isCodeModalOpen: false,
    isLoading: false,
    showSuccess: false,
    toastMessage: null
  });

  // Persist state changes to LocalStorage automatically (Debounced slightly by nature of React updates)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DESIGN, JSON.stringify(state));
  }, [state]);

  const showToast = (message: string) => {
    setUi(prev => ({ ...prev, toastMessage: message }));
    setTimeout(() => setUi(prev => ({ ...prev, toastMessage: null })), 3000);
  };

  // --- Template Helpers ---
  
  // Combine defaults and custom templates for easy access
  const availableTemplates = [...DEFAULT_TEMPLATES, ...state.customTemplates];

  const getActiveTemplate = () => availableTemplates.find(t => t.id === state.templateId) || DEFAULT_TEMPLATES[0];

  // --- Actions ---

  const updateLayer = (updatedLayer: Layer) => {
    setState(prev => ({
      ...prev,
      layers: prev.layers.map(l => l.id === updatedLayer.id ? updatedLayer : l)
    }));
  };

  const updateBackground = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setState(prev => ({
          ...prev,
          backgroundImage: event.target?.result as string,
          imageWidth: img.width,
          imageHeight: img.height
        }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const applyTemplate = (templateId: string, company: string, location: string, rating: string) => {
    setUi(prev => ({ ...prev, isLoading: true }));

    const isHighRating = rating === 'A' || rating === 'A+';
    const headerText = isHighRating ? "Restoration Expert" : "Restoration Professional";
    
    const template = availableTemplates.find(t => t.id === templateId) || DEFAULT_TEMPLATES[0];
    
    const configureLayers = (currentLayers: Layer[]) => {
      // Determine which layer config source to use. 
      // If it's a custom template, it has a 'layers' array (if based on DesignState structure) 
      // OR it follows the DEFAULT_TEMPLATES structure (Record<string, config>).
      // For this implementation, we normalize based on the 'layers' property type.
      
      // Simpler approach: We reconstruct from the template definition
      
      return currentLayers.map(layer => {
        if (layer.type !== 'text') return layer;

        // Helper to find config in either array (DesignState style) or object (Constants style)
        let config: any = null;
        
        if (Array.isArray(template.layers)) {
            // It's a custom template saved from state
            config = template.layers.find((l: any) => l.id === layer.id);
        } else {
            // It's a default template from constants
            config = (template.layers as Record<string, any>)[layer.id];
        }

        if (!config) return { ...layer, enabled: false };

        let text = config.text || layer.text;
        // Apply dynamic overrides
        if (layer.id === 'member-name') text = company;
        if (layer.id === 'location') text = location;
        if (layer.id === 'rating') text = rating;
        if (layer.id === 'header') text = headerText;

        let fontSize = config.fontSize;
        if (layer.id === 'member-name' && text.length > 25) {
          fontSize = Math.max(10, fontSize - 2);
        }

        return {
          ...layer,
          text,
          enabled: true,
          x: config.x,
          y: config.y,
          fontFamily: config.fontFamily,
          fontSize: fontSize,
          fontWeight: config.fontWeight,
          color: config.color,
          align: config.align,
          shadow: config.shadow,
          gradient: config.gradient || { enabled: false, startColor: '#ffffff', endColor: '#000000', type: 'vertical' },
          letterSpacing: config.letterSpacing || 0,
          textTransform: config.textTransform || 'none',
          stroke: config.stroke || { enabled: false, color: '#000000', width: 1 }
        } as TextLayer;
      });
    };

    const finishApply = (bgImage: string, width: number, height: number) => {
      const newLayers = configureLayers(INITIAL_LAYERS); // Reset to initial structure then apply config
      setState(prev => ({
        ...prev,
        templateId: template.id,
        companyName: company,
        location: location,
        rating: rating,
        backgroundImage: bgImage,
        imageWidth: width,
        imageHeight: height,
        layers: newLayers
      }));
      setUi(prev => ({ ...prev, isLoading: false, showSuccess: true }));
      setTimeout(() => setUi(prev => ({ ...prev, showSuccess: false })), 3000);
    };

    if (template.imageUrl) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        let finalBg = template.imageUrl as string;
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          try {
            finalBg = canvas.toDataURL('image/png');
          } catch (e) {
             // CORS fail, fallback to URL
          }
        }
        finishApply(finalBg, img.width, img.height);
      };
      img.onerror = () => {
        setUi(prev => ({ ...prev, isLoading: false }));
        alert("Failed to load template background.");
      };
      img.src = template.imageUrl;
    } else {
      const width = 1200;
      const height = 600;
      const bg = generateTemplateBackground(template.id, width, height);
      finishApply(bg, width, height);
    }
  };

  const saveCustomTemplate = (name: string) => {
     const newTemplate: Template = {
      id: `custom-${Date.now()}`,
      name,
      description: 'Custom user design',
      badge: 'CST',
      accentColor: 'from-purple-500 to-pink-500',
      // Save current layers array as the configuration
      layers: JSON.parse(JSON.stringify(state.layers)) as any, 
      imageUrl: state.backgroundImage || undefined
    };

    setState(prev => ({
      ...prev,
      customTemplates: [...prev.customTemplates, newTemplate]
    }));
    
    showToast("Template Saved Successfully");
  };

  const deleteCustomTemplate = (id: string) => {
    setState(prev => ({
        ...prev,
        customTemplates: prev.customTemplates.filter(t => t.id !== id)
    }));
    showToast("Template Deleted");
  };

  const importDesign = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.layers && parsed.imageWidth) {
          setState(prev => ({
              ...prev,
              ...parsed,
              // Ensure we don't overwrite custom templates with the imported file's list
              // unless we want to merge. For now, keep existing local templates.
              customTemplates: prev.customTemplates 
          }));
          showToast("Design Imported");
        } else {
          alert("Invalid design file");
        }
      } catch (error) {
        alert("Error parsing JSON");
      }
    };
    reader.readAsText(file);
  };

  const resetDesign = () => {
      setUi(prev => ({ ...prev, isStartupOpen: true }));
  };

  // --- Persistence Actions ---

  const saveDesign = () => {
    localStorage.setItem(STORAGE_KEY_DESIGN, JSON.stringify(state));
    showToast("Design saved to browser storage");
  };

  const clearSavedDesign = () => {
    if(window.confirm("Are you sure? This will clear your saved work and reset to defaults.")) {
        localStorage.removeItem(STORAGE_KEY_DESIGN);
        // Reset state but preserve custom templates if possible, 
        // though the prompt implies "clear saved data". 
        // We'll reset to DEFAULT_STATE but keep the custom templates currently in memory 
        // if we assume those are valuable.
        const currentCustom = state.customTemplates;
        setState({ ...DEFAULT_STATE, customTemplates: currentCustom });
        setUi(prev => ({ ...prev, isStartupOpen: true }));
        showToast("Saved design cleared");
    }
  };

  // --- Backend Placeholders ---

  const saveDesignToBackend = async () => {
    console.warn('Supabase integration: saveDesignToBackend not implemented yet');
    return Promise.resolve();
  };

  const loadDesignFromBackend = async (designId: string) => {
    console.warn('Supabase integration: loadDesignFromBackend not implemented yet', designId);
    return Promise.resolve();
  };

  const listDesignsFromBackend = async () => {
    console.warn('Supabase integration: listDesignsFromBackend not implemented yet');
    return Promise.resolve();
  };


  const actions = {
    applyTemplate,
    updateLayer,
    updateBackground,
    saveCustomTemplate,
    deleteCustomTemplate,
    importDesign,
    setStartupOpen: (isOpen: boolean) => setUi(prev => ({ ...prev, isStartupOpen: isOpen })),
    setCodeModalOpen: (isOpen: boolean) => setUi(prev => ({ ...prev, isCodeModalOpen: isOpen })),
    resetDesign,
    toggleSuccess: (show: boolean) => setUi(prev => ({ ...prev, showSuccess: show })),
    
    saveDesign,
    clearSavedDesign,
    
    saveDesignToBackend,
    loadDesignFromBackend,
    listDesignsFromBackend
  };

  return (
    <DesignContext.Provider value={{ state, ui, actions, availableTemplates }}>
      {children}
    </DesignContext.Provider>
  );
};

export const useDesign = () => {
  const context = useContext(DesignContext);
  if (!context) {
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
};
