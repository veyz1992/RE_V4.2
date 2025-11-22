
export type Position = {
  x: number;
  y: number;
};

export type GradientConfig = {
  enabled: boolean;
  startColor: string;
  endColor: string;
  type: 'vertical' | 'horizontal' | 'diagonal';
};

export type StrokeConfig = {
  enabled: boolean;
  color: string;
  width: number;
};

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
export type TextAlign = 'left' | 'center' | 'right';
export type FontWeight = 'normal' | 'bold' | '900';

export interface LayerBase {
  id: string;
  name: string;
  enabled: boolean;
  x: number;
  y: number;
}

export interface TextLayer extends LayerBase {
  type: 'text';
  text: string;
  align: TextAlign;
  fontFamily: string;
  fontSize: number;
  fontWeight: FontWeight;
  color: string;
  letterSpacing: number;
  lineHeight: number;
  textTransform: TextTransform;
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  gradient: GradientConfig;
  stroke: StrokeConfig;
  isDynamic: boolean;
  dynamicParam?: string;
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  src: string;
  width: number;
  height: number;
  opacity: number;
}

export type Layer = TextLayer | ImageLayer;

export interface TemplateLayerConfig {
  text?: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: FontWeight;
  color: string;
  align: TextAlign;
  shadow: boolean;
  gradient?: GradientConfig;
  letterSpacing?: number;
  textTransform?: TextTransform;
  stroke?: StrokeConfig;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  badge: string;
  accentColor: string;
  imageUrl?: string;
  status?: 'active' | 'coming-soon';
  layers: Record<string, TemplateLayerConfig>;
}

export interface DesignState {
  templateId: string;
  companyName: string;
  location: string;
  rating: string;
  backgroundImage: string | null;
  imageWidth: number;
  imageHeight: number;
  layers: Layer[];
  customTemplates: Template[];
}

export const FONT_FAMILIES = [
  'SF Pro Display',
  'SF Pro Text',
  'SF Pro Rounded',
  'Helvetica',
  'Arial',
  'Georgia',
  'Verdana',
  'Courier New',
  'Times New Roman'
];
