
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { db } from "../config/db.js";

export const auth = betterAuth({
  database: mongodbAdapter(db),

  user: {
    modelName: "users",

    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false,
      },

      phone: {
        type: "string",
        required: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
  },

  trustedOrigins: [
    "http://localhost:3000",
  ],
});
