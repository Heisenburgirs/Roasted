"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUpProvider } from "../upProvider";

// Add type declaration for the extended session user
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      twitterHandle?: string;
    }
  }
}

// Create a separate component for the authentication content
function AuthContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);

  // Get wallet from URL or localStorage
  const walletFromUrl = searchParams.get('wallet');
  const walletFromStorage = useState(() => {
    try {
      return localStorage.getItem('twitter_auth_wallet');
    } catch (e) {
      console.error('Error accessing localStorage:', e);
      return null;
    }
  })[0];

  // Handle initial redirect
  useEffect(() => {
    if (walletFromUrl && !initialRedirectDone) {
      // Store the wallet in localStorage
      localStorage.setItem('twitter_auth_wallet', walletFromUrl);
      setInitialRedirectDone(true);
      
      // Redirect to Twitter auth after a short delay to ensure localStorage is set
      setTimeout(() => {
        const authUrl = `/api/auth/signin/twitter?callbackUrl=${encodeURIComponent('/authenticatedX')}`;
        window.location.href = authUrl;
      }, 100);
    }
  }, [walletFromUrl, initialRedirectDone]);

  // Save Twitter data when we have both session and wallet from storage
  useEffect(() => {
    const saveTwitterData = async () => {
      if (status !== "authenticated" || !session?.user || saving || saveSuccess || !walletFromStorage) {
        console.log("Save conditions not met:", {
          status,
          hasSession: !!session?.user,
          saving,
          saveSuccess,
          walletFromStorage
        });
        return;
      }

      try {
        setSaving(true);
        setSaveError(null);

        const response = await fetch('/api/save-twitter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: walletFromStorage,
            twitterId: session.user.id,
            twitterUsername: session.user.name,
            twitterHandle: session.user.twitterHandle,
            twitterImage: session.user.image,
            canBeRoasted: true
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }

        if (!result.success) {
          throw new Error(result.error || 'Operation failed');
        }

        setSaveSuccess(true);
        localStorage.removeItem('twitter_auth_wallet');
        setTimeout(() => window.close(), 2000);

      } catch (error) {
        console.error("Error saving Twitter data:", error);
        setSaveError(
          error instanceof Error 
            ? error.message 
            : 'Failed to save Twitter data. Please try again.'
        );
      } finally {
        setSaving(false);
      }
    };

    saveTwitterData();
  }, [session, status, saving, saveSuccess, walletFromStorage]);

  // RENDER LOGIC - Order matters here!

  // 1. First, handle the initial wallet URL state
  if (walletFromUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">
          Connecting to X...
        </h1>
        <div className="w-12 h-12 border-4 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-muted-foreground">
          Please wait while we redirect you to X for authentication
        </p>
      </div>
    );
  }

  // 2. Show loading state while session is loading
  if (status === "loading" || saving) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">
          {saving ? "Saving your X account..." : "Loading..."}
        </h1>
        <div className="w-12 h-12 border-4 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // 3. Handle post-auth states
  if (session) {
    // If we have a session but no wallet in storage, show error
    if (!walletFromStorage) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CrossCircledIcon className="h-6 w-6 text-red-500" />
                Error Connecting X Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>No wallet address found. Please try connecting again.</AlertDescription>
              </Alert>
              <Button onClick={() => window.close()} variant="outline" className="w-full">
                Close Window
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Show error state if save failed
    if (saveError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CrossCircledIcon className="h-6 w-6 text-red-500" />
                Error Connecting X Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                Please try again or contact support if the issue persists.
              </p>
              <Button onClick={() => window.close()} variant="outline" className="w-full">
                Close Window
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Show success state
    if (saveSuccess) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircledIcon className="h-6 w-6 text-green-500" />
                X Account Connected!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {session?.user?.image && (
                  <img 
                    src={session.user.image} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{session?.user?.name}</p>
                  {session?.user?.name && (
                    <p className="text-sm text-muted-foreground">@{session?.user?.name}</p>
                  )}
                </div>
              </div>
              
              <p className="text-muted-foreground">
                Your X account has been successfully linked to your wallet.
              </p>
              
              <Button 
                onClick={() => window.close()} 
                variant="default" 
                className="w-full transition hover:cursor-pointer"
              >
                Close Window
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // 4. Default loading state
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">
        Connecting your X account...
      </h1>
      <div className="w-12 h-12 border-4 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );
}

// Loading component for the Suspense boundary
function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-12 h-12 border-4 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );
}

// Main component wrapped with Suspense
export default function AuthenticatedX() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthContent />
    </Suspense>
  );
}