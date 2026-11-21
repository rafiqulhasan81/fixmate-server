
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

// MongoDB Collections
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


// Get Logged-in Technician's Own Services
app.get("/api/technician/services/my", verifyUser, async (req, res) => {
  try {
    // Only Technician can access this API
    if (req.user.role !== "technician") {
      return res.status(403).json({
        message: "Only technicians can view their services",
      });
    }

    // Find services using logged-in technician's email
    const services = await servicesCollection
      .find({
        technicianEmail: req.user.email,
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Send services to frontend
    res.status(200).json({
      success: true,
      services,
    });

  } catch (error) {
    console.error("Get technician services error:", error);

    res.status(500).json({
      message: "Failed to load your services",
    });
  }
});


// Add New Service
app.post("/api/technician/services", verifyUser, async (req, res) => {
  try {
    // Only Technician can add services
    if (req.user.role !== "technician") {
      return res.status(403).json({
        message: "Only technicians can add services",
      });
    }

    // Receive data from frontend
    const {
      title,
      category,
      description,
      image,
      serviceMode,
      startingPrice,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !category ||
      !description ||
      !image ||
      !serviceMode ||
      startingPrice === undefined ||
      startingPrice === ""
    ) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    // Validate starting price
    if (
      Number(startingPrice) <= 0 ||
      !Number.isFinite(Number(startingPrice))
    ) {
      return res.status(400).json({
        message: "Please provide a valid starting price",
      });
    }

    // Create new service object
    const newService = {
      title,
      category,
      description,
      image,
      serviceMode,
      startingPrice: Number(startingPrice),

      technicianName: req.user.name,
      technicianEmail: req.user.email,

      approvalStatus: "pending",
      isAvailable: true,
      createdAt: new Date(),
    };

    // Save service in MongoDB
    const result = await servicesCollection.insertOne(newService);

    res.status(201).json({
      success: true,
      message: "Service added successfully",
      serviceId: result.insertedId,
    });

  } catch (error) {
    console.error("Add service error:", error);

    res.status(500).json({
      message: "Failed to add service",
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
    // Only Customer can create booking
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Only customers can request a repair",
      });
    }

    // Receive data from frontend
    const {
      serviceId,
      phone,
      address,
      preferredDate,
      problemDescription,
    } = req.body;

    // Validate required fields
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

    // Find approved and available service
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

    // Prevent technician from booking own service
    if (service.technicianEmail === req.user.email) {
      return res.status(403).json({
        message: "You cannot request your own service",
      });
    }

    // Check existing active booking
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

    // Create booking object
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

    // Save booking in MongoDB
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


// Get Logged-in Customer's Bookings
app.get("/api/bookings/my", verifyUser, async (req, res) => {
  try {
    // Only Customer can access this API
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Only customers can view their bookings",
      });
    }

    // Find customer's bookings
    const bookings = await bookingsCollection
      .find({
        customerEmail: req.user.email
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      bookings,
    });

  } catch (error) {
    console.error("Get bookings error:", error);

    res.status(500).json({
      message: "Failed to load bookings",
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
