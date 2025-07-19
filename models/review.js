const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
     comment: String,
     rating:{
        type: Number,
        required: false,
        min: 0,
        max: 5,
        default: 0
     },
     createdAt: {
        type: Date,
        default: Date.now,
     },
     author:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
     }
},{timestamps: true});

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;