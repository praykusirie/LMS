import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { admin } from "better-auth/plugins";
import { sendEmail } from "./email.js";

export const auth = betterAuth({
    database: new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_SERVER,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
        options: '-c timezone=Africa/Nairobi',
    }),

    emailAndPassword: {    
        enabled: true,
        sendResetPassword: async ({ user, url, token }, request) => {
            void sendEmail({
                to: user.email,
                subject: "Reset your password — ShulePro LMS",
                html: `
                    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                        <h2 style="color:#1e293b">Password Reset</h2>
                        <p>Hi ${user.name},</p>
                        <p>We received a request to reset your password. Click the button below to set a new one:</p>
                        <a href="${url}" style="display:inline-block;background:#1e3a5f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">Reset Password</a>
                        <p style="color:#64748b;font-size:13px">If you didn't request this, you can safely ignore this email. The link expires in 1 hour.</p>
                    </div>
                `,
            });
        },
    },

    user: {
        additionalFields: {
            gender: {
                type: "string",
                defaultValue: "male",
                input: true,
            },
            level: {
                type: "string",
                required: false,
                input: true,
            },
            isHomeroomTeacher: {
                type: "boolean",
                defaultValue: false,
                input: true,
                fieldName: "is_homeroom_teacher",
            },
            homeroomClassId: {
                type: "string",
                required: false,
                input: true,
                fieldName: "homeroom_class_id",
            },
        },
    },
    
    plugins: [
        admin({
            defaultRole: "user",
        })
    ],

    trustedOrigins: [
        "http://localhost:5173",
    ],
})
