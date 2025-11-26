import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DesignState, Layer, Template } from '../types';
import { INITIAL_LAYERS, DEFAULT_TEMPLATES } from '../constants';
import { generateTemplateBackground } from '../utils/templateHelpers';
import { getTierStyle } from '@/shared/badges/tierStyles';

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
    importDesign: (file: File) => void;
    setTier: (tier: string) => void;
    setStartupOpen: (isOpen: boolean) => void;
    setCodeModalOpen: (isOpen: boolean) => void;
    resetDesign: () => void;
    toggleSuccess: (show: boolean) => void;
  };
  availableTemplates: Template[];
}

interface DesignProviderProps {
  children: ReactNode;
  initialState?: Partial<DesignState>;
  templates?: Template[];
  onStateChange?: (state: DesignState) => void;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

const defaultTierStyle = getTierStyle();

const DEFAULT_STATE: DesignState = {
  templateId: defaultTierStyle.templateId ?? 'standard-member',
  tier: defaultTierStyle.key,
  companyName: '',
  location: '',
  rating: defaultTierStyle.ratingPreset,
  backgroundImage: null,
  imageWidth: 1200,
  imageHeight: 600,
  layers: INITIAL_LAYERS,
  customTemplates: []
};

const buildInitialState = (initialState?: Partial<DesignState>): DesignState => {
  const tierStyle = getTierStyle(initialState?.tier);

  return {
    ...DEFAULT_STATE,
    ...initialState,
    tier: tierStyle.key,
    templateId: initialState?.templateId ?? tierStyle.templateId ?? DEFAULT_STATE.templateId,
    rating: initialState?.rating ?? tierStyle.ratingPreset,
    layers: initialState?.layers ? [...initialState.layers] : [...DEFAULT_STATE.layers],
    backgroundImage: initialState?.backgroundImage ?? DEFAULT_STATE.backgroundImage,
  };
};

export const DesignProvider: React.FC<DesignProviderProps> = ({ children, initialState, templates, onStateChange }) => {
  const [state, setState] = useState<DesignState>(() => buildInitialState(initialState));
  const [ui, setUi] = useState<UIState>({
    isStartupOpen: false,
    isCodeModalOpen: false,
    isLoading: false,
    showSuccess: false,
    toastMessage: null
  });

  const availableTemplates = useMemo(() => {
    const provided = templates?.length ? templates : DEFAULT_TEMPLATES;
    return provided;
  }, [templates]);

  useEffect(() => {
    setState(buildInitialState(initialState));
  }, [initialState]);

  useEffect(() => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const showToast = (message: string) => {
    setUi(prev => ({ ...prev, toastMessage: message }));
    setTimeout(() => setUi(prev => ({ ...prev, toastMessage: null })), 3000);
  };

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

  const setTier = (tier: string) => {
    setState((prev) => {
      const nextStyle = getTierStyle(tier);
      const previousStyle = getTierStyle(prev.tier);
      const shouldResetRating = !prev.rating || prev.rating === previousStyle.ratingPreset;

      return {
        ...prev,
        tier: nextStyle.key,
        templateId: nextStyle.templateId ?? prev.templateId ?? DEFAULT_STATE.templateId,
        rating: shouldResetRating ? nextStyle.ratingPreset : prev.rating,
      };
    });
  };

  const applyTemplate = (templateId: string, company: string, location: string, rating: string) => {
    setUi(prev => ({ ...prev, isLoading: true }));

    const tierStyle = getTierStyle(state.tier);
    const normalizedRating = rating || tierStyle.ratingPreset;
    const isHighRating = normalizedRating === 'A' || normalizedRating === 'A+';
    const headerText = isHighRating ? "Restoration Expert" : "Restoration Professional";

    const template = availableTemplates.find(t => t.id === templateId) || availableTemplates[0] || DEFAULT_TEMPLATES[0];

    const configureLayers = (currentLayers: Layer[]) => {
      return currentLayers.map(layer => {
        if (layer.type !== 'text') return layer;

        let config: any = null;

        if (Array.isArray(template.layers)) {
            config = template.layers.find((l: any) => l.id === layer.id);
        } else {
            config = (template.layers as Record<string, any>)[layer.id];
        }

        if (!config) return { ...layer, enabled: false };

        let text = config.text || layer.text;
        if (layer.id === 'member-name') text = company;
        if (layer.id === 'location') text = location;
        if (layer.id === 'rating') text = normalizedRating;
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
        } as any;
      });
    };

    const finishApply = (bgImage: string, width: number, height: number) => {
      const newLayers = configureLayers(INITIAL_LAYERS);
      setState(prev => ({
        ...prev,
        templateId: template.id,
        tier: tierStyle.key,
        companyName: company,
        location: location,
        rating: normalizedRating,
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

  const importDesign = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.layers && parsed.imageWidth) {
          setState(prev => ({
              ...prev,
              ...parsed,
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
      setState(buildInitialState(initialState));
  };

  const actions = {
    applyTemplate,
    updateLayer,
    updateBackground,
    importDesign,
    setTier,
    setStartupOpen: (isOpen: boolean) => setUi(prev => ({ ...prev, isStartupOpen: isOpen })),
    setCodeModalOpen: (isOpen: boolean) => setUi(prev => ({ ...prev, isCodeModalOpen: isOpen })),
    resetDesign,
    toggleSuccess: (show: boolean) => setUi(prev => ({ ...prev, showSuccess: show })),
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
