const mongoose = require("mongoose");
const Experience = require("../models/experience");

mongoose.connect("mongodb://127.0.0.1:27017/AirBnb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const sampleExperiences = [
  {
    title: "Street Food Tasting Tour",
    description: "Explore the local food markets and taste the best street food with a local expert.",
    image: "https://images.unsplash.com/photo-1648889646912-7a5c2a0655f5?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8U3RyZWV0JTIwRm9vZCUyMFRhc3RpbmclMjBUb3VyfGVufDB8fDB8fHww", // food
    location: "Delhi",
    price: 999,
  },
  {
    title: "Sunset Kayaking Adventure",
    description: "Enjoy a peaceful sunset while kayaking through scenic rivers.",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e", // kayaking
    location: "Kerala",
    price: 1299,
  },
  {
    title: "Pottery Workshop",
    description: "Hands-on experience shaping clay and learning traditional pottery techniques.",
    image: "https://images.unsplash.com/photo-1683861763373-b62d946619ac?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTl8fFBvdHRlcnklMjBXb3Jrc2hvcHxlbnwwfHwwfHx8MA%3D%3D", // pottery
    location: "Jaipur",
    price: 599,
  },
  
];

const seedExperiences = async () => {
  await Experience.deleteMany({});
  await Experience.insertMany(sampleExperiences);
  console.log("✅ Experience collection seeded!");
  mongoose.connection.close();
};

seedExperiences();