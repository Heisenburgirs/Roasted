"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function SignIn() {
  useEffect(() => {
    signIn("twitter", { callbackUrl: "/" });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Redirecting to Twitter...</h1>
      <p className="mb-6">Please wait while we redirect you to Twitter for authentication.</p>
      <div className="w-12 h-12 border-4 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );
}