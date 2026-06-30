'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const CROSSFADE_SECONDS = 0.45;

type ClinicHeroLoopVideoProps = {
  src: string;
  poster?: string;
  muted?: boolean;
  label?: string;
  loopTrimStart?: number;
  loopTrimEnd?: number;
  className?: string;
};

export function ClinicHeroLoopVideo({
  src,
  poster,
  muted = true,
  label = 'Clinical excellence',
  loopTrimStart = 0,
  loopTrimEnd = 0,
  className = 'absolute inset-0 h-full w-full object-cover',
}: ClinicHeroLoopVideoProps) {
  const refs = useRef<[HTMLVideoElement | null, HTMLVideoElement | null]>([null, null]);
  const activeRef = useRef<0 | 1>(0);
  const switchingRef = useRef(false);
  const [visibleLayer, setVisibleLayer] = useState<0 | 1>(0);

  const getLoopEnd = useCallback(
    (duration: number) => {
      if (!Number.isFinite(duration) || duration <= 0) return 0;
      const end = duration - Math.max(0, loopTrimEnd);
      return Math.max(loopTrimStart + 0.1, end);
    },
    [loopTrimEnd, loopTrimStart]
  );

  const crossfadeTo = useCallback(
    async (to: 0 | 1) => {
      if (switchingRef.current || activeRef.current === to) return;
      switchingRef.current = true;

      const nextVideo = refs.current[to];
      const fromVideo = refs.current[activeRef.current];
      if (!nextVideo) {
        switchingRef.current = false;
        return;
      }

      nextVideo.currentTime = loopTrimStart;
      try {
        await nextVideo.play();
      } catch {
        switchingRef.current = false;
        return;
      }

      activeRef.current = to;
      setVisibleLayer(to);

      window.setTimeout(() => {
        if (fromVideo) {
          fromVideo.pause();
          fromVideo.currentTime = loopTrimStart;
        }
        switchingRef.current = false;
      }, CROSSFADE_SECONDS * 1000);
    },
    [loopTrimStart]
  );

  useEffect(() => {
    activeRef.current = 0;
    switchingRef.current = false;
    setVisibleLayer(0);

    let disposed = false;
    let cleanups: Array<() => void> = [];

    const timer = window.setTimeout(() => {
      if (disposed) return;

      ([0, 1] as const).forEach((index) => {
        const video = refs.current[index];
        if (!video) return;

        const onLoadedMetadata = () => {
          video.currentTime = loopTrimStart;
          if (index === 0) {
            void video.play().catch(() => {});
          }
        };

        const onTimeUpdate = () => {
          if (activeRef.current !== index || switchingRef.current) return;
          const loopEnd = getLoopEnd(video.duration);
          if (loopEnd > 0 && video.currentTime >= loopEnd - CROSSFADE_SECONDS) {
            void crossfadeTo(index === 0 ? 1 : 0);
          }
        };

        if (video.readyState >= 1) onLoadedMetadata();
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('timeupdate', onTimeUpdate);
        cleanups.push(() => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('timeupdate', onTimeUpdate);
          video.pause();
        });
      });
    }, 0);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      cleanups.forEach((cleanup) => cleanup());
      cleanups = [];
    };
  }, [crossfadeTo, getLoopEnd, loopTrimStart, src]);

  const setRef = (index: 0 | 1) => (node: HTMLVideoElement | null) => {
    refs.current[index] = node;
  };

  return (
    <>
      {([0, 1] as const).map((index) => (
        <video
          key={`${src}-${index}`}
          ref={setRef(index)}
          src={src}
          poster={index === 0 ? poster : undefined}
          muted={muted}
          playsInline
          preload="auto"
          aria-hidden={index !== visibleLayer}
          aria-label={index === visibleLayer ? label : undefined}
          className={`${className} clinic-hero-loop-layer ${
            index === visibleLayer ? 'clinic-hero-loop-layer-active' : ''
          }`}
        />
      ))}
    </>
  );
}
