
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import { db, connectDB } from './config/db.js';
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth/auth.js";

const app = express();
const PORT = process.env.PORT || 5000;


// ================================
// Middleware
// ================================

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://fixmate-client.vercel.app"
  ],
  credentials: true,
}));

app.use(express.json());


// ================================
// Root API
// ================================

app.get('/', (req, res) => {
  res.send('FixMate API is running!');
});


// ================================
// Database Connection Middleware
// ================================

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});


// ================================
// Better Auth API
// ================================

app.all("/api/auth/{*any}", toNodeHandler(auth));


// ================================
// MongoDB Collections
// ================================

const servicesCollection = db.collection("services");
const bookingsCollection = db.collection("bookings");


// ================================
// Verify Logged-in User
// ================================

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


// ================================
// Test Route
// ================================

app.get("/api/test-availability", (req, res) => {
  res.json({
    success: true,
    message: "Availability route area is working!",
  });
});


// ================================
// Featured Services API
// ================================

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


// ================================
// Get All Approved and Available Services
// ================================

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


// ================================
// Get Logged-in Technician's Own Services
// ================================

app.get("/api/technician/services/my", verifyUser, async (req, res) => {
  try {
    if (req.user.role !== "technician") {
      return res.status(403).json({
        message: "Only technicians can view their services",
      });
    }

    const services = await servicesCollection
      .find({
        technicianEmail: req.user.email,
      })
      .sort({ createdAt: -1 })
      .toArray();

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


// ================================
// Add New Service (POST)
// ================================

app.post("/api/technician/services", verifyUser, async (req, res) => {
  try {
    if (req.user.role !== "technician") {
      return res.status(403).json({
        message: "Only technicians can add services",
      });
    }

    const {
      title,
      category,
      description,
      image,
      serviceMode,
      startingPrice,
    } = req.body;

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

    if (
      Number(startingPrice) <= 0 ||
      !Number.isFinite(Number(startingPrice))
    ) {
      return res.status(400).json({
        message: "Please provide a valid starting price",
      });
    }

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


// ================================
// Update Technician's Own Service (PUT)
// ================================

app.put("/api/technician/services/:id", verifyUser, async (req, res) => {
  try {
    if (req.user.role !== "technician") {
      return res.status(403).json({
        message: "Only technicians can update services",
      });
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid service ID",
      });
    }

    const {
      title,
      category,
      description,
      image,
      serviceMode,
      startingPrice,
    } = req.body;

    if (
      !title?.trim() ||
      !category ||
      !description?.trim() ||
      !image?.trim() ||
      !serviceMode ||
      startingPrice === undefined ||
      startingPrice === ""
    ) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    if (
      !Number.isFinite(Number(startingPrice)) ||
      Number(startingPrice) <= 0
    ) {
      return res.status(400).json({
        message: "Please provide a valid starting price",
      });
    }

    console.log("EDIT SERVICE API CALLED");
    console.log("Service ID:", id);
    console.log("Technician:", req.user.email);

    const result = await servicesCollection.updateOne(
      {
        _id: new ObjectId(id),
        technicianEmail: req.user.email,
      },
      {
        $set: {
          title: title.trim(),
          category,
          description: description.trim(),
          image: image.trim(),
          serviceMode,
          startingPrice: Number(startingPrice),

          // Edited service must be approved again by Admin
          approvalStatus: "pending",

          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Service not found or you are not authorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Service updated successfully. Waiting for admin approval.",
    });

  } catch (error) {
    console.error("Update service error:", error);

    res.status(500).json({
      message: "Failed to update service",
    });
  }
});


// ================================
// Delete Technician's Own Service (DELETE)
// ================================

app.delete("/api/technician/services/:id", verifyUser, async (req, res) => {
  try {
    if (req.user.role !== "technician") {
      return res.status(403).json({
        message: "Only technicians can delete services",
      });
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid service ID",
      });
    }

    const result = await servicesCollection.deleteOne({
      _id: new ObjectId(id),
      technicianEmail: req.user.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Service not found or you are not authorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });

  } catch (error) {
    console.error("Delete service error:", error);

    res.status(500).json({
      message: "Failed to delete service",
    });
  }
});


// ================================
// Toggle Technician Service Availability (PATCH)
// ================================

app.patch("/api/technician/services/:id/availability", verifyUser, async (req, res) => {
  try {
    if (req.user.role !== "technician") {
      return res.status(403).json({
        message: "Only technicians can update availability",
      });
    }

    const { id } = req.params;
    const { isAvailable } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid service ID",
      });
    }

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        message: "Availability must be true or false",
      });
    }

    const result = await servicesCollection.updateOne(
      {
        _id: new ObjectId(id),
        technicianEmail: req.user.email,
      },
      {
        $set: {
          isAvailable,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Service not found or you are not authorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Availability updated successfully",
    });

  } catch (error) {
    console.error("Availability update error:", error);

    res.status(500).json({
      message: "Failed to update availability",
    });
  }
});


