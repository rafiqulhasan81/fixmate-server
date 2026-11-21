
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import { client, db } from './config/db.js';
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
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

// Verify Logged-in User
async function verifyUser(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        message: "Please login first",
      });
    }

    req.user = session.user;

    next();

  } catch (error) {
    console.error("Authentication error:", error);

    res.status(500).json({
      message: "Authentication failed",
    });
  }
}

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

// Create Booking API
app.post("/api/bookings", verifyUser, async (req, res) => {
  try {
    // 1. শুধু Customer Booking করতে পারবে
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Only customers can request a repair",
      });
    }

    // 2. Frontend থেকে প্রয়োজনীয় তথ্য গ্রহণ
    const {
      serviceId,
      phone,
      address,
      preferredDate,
      problemDescription,
    } = req.body;

    // 3. প্রয়োজনীয় তথ্য যাচাই
    if (
      !serviceId ||
      !phone?.trim() ||
      !address?.trim() ||
      !preferredDate ||
      !problemDescription?.trim()
    ) {
      return res.status(400).json({
        message: "Please provide all required information",
      });
    }

    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        message: "Invalid service ID",
      });
    }

    if (problemDescription.trim().length < 20) {
      return res.status(400).json({
        message: "Problem description must be at least 20 characters",
      });
    }

    // 4. Service-এর তথ্য MongoDB থেকে সংগ্রহ
    const service = await servicesCollection.findOne({
      _id: new ObjectId(serviceId),
      approvalStatus: "approved",
      isAvailable: true,
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found or unavailable",
      });
    }

    // 5. Technician নিজের Service নিজে Request করতে পারবে না
    if (service.technicianEmail === req.user.email) {
      return res.status(403).json({
        message: "You cannot request your own service",
      });
    }

    // 6. একই Service-এর Active Booking আছে কি না যাচাই
    const existingBooking = await bookingsCollection.findOne({
      serviceId: service._id.toString(),
      customerEmail: req.user.email,
      status: {
        $in: ["requested", "accepted", "in-progress"],
      },
    });

    if (existingBooking) {
      return res.status(409).json({
        message: "You already have an active request for this service",
      });
    }

    // 7. Booking তৈরি
    const booking = {
      serviceId: service._id.toString(),
      serviceTitle: service.title,
      serviceImage: service.image,
      category: service.category,
      basePrice: service.startingPrice,

      technicianName: service.technicianName,
      technicianEmail: service.technicianEmail,

      customerName: req.user.name,
      customerEmail: req.user.email,

      customerPhone: phone.trim(),
      address: address.trim(),
      preferredDate,
      problemDescription: problemDescription.trim(),

      status: "requested",
      paymentStatus: "unpaid",

      createdAt: new Date(),
    };

    // 8. MongoDB-তে সংরক্ষণ
    const result = await bookingsCollection.insertOne(booking);

    res.status(201).json({
      success: true,
      message: "Repair request submitted successfully",
      bookingId: result.insertedId,
    });

  } catch (error) {
    console.error("Create booking error:", error);

    res.status(500).json({
      message: "Failed to create booking",
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
