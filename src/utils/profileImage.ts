const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_PROFILE_IMAGE_DIMENSION = 512;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read the selected image."));
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the selected image."));
    };

    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to process the selected image."));
    image.src = src;
  });

const resizeProfileImage = async (dataUrl: string, mimeType: string) => {
  const image = await loadImage(dataUrl);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;

  if (!originalWidth || !originalHeight) {
    throw new Error("The selected image could not be processed.");
  }

  const scale = Math.min(1, MAX_PROFILE_IMAGE_DIMENSION / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image processing is not available in this browser.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  if (mimeType === "image/png") {
    return canvas.toDataURL("image/png");
  }

  return canvas.toDataURL("image/jpeg", 0.82);
};

export const prepareProfileImage = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload a valid image file.");
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Please upload an image smaller than 2 MB.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  return resizeProfileImage(dataUrl, file.type);
};
