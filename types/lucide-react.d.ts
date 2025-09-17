declare module 'lucide-react' {
  import * as React from 'react';
  export interface LucideProps extends React.SVGProps<SVGSVGElement> { size?: number | string; }
  export const Eye: React.FC<LucideProps>;
  export const EyeOff: React.FC<LucideProps>;
  export const X: React.FC<LucideProps>;
  export const RotateCcw: React.FC<LucideProps>;
  export const RefreshCcw: React.FC<LucideProps>;
  export const Lightbulb: React.FC<LucideProps>;
  export const Loader2: React.FC<LucideProps>;
  export const Play: React.FC<LucideProps>;
  export const Pause: React.FC<LucideProps>;
  export const Square: React.FC<LucideProps>;
  export const CircleDot: React.FC<LucideProps>;
  export const ArrowLeft: React.FC<LucideProps>;
  export const Keyboard: React.FC<LucideProps>;
  export const Volume2: React.FC<LucideProps>;
  export const ChevronDown: React.FC<LucideProps>;
  export const ChevronRight: React.FC<LucideProps>;
  export const Coffee: React.FC<LucideProps>;
  // fallback export for any other icon names used later
  export const LucideIcon: React.FC<LucideProps>;
}
