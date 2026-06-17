
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getProfessorSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("customer_token")?.value;

    if (!token) return null;

    try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
        const { payload } = await jwtVerify(token, secret);
        
        if (!(payload.roles as string[])?.includes('PROFESOR')) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}
