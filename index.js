
// import express from 'express';
// import 'dotenv/config';
// import cors from 'cors';
// import { ObjectId } from 'mongodb';
// import { db, connectDB } from './config/db.js';
// import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
// import { auth } from "./auth/auth.js";
// import multer from "multer";

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Image upload configuration
// const upload = multer({
//   storage: multer.memoryStorage(),

//   limits: {
//     fileSize: 5 * 1024 * 1024, // Maximum 5 MB
//   },

//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith("image/")) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only image files are allowed"));
//     }
//   },
// });

// // Handle image upload errors
// const uploadServiceImage = (req, res, next) => {
//   upload.single("image")(req, res, (error) => {
//     if (error) {
//       return res.status(400).json({
//         message: error.message,
//       });
//     }

//     next();
//   });
// };


// // ================================
// // Middleware
// // ================================

// app.use(cors({
//   origin: [
//     "http://localhost:3000",
//     "https://fixmate-client.vercel.app"
//   ],
//   credentials: true,
// }));

// app.use(express.json());


// // ================================
// // Root API
// // ================================

// app.get('/', (req, res) => {
//   res.send('FixMate API is running!');
// });


// // ================================
// // Database Connection Middleware
// // ================================

// app.use(async (req, res, next) => {
//   try {
//     await connectDB();
//     next();
//   } catch (error) {
//     console.error("Database connection error:", error);

//     res.status(500).json({
//       message: "Database connection failed",
//     });
//   }
// });


// // ================================
// // Better Auth API
// // ================================

// app.all("/api/auth/{*any}", toNodeHandler(auth));


// // ================================
// // MongoDB Collections
// // ================================

// const servicesCollection = db.collection("services");
// const bookingsCollection = db.collection("bookings");
// const usersCollection = db.collection("users");
// const paymentsCollection = db.collection("payments");


// // ================================
// // Verify Logged-in User
// // ================================

// async function verifyUser(req, res, next) {
//   try {
//     const session = await auth.api.getSession({
//       headers: fromNodeHeaders(req.headers),
//     });

//     if (!session) {
//       return res.status(401).json({
//         message: "Please login first",
//       });
//     }

//     req.user = session.user;
//     next();

//   } catch (error) {
//     console.error("Authentication error:", error);

//     res.status(500).json({
//       message: "Authentication failed",
//     });
//   }
// }


// // ================================
// // Verify Admin User
// // ================================

// function verifyAdmin(req, res, next) {
//   if (!req.user) {
//     return res.status(401).json({
//       message: "Please login first",
//     });
//   }

//   if (req.user.role !== "admin") {
//     return res.status(403).json({
//       message: "Access denied. Admin only.",
//     });
//   }

//   next();
// }


// // ================================
// // Admin Dashboard Overview API
// // ================================

// app.get("/api/admin/overview", verifyUser, verifyAdmin, async (req, res) => {
//   try {
//     const totalUsers = await usersCollection.countDocuments();

//     const totalTechnicians = await usersCollection.countDocuments({
//       role: "technician",
//     });

//     const pendingServices = await servicesCollection.countDocuments({
//       approvalStatus: "pending",
//     });

//     res.status(200).json({
//       success: true,
//       stats: {
//         totalUsers,
//         totalTechnicians,
//         pendingServices,
//       },
//     });

//   } catch (error) {
//     console.error("Admin overview error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to load admin overview",
//     });
//   }
// });


// // ================================
// // Admin: Get All Users API
// // ================================

// app.get("/api/admin/users", verifyUser, verifyAdmin, async (req, res) => {
//   try {
//     const users = await usersCollection
//       .find(
//         {},
//         {
//           projection: {
//             name: 1,
//             email: 1,
//             role: 1,
//             image: 1,
//             createdAt: 1,
//           },
//         }
//       )
//       .sort({ createdAt: -1 })
//       .toArray();

//     res.status(200).json({
//       success: true,
//       users,
//     });

//   } catch (error) {
//     console.error("Admin get users error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to load users",
//     });
//   }
// });


// // ================================
// // Admin: Update User Role API
// // ================================

// app.patch("/api/admin/users/:id/role", verifyUser, verifyAdmin, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { role } = req.body;

//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid user ID",
//       });
//     }

//     if (id === req.user.id) {
//       return res.status(403).json({
//         success: false,
//         message: "You cannot change your own role",
//       });
//     }

//     const allowedRoles = ["customer", "technician", "admin"];

//     if (!allowedRoles.includes(role)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid role",
//       });
//     }

//     const result = await usersCollection.updateOne(
//       {
//         _id: new ObjectId(id),
//       },
//       {
//         $set: {
//           role,
//           updatedAt: new Date(),
//         },
//       }
//     );

//     if (result.matchedCount === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "User role updated successfully",
//     });

//   } catch (error) {
//     console.error("Admin update user role error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to update user role",
//     });
//   }
// });


// // ================================
// // Admin: Update Service Approval Status API
// // ================================

