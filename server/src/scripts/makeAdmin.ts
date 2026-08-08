import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User";

dotenv.config();

const exitWithError = (message: string): never => {
  console.error(`Error: ${message}`);
  process.exit(1);
  throw new Error(message);
};

const printHelp = () => {
  console.log(`
Usage:
  npm run admin:grant -- <email>
  npm run admin:revoke -- <email>

Grants or revokes admin (isAdmin) privileges for an existing user account.
This is a local/CLI-only operation — there is no HTTP route for it by design.
`);
};

const run = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  const email = args[1];

  if (
    !command ||
    command === "help" ||
    (command !== "grant" && command !== "revoke")
  ) {
    printHelp();
    return;
  }

  if (!email || email.trim().length === 0) {
    exitWithError("Missing required <email> argument.");
  }

  const mongoUri = process.env.MONGODB_URI ?? "";
  if (!mongoUri) {
    exitWithError("MONGODB_URI is not set.");
  }
  await mongoose.connect(mongoUri);

  try {
    const isAdmin = command === "grant";
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { isAdmin } },
      { new: true },
    );

    if (!user) {
      exitWithError(`No user found with email: ${email}`);
    }

    console.log(
      `${isAdmin ? "Granted" : "Revoked"} admin privileges for ${user!.email} (id: ${user!._id}).`,
    );
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error("Unexpected error:", error);
  mongoose.disconnect().finally(() => process.exit(1));
});
