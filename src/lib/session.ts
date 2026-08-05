import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function getServerSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email!,
    fullName: session.user.fullName,
    verified: session.user.verified,
    profileComplete: session.user.profileComplete,
  };
}
