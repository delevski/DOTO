/**
 * Image Compression Utility
 * 
 * Compresses images to reduce file size and memory usage.
 * Target: 200-500KB per image, max width 1200px, 70-80% quality
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

// Configuration for image compression
const COMPRESSION_CONFIG = {
  // Maximum width in pixels (height will be auto-calculated to maintain aspect ratio)
  maxWidth: 1200,
  // JPEG quality (0-1, where 1 is highest quality)
  quality: 0.75,
  // Maximum file size in bytes (500KB)
  maxFileSize: 500 * 1024,
  // Minimum quality to try before giving up on size reduction
  minQuality: 0.4,
};

/**
 * Get the file size of an image from its URI
 * @param {string} uri - The image URI
 * @returns {Promise<number>} - File size in bytes
 */
async function getFileSize(uri) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.size || 0;
  } catch (error) {
    console.warn('Could not get file size:', error.message);
    return 0;
  }
}

/**
 * Compress a single image
 * 
 * @param {string} uri - The image URI to compress
 * @param {Object} options - Optional compression options
 * @returns {Promise<{uri: string, base64: string, width: number, height: number, size: number}>}
 */
export async function compressImage(uri, options = {}) {
  const {
    maxWidth = COMPRESSION_CONFIG.maxWidth,
    quality = COMPRESSION_CONFIG.quality,
    maxFileSize = COMPRESSION_CONFIG.maxFileSize,
  } = options;

  try {
    // First pass: resize and compress with target quality
    let result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    // Check if the result is still too large
    let currentSize = result.base64 ? result.base64.length * 0.75 : 0; // Base64 is ~33% larger
    let currentQuality = quality;

    // If still too large, reduce quality progressively
    while (currentSize > maxFileSize && currentQuality > COMPRESSION_CONFIG.minQuality) {
      currentQuality -= 0.1;
      result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: maxWidth } }],
        {
          compress: currentQuality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      currentSize = result.base64 ? result.base64.length * 0.75 : 0;
    }

    // If still too large, reduce width
    let currentWidth = maxWidth;
    while (currentSize > maxFileSize && currentWidth > 600) {
      currentWidth -= 200;
      result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: currentWidth } }],
        {
          compress: COMPRESSION_CONFIG.minQuality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      currentSize = result.base64 ? result.base64.length * 0.75 : 0;
    }

    const compressedSize = await getFileSize(result.uri);
    
    console.log(`[ImageCompression] Compressed image: ${(currentSize / 1024).toFixed(1)}KB, ${result.width}x${result.height}`);

    return {
      uri: result.uri,
      base64: `data:image/jpeg;base64,${result.base64}`,
      width: result.width,
      height: result.height,
      size: compressedSize || currentSize,
    };
  } catch (error) {
    console.error('[ImageCompression] Failed to compress image:', error);
    throw error;
  }
}

/**
 * Compress multiple images in parallel
 * 
 * @param {Array<{uri: string}>} images - Array of image objects with uri property
 * @param {Object} options - Optional compression options
 * @returns {Promise<Array<{uri: string, base64: string, width: number, height: number}>>}
 */
export async function compressImages(images, options = {}) {
  try {
    const compressionPromises = images.map(image => compressImage(image.uri, options));
    const results = await Promise.all(compressionPromises);
    
    const totalSize = results.reduce((sum, img) => sum + (img.size || 0), 0);
    console.log(`[ImageCompression] Compressed ${results.length} images, total: ${(totalSize / 1024).toFixed(1)}KB`);
    
    return results;
  } catch (error) {
    console.error('[ImageCompression] Failed to compress images:', error);
    throw error;
  }
}

/**
 * Create a thumbnail for an image (smaller version for previews)
 * 
 * @param {string} uri - The image URI
 * @param {number} size - Thumbnail size in pixels (default: 200)
 * @returns {Promise<{uri: string, base64: string}>}
 */
export async function createThumbnail(uri, size = 200) {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: size, height: size } }],
      {
        compress: 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    return {
      uri: result.uri,
      base64: `data:image/jpeg;base64,${result.base64}`,
    };
  } catch (error) {
    console.error('[ImageCompression] Failed to create thumbnail:', error);
    throw error;
  }
}

/**
 * Estimate the size of a base64 image string
 * @param {string} base64String - The base64 encoded image
 * @returns {number} - Estimated size in bytes
 */
export function estimateBase64Size(base64String) {
  if (!base64String) return 0;
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  // Base64 encoding increases size by ~33%, so actual size is ~75% of string length
  return Math.round(base64Data.length * 0.75);
}

export default {
  compressImage,
  compressImages,
  createThumbnail,
  estimateBase64Size,
  COMPRESSION_CONFIG,
};

