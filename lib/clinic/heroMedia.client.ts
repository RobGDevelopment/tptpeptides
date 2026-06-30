'use client';

import { classifyAspectRatio, inferMediaTypeFromUrl } from './heroMedia';
import type { HeroMediaAspectRatio, HeroMediaType } from '../schemas/clinicLanding';

export type ProbedHeroMedia = {
  mediaType: HeroMediaType;
  width: number;
  height: number;
  aspectRatio: HeroMediaAspectRatio;
};

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read image dimensions.'));
    };

    image.src = url;
  });
}

function loadVideoDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read video dimensions.'));
    };

    video.src = url;
  });
}

export async function probeHeroMediaFile(file: File): Promise<ProbedHeroMedia> {
  const mediaType: HeroMediaType = file.type.startsWith('video/') ? 'video' : 'image';
  const dimensions =
    mediaType === 'video' ? await loadVideoDimensions(file) : await loadImageDimensions(file);

  return {
    mediaType,
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio: classifyAspectRatio(dimensions.width, dimensions.height),
  };
}

export async function probeHeroMediaUrl(url: string): Promise<ProbedHeroMedia | null> {
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null;

  const mediaType = inferMediaTypeFromUrl(trimmed);
  if (mediaType === 'video') {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve({
          mediaType: 'video',
          width: video.videoWidth,
          height: video.videoHeight,
          aspectRatio: classifyAspectRatio(video.videoWidth, video.videoHeight),
        });
      };
      video.onerror = () => resolve(null);
      video.src = trimmed;
    });
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        mediaType: 'image',
        width: image.naturalWidth,
        height: image.naturalHeight,
        aspectRatio: classifyAspectRatio(image.naturalWidth, image.naturalHeight),
      });
    };
    image.onerror = () => resolve(null);
    image.src = trimmed;
  });
}
