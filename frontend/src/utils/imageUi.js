const isCloudinaryImage = (url = '') =>
  /^https:\/\/res\.cloudinary\.com\//i.test(String(url)) && String(url).includes('/image/upload/');

const getOptimizedImageUrl = (url, width) => {
  if (!isCloudinaryImage(url)) {
    return url;
  }

  const normalizedWidth = Math.max(96, Math.min(2400, Number(width) || 1200));
  return String(url).replace(
    '/image/upload/',
    `/image/upload/f_auto,q_auto:good,c_limit,w_${normalizedWidth}/`
  );
};

const getCloudinarySrcSet = (url, widths = [360, 600, 900, 1200]) => {
  if (!isCloudinaryImage(url)) {
    return undefined;
  }

  return widths
    .map((width) => `${getOptimizedImageUrl(url, width)} ${width}w`)
    .join(', ');
};

export { getCloudinarySrcSet, getOptimizedImageUrl, isCloudinaryImage };
