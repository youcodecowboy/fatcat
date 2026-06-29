import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

// Issues short-lived client tokens so the browser can upload the photo
// straight to Vercel Blob — bypassing the Server Action body-size limit
// (1MB) and the function request-body limit (4.5MB). Files of any phone-photo
// size go directly to storage.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/heic",
          "image/heif",
          "image/gif",
        ],
        addRandomSuffix: true,
        maximumSizeInBytes: 25 * 1024 * 1024, // 25MB — generous for phone photos
      }),
      // Fires server-side once the browser finishes uploading. Nothing to do
      // here yet (the URL is returned to the client, which sends it on with
      // the feeding), but this is where post-processing would hook in.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
