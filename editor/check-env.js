console.log("Loading environment variables...");
console.log("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY exists:", !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
console.log("CLERK_SECRET_KEY exists:", !!process.env.CLERK_SECRET_KEY);
if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    console.log("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY prefix:", process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.substring(0, 15) + "...");
}
if (process.env.CLERK_SECRET_KEY) {
    console.log("CLERK_SECRET_KEY prefix:", process.env.CLERK_SECRET_KEY.substring(0, 15) + "...");
}
