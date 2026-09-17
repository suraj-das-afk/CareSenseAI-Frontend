const CLOUDINARY_CLOUD_NAME = 'lyyss5ur';
const CLOUDINARY_UPLOAD_PRESET = 'caresense_profile_images';

const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;


/**
 * Upload a local Expo/React Native image to Cloudinary.
 *
 * Returns:
 * {
 *   secure_url,
 *   public_id,
 *   width,
 *   height
 * }
 */
export const uploadProfileImage = async imageUri => {
  if (!imageUri) {
    throw new Error('No profile image was selected.');
  }

  const filename =
    imageUri.split('/').pop() ||
    `profile_${Date.now()}.jpg`;

  const extensionMatch =
    filename.match(/\.([a-zA-Z0-9]+)$/);

  const extension =
    extensionMatch?.[1]?.toLowerCase() || 'jpg';

  const mimeType =
    extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

  const formData = new FormData();

  formData.append('file', {
    uri: imageUri,
    type: mimeType,
    name: filename,
  });

  formData.append(
    'upload_preset',
    CLOUDINARY_UPLOAD_PRESET,
  );


  const response = await fetch(
    CLOUDINARY_UPLOAD_URL,
    {
      method: 'POST',
      body: formData,
    },
  );


  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }


  if (!response.ok) {
    console.error(
      'Cloudinary Upload Error:',
      data,
    );

    throw new Error(
      data?.error?.message ||
        'Unable to upload profile picture.',
    );
  }


  if (!data?.secure_url) {
    throw new Error(
      'Cloudinary did not return a secure image URL.',
    );
  }


  return {
    secure_url: data.secure_url,
    public_id: data.public_id || null,
    width: data.width || null,
    height: data.height || null,
  };
};