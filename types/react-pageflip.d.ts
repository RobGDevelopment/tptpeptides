declare module 'react-pageflip' {
  import type { ReactNode, Ref } from 'react';

  export interface FlipBookProps {
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    drawShadow?: boolean;
    maxShadowOpacity?: number;
    flippingTime?: number;
    usePortrait?: boolean;
    startPage?: number;
    className?: string;
    style?: Record<string, unknown>;
    onFlip?: (event: { data: number }) => void;
    children: ReactNode;
    ref?: Ref<{ pageFlip: () => { flipNext: () => void; flipPrev: () => void } }>;
  }

  export default function HTMLFlipBook(props: FlipBookProps): ReactNode;
}
