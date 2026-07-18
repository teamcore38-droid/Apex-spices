import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const normalizeEnvValue = (value) => String(value || '').trim().replace(/^['"]|['"]$/g, '');

const cloudinaryConfig = {
  cloud_name: normalizeEnvValue(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: normalizeEnvValue(process.env.CLOUDINARY_API_KEY),
  api_secret: normalizeEnvValue(process.env.CLOUDINARY_API_SECRET),
};

const isCloudinaryConfigured = () => Object.values(cloudinaryConfig).every(Boolean);

cloudinary.config(cloudinaryConfig);

export default cloudinary;
export { isCloudinaryConfigured };
