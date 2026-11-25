
// import { betterAuth } from "better-auth";
// import { mongodbAdapter } from "@better-auth/mongo-adapter";
// import { db } from "../config/db.js";
// import { jwt } from "better-auth/plugins";

// export const auth = betterAuth({
//   database: mongodbAdapter(db),

//   user: {
//     modelName: "users",

//     additionalFields: {
//       role: {
//         type: ["customer", "technician", "admin"],
//         required: false,
//         defaultValue: "customer",
//         input: false,
//       },

//       phone: {
//         type: "string",
//         required: false,
//         input: true,
//       },
//     },
//   },

//   emailAndPassword: {
//     enabled: true,
//   },

//   trustedOrigins: ["http://localhost:3000",
//     "https://fixmate-client-flame.vercel.app",
//   ],

//     plugins: [
//     jwt({
//       jwt: {
//         definePayload: ({ user }) => ({
//           id: user.id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//         }),
//       },
//     }),
//   ],
// });



import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { db } from "../config/db.js";
import { jwt } from "better-auth/plugins";
export const auth = betterAuth({
  baseURL: "https://fixmate-server-lilac.vercel.app",

  database: mongodbAdapter(db),

  user: {
    modelName: "users",
    additionalFields: {
      role: {
        type: ["customer", "technician", "admin"],
        required: false,
        defaultValue: "customer",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
  },

  trustedOrigins: [
    "http://localhost:3000",
    "https://fixmate-client-flame.vercel.app",
  ],

  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },

  plugins: [
    jwt({
      jwt: {
        definePayload: ({ user }) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }),
      },
    }),
  ],
});
