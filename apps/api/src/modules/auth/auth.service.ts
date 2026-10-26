import bcrypt from "bcryptjs";
import { normalizeEmail, type LoginInput } from "@clinic/shared";
import { prisma } from "../../lib/prisma";
import { unauthorized } from "../../utils/errors";
import { serializeUser } from "../../utils/serializers";
import { userPublicSelect } from "../../utils/selectors";
import { signAccessToken } from "./token.service";

// Used to equalize timing when an email does not exist. This is a real bcrypt
// hash, never a valid credential.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("clinicflow-dummy-password-value", 12);

export interface LoginResult {
  user: ReturnType<typeof serializeUser>;
  token: string;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      ...userPublicSelect,
      passwordHash: true,
      deletedAt: true,
    },
  });

  const hashToCompare = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await bcrypt.compare(input.password, hashToCompare);

  if (!user || !passwordMatches || user.deletedAt !== null) {
    throw unauthorized("Invalid email or password");
  }

  return {
    user: serializeUser(user),
    token: signAccessToken(user.id),
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: userPublicSelect,
  });

  if (!user) {
    throw unauthorized("Your account is no longer active");
  }

  return serializeUser(user);
}
