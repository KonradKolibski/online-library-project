import { supabase } from "@/lib/supabase";

const BUCKET = "book-covers";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — keep in sync with the bucket's file_size_limit

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Uploads a cover image to the public `book-covers` storage bucket and returns
 * its public URL. Files are stored under `<userId>/<uuid>.<ext>` so the bucket's
 * RLS policies can scope writes to the signed-in user's own folder.
 *
 * Throws an Error with a user-friendly message on validation or upload failure.
 */
export async function uploadCover(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large (max 5 MB).");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("You must be signed in to upload a cover.");
  }

  const ext =
    EXT_BY_TYPE[file.type] ?? file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload cover.");
  }

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