// app.patch(
//   "/api/admin/services/:id/status",
//   verifyUser,
//   verifyAdmin,
//   async (req, res) => {
//     try {
//       const { id } = req.params;
//       const { approvalStatus } = req.body;

//       if (!ObjectId.isValid(id)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid service ID",
//         });
//       }

//       if (!["approved", "rejected"].includes(approvalStatus)) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid approval status",
//         });
//       }

//       const result = await servicesCollection.updateOne(
//         { _id: new ObjectId(id) },
//         {
//           $set: {
//             approvalStatus,
//             updatedAt: new Date(),
//           },
//         }
//       );

//       if (result.matchedCount === 0) {
//         return res.status(404).json({
//           success: false,
//           message: "Service not found",
//         });
//       }

//       res.status(200).json({
//         success: true,
//         message: `Service ${approvalStatus} successfully`,
//       });

//     } catch (error) {
//       console.error("Admin update service status error:", error);

//       res.status(500).json({
//         success: false,
//         message: "Failed to update service status",
//       });
//     }
//   }
// );


// // ================================
// // Admin: Get All Services API
// // ================================

// app.get("/api/admin/services", verifyUser, verifyAdmin, async (req, res) => {
//   try {
//     const { status } = req.query;

//     const filter = {};

//     if (["pending", "approved", "rejected"].includes(status)) {
//       filter.approvalStatus = status;
//     }

//     const services = await servicesCollection
//       .find(filter)
//       .sort({
//         approvalStatus: 1,
//         createdAt: -1,
//       })
//       .toArray();

//     res.status(200).json({
//       success: true,
//       services,
//     });

//   } catch (error) {
//     console.error("Admin get services error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to load services",
//     });
//   }
// });


// // ================================
// // Admin: Get All Bookings API
// // ================================

// app.get("/api/admin/bookings", verifyUser, verifyAdmin, async (req, res) => {
//   try {
//     const bookings = await bookingsCollection
//       .find({})
//       .sort({ createdAt: -1 })
//       .toArray();

//     res.status(200).json({
//       success: true,
//       bookings,
//     });

//   } catch (error) {
//     console.error("Admin get bookings error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to load bookings",
//     });
//   }
// });


 
// // ================================
// // Admin: Get All Transactions API
// // ================================

// app.get("/api/admin/transactions", verifyUser, verifyAdmin, async (req, res) => {
//   try {
//     const transactions = await paymentsCollection
//       .find({})
//       .sort({ paymentDate: -1 })
//       .toArray();

//     const totalTransactions = transactions.length;

//     const totalRevenue = transactions.reduce(
//       (total, transaction) => total + Number(transaction.amount || 0),
//       0
//     );

//     res.status(200).json({
//       success: true,
//       totalTransactions,
//       totalRevenue,
//       transactions,
//     });

//   } catch (error) {
//     console.error("Admin get transactions error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to load transactions",
//     });
//   }
// });



// // ================================
// // Test Route
// // ================================

// app.get("/api/test-availability", (req, res) => {
//   res.json({
//     success: true,
//     message: "Availability route area is working!",
//   });
// });


// // ================================
// // Featured Services API
// // ================================

// app.get('/api/services/featured', async (req, res) => {
//   try {
//     const services = await servicesCollection.aggregate([
//       {
//         $match: {
//           approvalStatus: "approved",
//           isAvailable: true
//         }
//       },
//       {
//         $sort: {
//           createdAt: -1
//         }
//       },
//       {
//         $group: {
//           _id: "$title",
//           service: {
//             $first: "$$ROOT"
//           }
//         }
//       },
//       {
//         $replaceRoot: {
//           newRoot: "$service"
//         }
//       },
//       {
//         $sort: {
//           createdAt: -1
//         }
//       },
//       {
//         $limit: 6
//       }
//     ]).toArray();

//     res.status(200).json(services);

//   } catch (error) {
//     console.error("Featured services error:", error);

//     res.status(500).json({
//       message: "Failed to fetch featured services"
//     });
//   }
// });


// // ================================
// // Get All Approved and Available Services
// // ================================

// app.get('/api/services', async (req, res) => {
//   try {
//     const services = await servicesCollection
//       .find({
//         approvalStatus: "approved",
//         isAvailable: true
//       })
//       .sort({ createdAt: -1 })
//       .toArray();

//     res.status(200).json(services);

//   } catch (error) {
//     console.error("All services error:", error);

//     res.status(500).json({
//       message: "Failed to fetch services"
//     });
//   }
// });


// // ================================
// // Get Logged-in Technician's Own Services
// // ================================

// app.get("/api/technician/services/my", verifyUser, async (req, res) => {
//   try {
//     if (req.user.role !== "technician") {
//       return res.status(403).json({
//         message: "Only technicians can view their services",
//       });
//     }

//     const services = await servicesCollection
//       .find({
//         technicianEmail: req.user.email,
//       })
//       .sort({ createdAt: -1 })
//       .toArray();

//     res.status(200).json({
//       success: true,
//       services,
//     });

//   } catch (error) {
//     console.error("Get technician services error:", error);

