import { z } from "zod";

const userSignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(16, "Password cannot be more than 16 characters"),
  username: z
    .string()
    .min(4, "Username must be at least 4 characters")
    .max(30, "Username cannot be more than 30 characters"),
});

const emailVerificationSchema = z.object({
  code: z.string().min(6).max(6),
});

const userSignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(16, "Password cannot be more than 16 characters"),
});

export { userSignupSchema, emailVerificationSchema, userSignInSchema };
