export type LayoutPreset = 'standard' | 'pro_trader' | 'ai_quant' | 'compact';

export type WidgetId =
  | 'preflight'
  | 'chart'
  | 'matrix'
  | 'radar'
  | 'meter_scenarios'
  | 'stats'
  | 'indicators_news'
  | 'history'
  | 'ai_card';

export interface DashboardLayoutConfig {
  preset: LayoutPreset;
  visibleWidgets: Record<WidgetId, boolean>;
  density: 'comfortable' | 'compact';
  aiCardPosition: 'right' | 'bottom' | 'split';
  chartHeight: 'normal' | 'large' | 'expanded';
  fullWidthChart: boolean;
}

export const DEFAULT_LAYOUT_CONFIG: DashboardLayoutConfig = {
  preset: 'standard',
  visibleWidgets: {
    preflight: true,
    chart: true,
    matrix: true,
    radar: true,
    meter_scenarios: true,
    stats: true,
    indicators_news: true,
    history: true,
    ai_card: true,
  },
  density: 'comfortable',
  aiCardPosition: 'right',
  chartHeight: 'normal',
  fullWidthChart: false,
};

export const LAYOUT_PRESETS: Record<
  LayoutPreset,
  {
    name: string;
    description: string;
    iconName: string;
    badge: string;
    config: Partial<DashboardLayoutConfig>;
  }
> = {
  standard: {
    name: 'Standard Workspace',
    description: 'Balanced trading view with chart on left, sticky AI report on right, and full technical panels',
    iconName: 'LayoutDashboard',
    badge: 'Default',
    config: {
      preset: 'standard',
      aiCardPosition: 'right',
      chartHeight: 'normal',
      fullWidthChart: false,
      visibleWidgets: {
        preflight: true,
        chart: true,
        matrix: true,
        radar: true,
        meter_scenarios: true,
        stats: true,
        indicators_news: true,
        history: true,
        ai_card: true,
      },
    },
  },
  pro_trader: {
    name: 'Pro Trader',
    description: 'Expanded chart area with live microstructure, orderflow gauges, and high-density technical indicator matrix',
    iconName: 'CandlestickChart',
    badge: 'High Precision',
    config: {
      preset: 'pro_trader',
      aiCardPosition: 'right',
      chartHeight: 'large',
      fullWidthChart: false,
      visibleWidgets: {
        preflight: false,
        chart: true,
        matrix: true,
        radar: true,
        meter_scenarios: true,
        stats: true,
        indicators_news: true,
        history: true,
        ai_card: true,
      },
    },
  },
  ai_quant: {
    name: 'AI Quant Focus',
    description: 'Side-by-side view placing the deep AI Quant analysis report next to technical score radar and preflight facts',
    iconName: 'BrainCircuit',
    badge: 'AI First',
    config: {
      preset: 'ai_quant',
      aiCardPosition: 'split',
      chartHeight: 'normal',
      fullWidthChart: false,
      visibleWidgets: {
        preflight: true,
        chart: true,
        matrix: true,
        radar: true,
        meter_scenarios: true,
        stats: false,
        indicators_news: true,
        history: true,
        ai_card: true,
      },
    },
  },
  compact: {
    name: 'Compact Analytics',
    description: 'High-density multi-card dashboard designed for multi-monitor or widescreen overview',
    iconName: 'Grid',
    badge: 'Multi-Card',
    config: {
      preset: 'compact',
      aiCardPosition: 'right',
      chartHeight: 'normal',
      fullWidthChart: false,
      visibleWidgets: {
        preflight: true,
        chart: true,
        matrix: true,
        radar: true,
        meter_scenarios: true,
        stats: true,
        indicators_news: true,
        history: false,
        ai_card: true,
      },
    },
  },
};
