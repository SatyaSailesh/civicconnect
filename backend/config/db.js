const mongoose = require("mongoose");

const connectDB = async () => {
    const options = {
        autoIndex: true,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4 // Forces IPv4 (Fixes most connection errors)
    };
    
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI, options);
        console.log("MongoDB Connected ✅ (Connection is officially Live)");
    } catch (error) {
        console.error("MongoDB Connection Error ❌:", error.message);
        console.log("Tip: If you are on a college/office WiFi, try a mobile hotspot.");
        process.exit(1);
    }
};

module.exports = connectDB;