//     res.status(500).json({
//       message: "Failed to load your services",
//     });
//   }
// });


// // ================================
// // Add New Service (POST)
// // ================================


// app.post(
//   "/api/technician/services",
//   verifyUser,
//   uploadServiceImage,
//   async (req, res) => {
//     try {
//       // Check technician role
//       if (req.user.role !== "technician") {
//         return res.status(403).json({
//           message: "Only technicians can add services",
//         });
//       }

//       // Check uploaded image
//       if (!req.file) {
//         return res.status(400).json({
//           message: "Please upload a service image",
//         });
//       }

//       // Check ImgBB API Key
//       if (!process.env.IMGBB_API_KEY) {
//         return res.status(500).json({
//           message: "ImgBB API Key is missing",
//         });
//       }

//       // Get form data
//       const {
//         title,
//         category,
//         description,
//         serviceMode,
//         startingPrice,
//       } = req.body;

//       // Validate required fields
//       if (
//         !title ||
//         !category ||
//         !description ||
//         !serviceMode ||
//         startingPrice === undefined ||
//         startingPrice === ""
//       ) {
//         return res.status(400).json({
//           message: "Please provide all required fields",
//         });
//       }

//       // Validate price
//       if (
//         Number(startingPrice) <= 0 ||
//         !Number.isFinite(Number(startingPrice))
//       ) {
//         return res.status(400).json({
//           message: "Please provide a valid starting price",
//         });
//       }

//       // Prepare image for ImgBB
//       const formData = new FormData();

//       formData.append(
//         "image",
//         new Blob([req.file.buffer], {
//           type: req.file.mimetype,
//         }),
//         req.file.originalname
//       );

//       // Upload image to ImgBB
//       const uploadResponse = await fetch(
//         `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
//         {
//           method: "POST",
//           body: formData,
//         }
//       );

//       let uploadData;

// try {
//   uploadData = await uploadResponse.json();
// } catch {
//   throw new Error("Invalid response from ImgBB");
// }

// if (!uploadResponse.ok || !uploadData.success) {
//   throw new Error(
//     uploadData.error?.message || "ImgBB image upload failed"
//   );
// }

//       // Get uploaded image URL
//       const imageUrl = uploadData.data.url;

//       // Prepare service document
//       const newService = {
//         title,
//         category,
//         description,
//         image: imageUrl,
//         serviceMode,
//         startingPrice: Number(startingPrice),

//         technicianName: req.user.name,
//         technicianEmail: req.user.email,

//         approvalStatus: "pending",
//         isAvailable: true,
//         createdAt: new Date(),
//       };

//       // Save service in MongoDB
//       const result = await servicesCollection.insertOne(newService);

//       res.status(201).json({
//         success: true,
//         message: "Service added successfully",
//         serviceId: result.insertedId,
//         image: imageUrl,
//       });

//     } catch (error) {
//       console.error("Add service error:", error);

//       res.status(500).json({
//         message: error.message || "Failed to add service",
//       });
//     }
//   }
// );



// // ================================
// // Delete Technician's Own Service (DELETE)
// // ================================

// app.delete("/api/technician/services/:id", verifyUser, async (req, res) => {
//   try {
//     if (req.user.role !== "technician") {
//       return res.status(403).json({
//         message: "Only technicians can delete services",
//       });
//     }

//     const { id } = req.params;

//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({
//         message: "Invalid service ID",
//       });
//     }

//     const result = await servicesCollection.deleteOne({
//       _id: new ObjectId(id),
//       technicianEmail: req.user.email,
//     });

//     if (result.deletedCount === 0) {
//       return res.status(404).json({
//         message: "Service not found or you are not authorized",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Service deleted successfully",
//     });

//   } catch (error) {
//     console.error("Delete service error:", error);

//     res.status(500).json({
//       message: "Failed to delete service",
//     });
//   }
// });


// // ================================
// // Toggle Technician Service Availability (PATCH)
// // ================================

// app.patch("/api/technician/services/:id/availability", verifyUser, async (req, res) => {
//   try {
//     if (req.user.role !== "technician") {
//       return res.status(403).json({
//         message: "Only technicians can update availability",
//       });
//     }

//     const { id } = req.params;
//     const { isAvailable } = req.body;

//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({
//         message: "Invalid service ID",
//       });
//     }

//     if (typeof isAvailable !== "boolean") {
//       return res.status(400).json({
//         message: "Availability must be true or false",
//       });
//     }

//     const result = await servicesCollection.updateOne(
//       {
//         _id: new ObjectId(id),
//         technicianEmail: req.user.email,
//       },
//       {
//         $set: {
//           isAvailable,
//           updatedAt: new Date(),
//         },
//       }
//     );

//     if (result.matchedCount === 0) {
//       return res.status(404).json({
//         message: "Service not found or you are not authorized",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Availability updated successfully",
//     });

//   } catch (error) {
//     console.error("Availability update error:", error);

//     res.status(500).json({
//       message: "Failed to update availability",
//     });
//   }
// });


// // ================================
// // Get Single Service by ID
// // ================================

