// Cloudinary Configuration
// Place this file in: server/src/config/cloudinary.js

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string} base64Image - Base64 encoded image string
 * @param {string} folder - Folder name in Cloudinary (default: 'products')
 * @param {string} publicId - Custom filename (optional)
 * @returns {Promise<string>} - Cloudinary image URL
 */
const uploadImage = async (base64Image, folder = 'products', publicId = null) => {
  try {
    // Upload options
    const uploadOptions = {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 800, crop: 'limit' }, // Max 800x800, maintains aspect ratio
        { quality: 'auto' }, // Automatic quality optimization
        { fetch_format: 'auto' }, // Best format (WebP for modern browsers)
      ],
    };

    // Add public_id if provided (custom filename)
    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64Image, uploadOptions);

    console.log('✅ Image uploaded to Cloudinary:', result.secure_url);

    // Return the secure URL
    return result.secure_url;
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error.message);
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} imageUrl - Full Cloudinary image URL
 * @returns {Promise<boolean>} - Success status
 */
const deleteImage = async (imageUrl) => {
  try {
    // Extract public_id from Cloudinary URL
    // Example URL: https://res.cloudinary.com/pram/image/upload/v123456/products/brake-pad.jpg
    // Public ID: products/brake-pad
    
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL');
    }

    // Get everything after version number (v123456)
    const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');
    
    // Remove file extension
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    console.log('✅ Image deleted from Cloudinary:', publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('❌ Cloudinary deletion failed:', error.message);
    return false;
  }
};

/**
 * Get optimized image URL with transformations
 * @param {string} imageUrl - Original Cloudinary URL
 * @param {object} options - Transformation options
 * @returns {string} - Transformed image URL
 */
const getOptimizedUrl = (imageUrl, options = {}) => {
  const {
    width = 400,
    height = 400,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options;

  // Replace upload/ with upload/transformations/
  const transformation = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
  return imageUrl.replace('/upload/', `/upload/${transformation}/`);
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  getOptimizedUrl,
};
