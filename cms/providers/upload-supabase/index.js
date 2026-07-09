"use strict";

// Local Strapi 5 upload provider for Supabase Storage, written against
// supabase-js v2 (the popular community package still uses the v1 getPublicUrl
// API, which returns `undefined` under v2). Strapi resolves this via
// `provider: 'supabase'` → package name `strapi-provider-upload-supabase`.
//
// Auth uses the Supabase service key, so writes bypass Storage RLS. The bucket
// is public, so getPublicUrl returns a directly-usable image URL.

const { createClient } = require("@supabase/supabase-js");

const keyFor = (directory, file) =>
  `${directory ? `${directory}/` : ""}${file.name}-${file.hash}${file.ext}`.replace(
    /^\/+/,
    "",
  );

/** Resolve a Strapi file to a Buffer, whether it arrives buffered or streamed. */
async function toBuffer(file) {
  if (file.buffer) return Buffer.from(file.buffer);
  const chunks = [];
  for await (const chunk of file.stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

module.exports = {
  init(config) {
    const apiUrl = config.apiUrl;
    const apiKey = config.apiKey;
    const bucket = config.bucket || "strapi-uploads";
    const directory = (config.directory || "").replace(/(^\/)|(\/$)/g, "");

    if (!apiUrl || !apiKey) {
      throw new Error(
        "strapi-provider-upload-supabase: apiUrl and apiKey are required",
      );
    }

    const supabase = createClient(apiUrl, apiKey, config.options);

    async function put(file) {
      const key = keyFor(directory, file);
      const body = await toBuffer(file);
      const { error } = await supabase.storage.from(bucket).upload(key, body, {
        cacheControl: "public, max-age=31536000, immutable",
        upsert: true,
        contentType: file.mime,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(key);
      file.url = data.publicUrl;
    }

    return {
      upload: put,
      uploadStream: put,
      async delete(file) {
        const { error } = await supabase.storage
          .from(bucket)
          .remove([keyFor(directory, file)]);
        if (error) throw error;
      },
    };
  },
};
