const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const imageFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Seuls les fichiers JPEG, PNG, WebP et GIF sont autorisés'));
  }
  cb(null, true);
};

// Gallery images storage
const galleryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'styleflow/gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
  },
});

// Salon cover image storage
const salonImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'styleflow/salon',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }],
  },
});

// Service images storage
const serviceImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'styleflow/services',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  },
});

// Product images storage
const productImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'styleflow/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  },
});

const uploadGallery = multer({ storage: galleryStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadSalonImage = multer({ storage: salonImageStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadServiceImages = multer({ storage: serviceImageStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadProductImages = multer({ storage: productImageStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = {
  cloudinary,
  uploadGallery,
  uploadSalonImage,
  uploadServiceImages,
  uploadProductImages,
};