// app.get('/api/services/:id', async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({
//         message: "Invalid service ID"
//       });
//     }

//     const service = await servicesCollection.findOne({
//       _id: new ObjectId(id)
//     });

//     if (!service) {
//       return res.status(404).json({
//         message: "Service not found"
//       });
//     }

//     res.status(200).json(service);

//   } catch (error) {
//     console.error("Single service error:", error);

//     res.status(500).json({
//       message: "Failed to fetch service"
//     });
//   }
// });


// // ================================
// // Create Booking API
// // ================================

// app.post("/api/bookings", verifyUser, async (req, res) => {
//   try {
//     if (req.user.role !== "customer") {
//       return res.status(403).json({
//         message: "Only customers can request a repair",
//       });
//     }

//     const {
//       serviceId,
//       phone,
//       address,
//       preferredDate,
//       problemDescription,
//     } = req.body;

//     if (
//       !serviceId ||
//       !phone?.trim() ||
//       !address?.trim() ||
//       !preferredDate ||
//       !problemDescription?.trim()
//     ) {
//       return res.status(400).json({
//         message: "Please provide all required information",
//       });
//     }

//     if (!ObjectId.isValid(serviceId)) {
//       return res.status(400).json({
//         message: "Invalid service ID",
//       });
//     }

//     if (problemDescription.trim().length < 20) {
//       return res.status(400).json({
//         message: "Problem description must be at least 20 characters",
//       });
//     }

//     const service = await servicesCollection.findOne({
//       _id: new ObjectId(serviceId),
//       approvalStatus: "approved",
//       isAvailable: true,
//     });

//     if (!service) {
//       return res.status(404).json({
//         message: "Service not found or unavailable",
//       });
//     }

//     if (service.technicianEmail === req.user.email) {
//       return res.status(403).json({
//         message: "You cannot request your own service",
//       });
//     }

//     const existingBooking = await bookingsCollection.findOne({
//       serviceId: service._id.toString(),
//       customerEmail: req.user.email,
//       status: {
//         $in: ["requested", "accepted", "in-progress"],
//       },
//     });

//     if (existingBooking) {
//       return res.status(409).json({
//         message: "You already have an active request for this service",
//       });
//     }

//     const booking = {
//       serviceId: service._id.toString(),
//       serviceTitle: service.title,
//       serviceImage: service.image,
//       category: service.category,
//       basePrice: service.startingPrice,

//       technicianName: service.technicianName,
//       technicianEmail: service.technicianEmail,

//       customerName: req.user.name,
//       customerEmail: req.user.email,

//       customerPhone: phone.trim(),
//       address: address.trim(),
//       preferredDate,
//       problemDescription: problemDescription.trim(),

//       status: "requested",
//       paymentStatus: "unpaid",

//       createdAt: new Date(),
//     };

//     const result = await bookingsCollection.insertOne(booking);

//     res.status(201).json({
//       success: true,
//       message: "Repair request submitted successfully",
//       bookingId: result.insertedId,
//     });

//   } catch (error) {
//     console.error("Create booking error:", error);

//     res.status(500).json({
//       message: "Failed to create booking",
//     });
//   }
// });


// // ================================
// // Get Technician's Service Requests
// // ================================

// app.get("/api/technician/bookings/requests", verifyUser, async (req, res) => {
//   try {
//     if (req.user.role !== "technician") {
//       return res.status(403).json({
//         message: "Only technicians can view service requests",
//       });
//     }

//     const bookings = await bookingsCollection
//       .find({
//         technicianEmail: req.user.email,
//       })
//       .sort({ createdAt: -1 })
//       .toArray();

//     res.status(200).json({
//       success: true,
//       bookings,
//     });

//   } catch (error) {
//     console.error("Technician service requests error:", error);

//     res.status(500).json({
//       message: "Failed to load service requests",
//     });
//   }
// });


// // ================================
// // Update Technician Booking Status
// // ================================

// app.patch("/api/technician/bookings/:id/status", verifyUser, async (req, res) => {
//   try {
//     if (req.user.role !== "technician") {
//       return res.status(403).json({
//         message: "Only technicians can update booking status",
//       });
//     }

//     const { id } = req.params;
//     const { status } = req.body;

//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({
//         message: "Invalid booking ID",
//       });
//     }

//     const booking = await bookingsCollection.findOne({
//       _id: new ObjectId(id),
//       technicianEmail: req.user.email,
//     });

//     if (!booking) {
//       return res.status(404).json({
//         message: "Booking not found or you are not authorized",
//       });
//     }

//     const allowedTransitions = {
//       requested: ["accepted", "rejected"],
//       accepted: ["in-progress"],
//       "in-progress": ["completed"],
//     };

//     if (!allowedTransitions[booking.status]?.includes(status)) {
//       return res.status(400).json({
//         message: "This status transition is not allowed",
//       });
//     }

//     const result = await bookingsCollection.updateOne(
//       {
//         _id: new ObjectId(id),
//         technicianEmail: req.user.email,
//         status: booking.status,
//       },
//       {
//         $set: {
//           status,
//           updatedAt: new Date(),
//         },
//       }
//     );