// ================================
// Get Single Service by ID
// ================================

app.get('/api/services/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid service ID"
      });
    }

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


// ================================
// Create Booking API
// ================================

app.post("/api/bookings", verifyUser, async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Only customers can request a repair",
      });
    }

    const {
      serviceId,
      phone,
      address,
      preferredDate,
      problemDescription,
    } = req.body;

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

    if (service.technicianEmail === req.user.email) {
      return res.status(403).json({
        message: "You cannot request your own service",
      });
    }

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


// ================================
// Get Technician's Service Requests
// ================================

app.get("/api/technician/bookings/requests", verifyUser, async (req, res) => {
  try {
    if (req.user.role !== "technician") {
      return res.status(403).json({
        message: "Only technicians can view service requests",
      });
    }

    const bookings = await bookingsCollection
      .find({
        technicianEmail: req.user.email,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      bookings,
    });

  } catch (error) {
    console.error("Technician service requests error:", error);

    res.status(500).json({
      message: "Failed to load service requests",
    });
  }
});


// ================================
// Update Technician Booking Status
// ================================

app.patch("/api/technician/bookings/:id/status", verifyUser, async (req, res) => {
  try {
    if (req.user.role !== "technician") {
      return res.status(403).json({
        message: "Only technicians can update booking status",
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    const booking = await bookingsCollection.findOne({
      _id: new ObjectId(id),
      technicianEmail: req.user.email,
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found or you are not authorized",
      });
    }

    const allowedTransitions = {
      requested: ["accepted", "rejected"],
      accepted: ["in-progress"],
      "in-progress": ["completed"],
    };

    if (!allowedTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({
        message: "This status transition is not allowed",
      });
    }

    const result = await bookingsCollection.updateOne(
      {
        _id: new ObjectId(id),
        technicianEmail: req.user.email,
        status: booking.status,
      },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(409).json({
        message: "Booking status has already changed",
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      status,
    });

  } catch (error) {
    console.error("Booking status update error:", error);

    res.status(500).json({
      message: "Failed to update booking status",
    });
  }
});

// ================================
// Update Final Amount
// ================================

app.patch("/api/technician/bookings/:id/final-amount", verifyUser, async (req, res) => {
  try {
    if (req.user.role !== "technician") {
      return res.status(403).json({
        message: "Only technicians can update final amount",
      });
    }

    const { id } = req.params;
    const { finalAmount } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    if (
      typeof finalAmount !== "number" ||
      !Number.isFinite(finalAmount) ||
      finalAmount <= 0
    ) {
      return res.status(400).json({
        message: "Please provide a valid final amount",
      });
    }

    const result = await bookingsCollection.updateOne(
      {
        _id: new ObjectId(id),
        technicianEmail: req.user.email,
        status: "completed",
      },
      {
        $set: {
          finalAmount,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Completed booking not found or you are not authorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Final amount updated successfully",
    });

  } catch (error) {
    console.error("Final amount update error:", error);

    res.status(500).json({
      message: "Failed to update final amount",
    });
  }
});

// ================================
// Update Final Amount
// ================================

app.patch("/api/technician/bookings/:id/final-amount", verifyUser, async (req, res) => {
  try {
    if (req.user.role !== "technician") {
      return res.status(403).json({
        message: "Only technicians can update final amount",
      });
    }

    const { id } = req.params;
    const { finalAmount } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    if (
      typeof finalAmount !== "number" ||
      !Number.isFinite(finalAmount) ||
      finalAmount <= 0
    ) {
      return res.status(400).json({
        message: "Please provide a valid final amount",
      });
    }

    const result = await bookingsCollection.updateOne(
      {
        _id: new ObjectId(id),
        technicianEmail: req.user.email,
        status: "completed",
      },
      {
        $set: {
          finalAmount,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Completed booking not found or you are not authorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Final amount updated successfully",
    });

  } catch (error) {
    console.error("Final amount update error:", error);

    res.status(500).json({
      message: "Failed to update final amount",
    });
  }
});


// ================================
// Get Logged-in Customer's Bookings
// ================================

app.get("/api/bookings/my", verifyUser, async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Only customers can view their bookings",
      });
    }

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


// ================================
// Start Server
// ================================

if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      console.log("MongoDB Connected Successfully!");

      app.listen(PORT, () => {
        console.log(`FixMate server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("MongoDB Connection Failed:", error);
    });
}

export default app;
