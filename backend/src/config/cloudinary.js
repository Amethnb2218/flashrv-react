const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DEFAULT_ROOT_FOLDER = 'jolofera';
const cloudinaryRootFolder = String(process.env.CLOUDINARY_FOLDER_ROOT || DEFAULT_ROOT_FOLDER)
  .trim()
  .replace(/^\/+|\/+$/g, '') || DEFAULT_ROOT_FOLDER;

const toFolderSegment = (value) => String(value || '')
  .trim()
  .replace(/^\/+|\/+$/g, '');

const cloudinaryFolder = (...segments) => [cloudinaryRootFolder, ...segments.map(toFolderSegment)]
  .filter(Boolean)
  .join('/');

const cloudinaryFolders = Object.freeze({
  gallery: cloudinaryFolder('gallery'),
  salon: cloudinaryFolder('salon'),
  services: cloudinaryFolder('services'),
  products: cloudinaryFolder('products'),
  chatVoices: cloudinaryFolder('chat-voices'),
  paymentMethodsQr: cloudinaryFolder('payment-methods', 'qr'),
  paymentProofs: cloudinaryFolder('payments', 'proofs'),
  avatars: cloudinaryFolder('avatars'),
});

const CLOUDINARY_UPLOAD_MARKER = '/upload/';
const CLOUDINARY_VERSION_RE = /^v\d+$/i;

const isTransformationSegment = (segment) => {
  if (!segment) return false;
  if (segment.includes(',')) return true;
  return /^[a-z]{1,4}_/i.test(segment);
};

const extractCloudinaryPublicId = (value) => {
  if (!value || typeof value !== 'string') return null;

  const cleaned = value
    .split('?')[0]
    .split('#')[0]
    .trim();

  if (!cleaned) return null;

  const markerIndex = cleaned.indexOf(CLOUDINARY_UPLOAD_MARKER);
  if (markerIndex === -1) return null;

  const pathAfterUpload = cleaned.slice(markerIndex + CLOUDINARY_UPLOAD_MARKER.length);
  const segments = pathAfterUpload.split('/').filter(Boolean);
  if (!segments.length) return null;

  const versionIndex = segments.findIndex((segment) => CLOUDINARY_VERSION_RE.test(segment));
  let publicIdSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;

  if (versionIndex < 0) {
    let offset = 0;
    while (offset < publicIdSegments.length - 1 && isTransformationSegment(publicIdSegments[offset])) {
      offset += 1;
    }
    publicIdSegments = publicIdSegments.slice(offset);
  }

  if (!publicIdSegments.length) return null;

  const lastIndex = publicIdSegments.length - 1;
  publicIdSegments[lastIndex] = publicIdSegments[lastIndex].replace(/\.[^.]+$/, '');

  return publicIdSegments.filter(Boolean).join('/') || null;
};

const imageFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Seuls les fichiers JPEG, PNG, WebP et GIF sont autorises'));
  }
  cb(null, true);
};

const galleryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: cloudinaryFolders.gallery,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
  },
});

const salonImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: cloudinaryFolders.salon,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }],
  },
});

const serviceImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: cloudinaryFolders.services,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  },
});

const productImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: cloudinaryFolders.products,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  },
});

const voiceStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: cloudinaryFolders.chatVoices,
    resource_type: 'auto',
    allowed_formats: ['webm', 'ogg', 'mp3', 'wav', 'm4a', 'aac'],
  },
});

const paymentQrStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: cloudinaryFolders.paymentMethodsQr,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 900, height: 900, crop: 'limit', quality: 'auto' }],
  },
});

const paymentProofStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: cloudinaryFolders.paymentProofs,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1400, height: 1400, crop: 'limit', quality: 'auto' }],
  },
});

const uploadGallery = multer({
  storage: galleryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
const uploadSalonImage = multer({
  storage: salonImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
const uploadServiceImages = multer({
  storage: serviceImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
const uploadProductImages = multer({
  storage: productImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
const uploadPaymentQr = multer({
  storage: paymentQrStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
const uploadPaymentProof = multer({
  storage: paymentProofStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});
const uploadVoice = multer({
  storage: voiceStorage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (String(file.mimetype || '').startsWith('audio/')) return cb(null, true);
    cb(new Error('Only audio files are allowed'));
  },
});

module.exports = {
  cloudinary,
  cloudinaryRootFolder,
  cloudinaryFolder,
  cloudinaryFolders,
  extractCloudinaryPublicId,
  uploadGallery,
  uploadSalonImage,
  uploadServiceImages,
  uploadProductImages,
  uploadPaymentQr,
  uploadPaymentProof,
  uploadVoice,
};
