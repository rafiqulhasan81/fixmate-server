
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import { client, db } from './config/db.js';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/auth.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(express.json());



const servicesCollection = db.collection("services");
const bookingsCollection = db.collection("bookings");

// Test Route
app.get('/', (req, res) => {
  res.send('FixMate API is running!');
});


// Featured Services API
app.get('/api/services/featured', async (req, res) => {
  try {
    const services = await servicesCollection
      .find({
        approvalStatus: "approved",
        isAvailable: true
      })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    res.status(200).json(services);

  } catch (error) {
    console.error("Featured services error:", error);

    res.status(500).json({
      message: "Failed to fetch featured services"
    });
  }
});


// Get All Approved and Available Services
app.get('/api/services', async (req, res) => {
  try {
    const services = await servicesCollection
      .find({
        approvalStatus: "approved",
        isAvailable: true
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(services);

  } catch (error) {
    console.error("All services error:", error);

    res.status(500).json({
      message: "Failed to fetch services"
    });
  }
});

// Get Single Service by ID
app.get('/api/services/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const service = await servicesCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found"
      });
    }

    res.status(200).json(service);

  } catch (error) {
    console.error("Single service error:", error);

    res.status(500).json({
      message: "Failed to fetch service"
    });
  }
});


// Start Server
async function startServer() {
  try {
    await client.connect();

    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`FixMate server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
}

startServer();
