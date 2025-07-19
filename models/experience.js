const mongoose = require("mongoose");

const experienceSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
  location: String,
  price: Number,
});

module.exports = mongoose.model("Experience", experienceSchema);