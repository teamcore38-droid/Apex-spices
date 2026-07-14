import { useState } from 'react';
import axios from 'axios';
import { Loader2, UploadCloud, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ImageUpload = ({ onUploadSuccess, label = 'Upload Image', folder = 'general' }) => {
  const { userInfo } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);

    try {
      const { data } = await axios.post('/api/admin/pro/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${userInfo?.token}`,
        },
      });

      setSuccess(true);
      if (onUploadSuccess) {
        onUploadSuccess(data.url);
      }
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError.response?.data?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    handleUpload(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    handleUpload(file);
  };

  return (
    <div className="w-full space-y-2">
      <span className="block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</span>
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 transition-all duration-200 ${
          dragOver
            ? 'border-brand-accent bg-brand-accent/5'
            : 'border-gray-200 bg-[#f7f9fc] hover:border-brand-primary/40 hover:bg-gray-50'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />

        {uploading ? (
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            <p className="text-xs font-medium text-brand-dark">Uploading to Cloudinary...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 text-center">
            <UploadCloud className="h-8 w-8 text-gray-400" />
            <div className="text-xs text-gray-600">
              <span className="font-semibold text-brand-primary">Click to upload</span> or drag and drop
            </div>
            <p className="text-[10px] text-gray-400">PNG, JPG, WEBP or GIF up to 5MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-1.5 text-xs text-red-600">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-1.5 text-xs text-green-600">
          <CheckCircle size={14} className="shrink-0" />
          <span>Image uploaded successfully!</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
