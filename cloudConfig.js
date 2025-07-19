const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');


cloudinary.config({
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      // async code using `req` and `file`
      // ...
      return {
        folder: 'AirBnb_images',
        allowedFormats: ['jpeg', 'png', 'jpg'],
       
      };
    },
  });

  module.exports = { cloudinary, storage }