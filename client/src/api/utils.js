import axios from "axios";

// Function to upload an image to imgbb
export const imageUpload = async (imageData) => {
  const imageFormData = new FormData();
  imageFormData.append("image", imageData);

  // Upload image to imgbb
  const { data } = await axios.post(
    `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
    imageFormData
  );

  // Extract the image URL from the response
  return data?.data?.display_url;
};
