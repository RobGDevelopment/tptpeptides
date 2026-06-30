import type { ClinicLandingContent } from '../schemas/clinicLanding';

export type ClinicThemePreset = {
  id: string;
  label: string;
  description: string;
  colors: Pick<ClinicLandingContent, 'primaryColor' | 'accentColor' | 'backgroundColor'>;
};

export const CLINIC_THEME_PRESETS: ClinicThemePreset[] = [
  {
    id: 'clinical-teal',
    label: 'Clinical Teal',
    description: 'Default wellness palette',
    colors: {
      primaryColor: '#2D6A6A',
      accentColor: '#5A9E8F',
      backgroundColor: '#F4F9F7',
    },
  },
  {
    id: 'midnight-sage',
    label: 'Midnight Sage',
    description: 'Deep primary on soft sage',
    colors: {
      primaryColor: '#1F4D4D',
      accentColor: '#7BA38C',
      backgroundColor: '#F0F5F2',
    },
  },
  {
    id: 'coastal-blue',
    label: 'Coastal Blue',
    description: 'Calm blue telehealth tone',
    colors: {
      primaryColor: '#2B5F8C',
      accentColor: '#6BA3C7',
      backgroundColor: '#F5F9FC',
    },
  },
  {
    id: 'warm-rose',
    label: 'Warm Rose',
    description: 'Soft feminine wellness',
    colors: {
      primaryColor: '#8B4A5C',
      accentColor: '#C98B9A',
      backgroundColor: '#FBF6F7',
    },
  },
];
