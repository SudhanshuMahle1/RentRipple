const mongoose = require("mongoose");
const initdata = require("../init/data");
const Listing = require("../models/listing.js");
const MONGO_URL = "mongodb://127.0.0.1:27017/AirBnb";

// Function to connect to the database
async function connectDB() {
    try {
        await mongoose.connect(MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000
        });
        console.log("MongoDB connected");

        // Initialize the database (insert data)
        await initdb();

        // Close the connection after the operations are complete
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
    } catch (err) {
        console.error("Connection error:", err);
    }
}

// Function to initialize the database with data
const initdb = async () => {
    try {
        // Delete existing listings
        await Listing.deleteMany();

        // Ensure geometry.type is set for each data entry
        initdata.data = initdata.data.map((data) => {
            if (!data.geometry || !data.geometry.type) {
                console.warn(`Missing geometry.type for entry: ${JSON.stringify(data)}`);
                data.geometry = data.geometry || {};
                data.geometry.type = "Point";  // Default value
            }

            return {
                ...data,
                owner: "685c34edbe022a3252689bb9",
            };
        });

        console.log("Data prepared for insertion");

        // Insert the modified data into the Listing collection
        await Listing.insertMany(initdata.data);
        console.log("Data inserted/updated");
    } catch (err) {
        console.error("Error initializing database:", err);
    }
};


// Ensure database connection is established before initializing data
connectDB();