//     if (result.modifiedCount === 0) {
//       return res.status(409).json({
//         message: "Booking status has already changed",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Booking status updated successfully",
//       status,
//     });

//   } catch (error) {
//     console.error("Booking status update error:", error);

//     res.status(500).json({
//       message: "Failed to update booking status",
//     });
//   }
// });


// // ================================
// // Update Final Amount
// // ================================

// app.patch("/api/technician/bookings/:id/final-amount", verifyUser, async (req, res) => {
//   try {
//     if (req.user.role !== "technician") {
//       return res.status(403).json({
//         message: "Only technicians can update final amount",
//       });
//     }

//     const { id } = req.params;
//     const { finalAmount } = req.body;

//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({
//         message: "Invalid booking ID",
//       });
//     }

//     if (
//       typeof finalAmount !== "number" ||
//       !Number.isFinite(finalAmount) ||
//       finalAmount <= 0
//     ) {
//       return res.status(400).json({
//         message: "Please provide a valid final amount",
//       });
//     }

//     const result = await bookingsCollection.updateOne(
//       {
//         _id: new ObjectId(id),
//         technicianEmail: req.user.email,
//         status: "completed",
//       },
//       {
//         $set: {
//           finalAmount,
//           updatedAt: new Date(),
//         },
//       }
//     );

//     if (result.matchedCount === 0) {
//       return res.status(404).json({
//         message: "Completed booking not found or you are not authorized",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Final amount updated successfully",
//     });

//   } catch (error) {
//     console.error("Final amount update error:", error);

//     res.status(500).json({
//       message: "Failed to update final amount",
//     });
//   }
// });


// // ================================
// // Update Payment Status + Create Transaction
// // ================================

// app.patch("/api/technician/bookings/:id/payment-status", verifyUser, async (req, res) => {
//   try {
//     if (req.user.role !== "technician") {
//       return res.status(403).json({
//         message: "Only technicians can update payment status",
//       });
//     }

//     const { id } = req.params;
//     const { paymentStatus } = req.body;

//     if (!ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid booking ID",
//       });
//     }

//     if (paymentStatus !== "paid") {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payment status",
//       });
//     }

//     // Step 1: Mark the eligible unpaid booking as paid
//     const result = await bookingsCollection.updateOne(
//       {
//         _id: new ObjectId(id),
//         technicianEmail: req.user.email,
//         status: "completed",
//         paymentStatus: "unpaid",
//         finalAmount: { $gt: 0 },
//       },
//       {
//         $set: {
//           paymentStatus: "paid",
//           updatedAt: new Date(),
//         },
//       }
//     );

//     if (result.modifiedCount === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Booking not found, already paid, or not eligible for payment",
//       });
//     }

//     try {
//       // Step 2: Get booking details
//       const booking = await bookingsCollection.findOne({
//         _id: new ObjectId(id),
//         technicianEmail: req.user.email,
//         paymentStatus: "paid",
//       });

//       if (!booking) {
//         throw new Error("Booking details not found");
//       }

//       // Step 3: Create transaction record
//       const transaction = {
//         bookingId: id,
//         transactionId: `FIX-${new ObjectId().toString().toUpperCase()}`,

//         serviceTitle: booking.serviceTitle,
//         category: booking.category,

//         customerName: booking.customerName,
//         customerEmail: booking.customerEmail,

//         technicianName: booking.technicianName,
//         technicianEmail: booking.technicianEmail,

//         amount: booking.finalAmount,
//         paymentStatus: "paid",

//         paymentDate: new Date(),
//         createdAt: new Date(),
//       };

//       await paymentsCollection.insertOne(transaction);

//     } catch (transactionError) {
//       // Step 4: Roll back booking status if transaction creation fails
//       await bookingsCollection.updateOne(
//         {
//           _id: new ObjectId(id),
//           technicianEmail: req.user.email,
//           paymentStatus: "paid",
//         },
//         {
//           $set: {
//             paymentStatus: "unpaid",
//             updatedAt: new Date(),
//           },
//         }
//       );

//       throw transactionError;
//     }

//     res.status(200).json({
//       success: true,
//       message: "Payment updated and transaction created successfully",
//     });

//   } catch (error) {
//     console.error("Payment status update error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to update payment status",
//     });
//   }
// });


// // ================================
// // Get Logged-in Customer's Bookings
// // ================================

// app.get("/api/bookings/my", verifyUser, async (req, res) => {
//   try {
//     if (req.user.role !== "customer") {
//       return res.status(403).json({
//         message: "Only customers can view their bookings",
//       });
//     }

//     const bookings = await bookingsCollection
//       .find({
//         customerEmail: req.user.email
//       })
//       .sort({ createdAt: -1 })
//       .toArray();

//     res.status(200).json({
//       success: true,
//       bookings,
//     });

//   } catch (error) {
//     console.error("Get bookings error:", error);

//     res.status(500).json({
//       message: "Failed to load bookings",
//     });
//   }
// });


