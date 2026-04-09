import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: "http://localhost:8080",
    plugins: [
        adminClient(),
        inferAdditionalFields({
            user: {
                gender: {
                    type: "string",
                },
            },
        }),
    ]
});

export const {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession,
} = authClient;
