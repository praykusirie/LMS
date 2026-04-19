import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { admin } from "better-auth/plugins";

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
        enabled: true
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
