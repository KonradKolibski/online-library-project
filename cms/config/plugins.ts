import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedExecutableTypes = [
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  // Store media in Supabase Storage when configured (production), otherwise fall
  // back to Strapi's local provider (local dev without Supabase env vars).
  const useSupabase = Boolean(env('SUPABASE_API_URL') && env('SUPABASE_API_KEY'));

  return {
    'users-permissions': {
      config: {
        jwtManagement: 'refresh',
        sessions: {
          httpOnly: true,
        },
      },
    },
    upload: {
      config: {
        ...(useSupabase
          ? {
              provider: 'strapi-provider-upload-supabase',
              providerOptions: {
                apiUrl: env('SUPABASE_API_URL'),
                apiKey: env('SUPABASE_API_KEY'), // service key — server-side only
                bucket: env('SUPABASE_BUCKET', 'challenge-covers'),
                directory: env('SUPABASE_DIRECTORY', ''),
              },
              actionOptions: { upload: {}, uploadStream: {}, delete: {} },
            }
          : {}),
        security: {
          allowedTypes: allowedMediaTypes,
          deniedTypes: deniedExecutableTypes,
        },
      },
    },
  };
};

export default config;