// // ================================
// // Start Server
// // ================================

// if (!process.env.VERCEL) {
//   connectDB()
//     .then(() => {
//       console.log("MongoDB Connected Successfully!");

//       app.listen(PORT, () => {
//         console.log(`FixMate server running on port ${PORT}`);
//       });
//     })
//     .catch((error) => {
//       console.error("MongoDB Connection Failed:", error);
//     });
// }

// export default app;


import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import { db, connectDB } from './config/db.js';
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth/auth.js";
import multer from "multer";

const app = express();
const PORT = process.env.PORT || 5000;

// Image upload configuration
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Handle image upload errors
const uploadServiceImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    next();
  });
};


// ================================
// Middleware
// ================================

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://fixmate-client-flame.vercel.app"
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
const usersCollection = db.collection("users");
const paymentsCollection = db.collection("payments");


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
// Verify Admin User
// ================================

function verifyAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: "Please login first",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin only.",
    });
  }

  next();
}


// ================================
// Admin Dashboard Overview API
// ================================

app.get("/api/admin/overview", verifyUser, verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await usersCollection.countDocuments();

    const totalTechnicians = await usersCollection.countDocuments({
      role: "technician",
    });

    const pendingServices = await servicesCollection.countDocuments({
      approvalStatus: "pending",
    });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalTechnicians,
        pendingServices,
      },
    });

  } catch (error) {
    console.error("Admin overview error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load admin overview",
    });
  }
});


// ================================
// Admin: Get All Users API
// ================================

app.get("/api/admin/users", verifyUser, verifyAdmin, async (req, res) => {
  try {
    const users = await usersCollection
      .find(
        {},
        {
          projection: {
            name: 1,
            email: 1,
            role: 1,
            image: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      users,
    });

  } catch (error) {
    console.error("Admin get users error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load users",
    });
  }
});


// ================================
// Admin: Update User Role API
// ================================

app.patch("/api/admin/users/:id/role", verifyUser, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (id === req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    const allowedRoles = ["customer", "technician", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const result = await usersCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          role,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
    });

  } catch (error) {
    console.error("Admin update user role error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update user role",
    });
  }
});


// ================================
// Admin: Update Service Approval Status API
// ================================

app.patch(
  "/api/admin/services/:id/status",
  verifyUser,
  verifyAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { approvalStatus } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid service ID",
        });
      }

      if (!["approved", "rejected"].includes(approvalStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid approval status",
        });
      }

      const result = await servicesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            approvalStatus,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      res.status(200).json({
        success: true,
        message: `Service ${approvalStatus} successfully`,
      });

    } catch (error) {
      console.error("Admin update service status error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to update service status",
      });
    }
  }
);


// ================================
// Admin: Get All Services API
// ================================

app.get("/api/admin/services", verifyUser, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (["pending", "approved", "rejected"].includes(status)) {
      filter.approvalStatus = status;
    }

    const services = await servicesCollection
      .find(filter)
      .sort({
        approvalStatus: 1,
        createdAt: -1,
      })
      .toArray();

    res.status(200).json({
      success: true,
      services,
    });

  } catch (error) {
    console.error("Admin get services error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load services",
    });
  }
});


// ================================
// Admin: Get All Bookings API
// ================================

app.get("/api/admin/bookings", verifyUser, verifyAdmin, async (req, res) => {
  try {
    const bookings = await bookingsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      bookings,
    });

  } catch (error) {
    console.error("Admin get bookings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load bookings",
    });
  }
});


// ================================
// Admin: Get All Transactions API
// ================================

