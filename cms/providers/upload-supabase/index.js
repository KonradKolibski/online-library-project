"use strict";

// Local Strapi 5 upload provider for Supabase Storage.
//
// Uses @supabase/storage-js (the Storage REST client) directly rather than the
// full @supabase/supabase-js createClient — the latter also constructs a
// Realtime client that requires a native WebSocket, which crashes on Node 20
// (Railway's runtime). Storage-js is plain HTTP, so it works on any Node.
//
// Auth uses the Supabase service key, so writes bypass Storage RLS. The bucket
// is public, so getPublicUrl returns a directly-usable image URL.

const { StorageClient } = require("@supabase/storage-js");

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

    const storage = new StorageClient(`${apiUrl.replace(/\/+$/, "")}/storage/v1`, {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
    });

    async function put(file) {
      const key = keyFor(directory, file);
      const body = await toBuffer(file);
      const { error } = await storage.from(bucket).upload(key, body, {
        cacheControl: "public, max-age=31536000, immutable",
        upsert: true,
        contentType: file.mime,
      });
      if (error) throw error;
      const { data } = storage.from(bucket).getPublicUrl(key);
      file.url = data.publicUrl;
    }

    return {
      upload: put,
      uploadStream: put,
      async delete(file) {
        const { error } = await storage.from(bucket).remove([keyFor(directory, file)]);
        if (error) throw error;
      },
    };
  },
};