app.get("/api/admin/transactions", verifyUser, verifyAdmin, async (req, res) => {
  try {
    const transactions = await paymentsCollection
      .find({})
      .sort({ paymentDate: -1 })
      .toArray();

    const totalTransactions = transactions.length;

    const totalRevenue = transactions.reduce(
      (total, transaction) => total + Number(transaction.amount || 0),
      0
    );

    res.status(200).json({
      success: true,
      totalTransactions,
      totalRevenue,
      transactions,
    });

  } catch (error) {
    console.error("Admin get transactions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load transactions",
    });
  }
});

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
    const services = await servicesCollection.aggregate([
      {
        $match: {
          approvalStatus: "approved",
          isAvailable: true
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $group: {
          _id: "$title",
          service: {
            $first: "$$ROOT"
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: "$service"
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $limit: 6
      }
    ]).toArray();

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



// ================================
// Get All Approved Services
// Server-Side Search, Filter & Sort
// ================================

app.get("/api/services", async (req, res) => {
  try {
    // Step 1: URL থেকে query parameters সংগ্রহ
    const {
      search = "",
      category = "",
      serviceMode = "",
      sort = "newest",
    } = req.query;

    // Step 2: MongoDB filter তৈরি
    const filter = {
      approvalStatus: "approved",
      isAvailable: true,
    };

    // Step 3: Search by title or category
    if (typeof search === "string" && search.trim()) {
      const safeSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const searchRegex = new RegExp(safeSearch, "i");

      filter.$or = [
        { title: searchRegex },
        { category: searchRegex },
      ];
    }

    // Step 4: Category filter
    if (typeof category === "string" && category.trim()) {
      const safeCategory = category.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.category = new RegExp(`^${safeCategory}$`, "i");
    }

    // Step 5: Service mode filter
    if (typeof serviceMode === "string" && serviceMode.trim()) {
      const safeMode = serviceMode.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.serviceMode = new RegExp(`^${safeMode}$`, "i");
    }

    // Step 6: Sort options
    let sortOption = { createdAt: -1 };

    if (sort === "price-low") {
      sortOption = { startingPrice: 1 };
    } else if (sort === "price-high") {
      sortOption = { startingPrice: -1 };
    } else if (sort === "newest") {
      sortOption = { createdAt: -1 };
    }

    // Step 7: MongoDB-তে Search, Filter ও Sort
    const services = await servicesCollection
      .find(filter)
      .sort(sortOption)
      .toArray();

    // Step 8: Response পাঠানো
    res.status(200).json({
      success: true,
      services,
    });

  } catch (error) {
    console.error("Search and filter services error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch services",
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

app.post(
  "/api/technician/services",
  verifyUser,
  uploadServiceImage,
  async (req, res) => {
    try {
      // Check technician role
      if (req.user.role !== "technician") {
        return res.status(403).json({
          message: "Only technicians can add services",
        });
      }

      // Check uploaded image
      if (!req.file) {
        return res.status(400).json({
          message: "Please upload a service image",
        });
      }

      // Check ImgBB API Key
      if (!process.env.IMGBB_API_KEY) {
        return res.status(500).json({
          message: "ImgBB API Key is missing",
        });
      }

      // Get form data
      const {
        title,
        category,
        description,
        serviceMode,
        startingPrice,
      } = req.body;

      // Validate required fields
      if (
        !title ||
        !category ||
        !description ||
        !serviceMode ||
        startingPrice === undefined ||
        startingPrice === ""
      ) {
        return res.status(400).json({
          message: "Please provide all required fields",
        });
      }

      // Validate price
      if (
        Number(startingPrice) <= 0 ||
        !Number.isFinite(Number(startingPrice))
      ) {
        return res.status(400).json({
          message: "Please provide a valid starting price",
        });
      }

      // Prepare image for ImgBB
      const formData = new FormData();

      formData.append(
        "image",
        new Blob([req.file.buffer], {
          type: req.file.mimetype,
        }),
        req.file.originalname
      );

      // Upload image to ImgBB
      const uploadResponse = await fetch(
        `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
        {
          method: "POST",
          body: formData,
        }
      );

      let uploadData;

      try {
        uploadData = await uploadResponse.json();
      } catch {
        throw new Error("Invalid response from ImgBB");
      }

      if (!uploadResponse.ok || !uploadData.success) {
        throw new Error(
          uploadData.error?.message || "ImgBB image upload failed"
        );
      }

      // Get uploaded image URL
      const imageUrl = uploadData.data.url;

      // Prepare service document
      const newService = {
        title,
        category,
        description,
        image: imageUrl,
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
        image: imageUrl,
      });

    } catch (error) {
      console.error("Add service error:", error);

      res.status(500).json({
        message: error.message || "Failed to add service",
      });
    }
  }
);
// ================================
// Update Technician's Own Service (PUT)
// ================================

app.put(
  "/api/technician/services/:id",
  verifyUser,
  uploadServiceImage,
  async (req, res) => {
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

      const existingService = await servicesCollection.findOne({
        _id: new ObjectId(id),
        technicianEmail: req.user.email,
      });

      if (!existingService) {
        return res.status(404).json({
          message: "Service not found or you are not authorized",
        });
      }

      const {
        title,
        category,
        description,
        serviceMode,
        startingPrice,
      } = req.body;

      if (
        !title?.trim() ||
        !category?.trim() ||
        !description?.trim() ||
        !serviceMode?.trim() ||
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

      // নতুন ছবি না দিলে পুরোনো ছবির URL থাকবে
      let imageUrl = existingService.image;

      // নতুন ছবি দিলে ImgBB-তে আপলোড হবে
      if (req.file) {
        if (!process.env.IMGBB_API_KEY) {
          return res.status(500).json({
            message: "ImgBB API Key is missing",
          });
        }

        const formData = new FormData();

        formData.append(
          "image",
          new Blob([req.file.buffer], {
            type: req.file.mimetype,
          }),
          req.file.originalname
        );

        const uploadResponse = await fetch(
          `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
          {
            method: "POST",
            body: formData,
          }
        );

        let uploadData;

        try {
          uploadData = await uploadResponse.json();
        } catch {
          throw new Error("Invalid response from ImgBB");
        }

        if (!uploadResponse.ok || !uploadData.success) {
          throw new Error(
            uploadData.error?.message || "ImgBB image upload failed"
          );
        }

        imageUrl = uploadData.data.url;
      }

      const result = await servicesCollection.updateOne(
        {
          _id: new ObjectId(id),
          technicianEmail: req.user.email,
        },
        {
          $set: {
            title: title.trim(),
            category: category.trim(),
            description: description.trim(),
            image: imageUrl,
            serviceMode: serviceMode.trim(),
            startingPrice: Number(startingPrice),
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
        message: "Service updated successfully",
        image: imageUrl,
      });

    } catch (error) {
      console.error("Update service error:", error);

      res.status(500).json({
        message: error.message || "Failed to update service",
      });
    }
  }
);

// ================================
// Update Technician's Own Service (PUT)
// ================================

app.put(
  "/api/technician/services/:id",
  verifyUser,
  uploadServiceImage,
  async (req, res) => {
    try {
      // Check technician role
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

      // Find service owned by logged-in technician
      const existingService = await servicesCollection.findOne({
        _id: new ObjectId(id),
        technicianEmail: req.user.email,
      });

      if (!existingService) {
        return res.status(404).json({
          message: "Service not found or you are not authorized",
        });
      }

      const {
        title,
        category,
        description,
        serviceMode,
        startingPrice,
      } = req.body;

      // Validate required fields
      if (
        !title?.trim() ||
        !category ||
        !description?.trim() ||
        !serviceMode ||
        startingPrice === undefined ||
        startingPrice === ""
      ) {
        return res.status(400).json({
          message: "Please provide all required fields",
        });
      }

      // Validate price
      if (
        Number(startingPrice) <= 0 ||
        !Number.isFinite(Number(startingPrice))
      ) {
        return res.status(400).json({
          message: "Please provide a valid starting price",
        });
      }

      // Keep existing image unless a new image is uploaded
      let imageUrl = existingService.image;

      if (req.file) {
        if (!process.env.IMGBB_API_KEY) {
          return res.status(500).json({
            message: "ImgBB API Key is missing",
          });
        }

        const formData = new FormData();

        formData.append(
          "image",
          new Blob([req.file.buffer], {
            type: req.file.mimetype,
          }),
          req.file.originalname
        );

        const uploadResponse = await fetch(
          `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
          {
            method: "POST",
            body: formData,
          }
        );

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadData.success) {
          throw new Error(
            uploadData.error?.message || "ImgBB image upload failed"
          );
        }

        imageUrl = uploadData.data.url;
      }

      // Update service in MongoDB
      await servicesCollection.updateOne(
        {
          _id: new ObjectId(id),
          technicianEmail: req.user.email,
        },
        {
          $set: {
            title: title.trim(),
            category,
            description: description.trim(),
            image: imageUrl,
            serviceMode,
            startingPrice: Number(startingPrice),

            // Edited service requires admin approval again
            approvalStatus: "pending",

            updatedAt: new Date(),
          },
        }
      );

      res.status(200).json({
        success: true,
        message: "Service updated successfully",
        image: imageUrl,
      });

    } catch (error) {
      console.error("Update service error:", error);

      res.status(500).json({
        message: error.message || "Failed to update service",
      });
    }
  }
);


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
// Update Payment Status + Create Transaction
// ================================

app.patch("/api/technician/bookings/:id/payment-status", verifyUser, async (req, res) => {
  try {
    if (req.user.role !== "technician") {
      return res.status(403).json({
        message: "Only technicians can update payment status",
      });
    }

    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    if (paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    // Step 1: Mark the eligible unpaid booking as paid
    const result = await bookingsCollection.updateOne(
      {
        _id: new ObjectId(id),
        technicianEmail: req.user.email,
        status: "completed",
        paymentStatus: "unpaid",
        finalAmount: { $gt: 0 },
      },
      {
        $set: {
          paymentStatus: "paid",
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found, already paid, or not eligible for payment",
      });
    }

    try {
      // Step 2: Get booking details
      const booking = await bookingsCollection.findOne({
        _id: new ObjectId(id),
        technicianEmail: req.user.email,
        paymentStatus: "paid",
      });

      if (!booking) {
        throw new Error("Booking details not found");
      }

      // Step 3: Create transaction record
      const transaction = {
        bookingId: id,
        transactionId: `FIX-${new ObjectId().toString().toUpperCase()}`,

        serviceTitle: booking.serviceTitle,
        category: booking.category,

        customerName: booking.customerName,
        customerEmail: booking.customerEmail,

        technicianName: booking.technicianName,
        technicianEmail: booking.technicianEmail,

        amount: booking.finalAmount,
        paymentStatus: "paid",

        paymentDate: new Date(),
        createdAt: new Date(),
      };

      await paymentsCollection.insertOne(transaction);

    } catch (transactionError) {
      // Step 4: Roll back booking status if transaction creation fails
      await bookingsCollection.updateOne(
        {
          _id: new ObjectId(id),
          technicianEmail: req.user.email,
          paymentStatus: "paid",
        },
        {
          $set: {
            paymentStatus: "unpaid",
            updatedAt: new Date(),
          },
        }
      );

      throw transactionError;
    }

    res.status(200).json({
      success: true,
      message: "Payment updated and transaction created successfully",
    });

  } catch (error) {
    console.error("Payment status update error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update payment status",
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