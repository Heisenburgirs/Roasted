"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

export default function AuthenticatedX() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Get wallet address from URL params instead of parent window
  const walletAddress = searchParams.get('wallet');

  useEffect(() => {
    const saveTwitterData = async () => {
      if (status !== "authenticated" || !session?.user || saving || saveSuccess || !walletAddress) {
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
            walletAddress,
            twitterId: session.user.id,
            twitterUsername: session.user.name,
            twitterHandle: session.user.twitterHandle,
            twitterImage: session.user.image,
            canBeRoasted: true
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to save Twitter data');
        }

        setSaveSuccess(true);
        
        // Close window after successful save
        setTimeout(() => {
          window.close();
        }, 2000);

      } catch (error) {
        console.error("Error saving Twitter data:", error);
        setSaveError(error instanceof Error ? error.message : 'Failed to save Twitter data');
      } finally {
        setSaving(false);
      }
    };

    saveTwitterData();
  }, [session, status, saving, saveSuccess, walletAddress]);

  // Render loading state
  if (status === "loading" || saving) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">
          {status === "loading" ? "Loading..." : "Saving your X account..."}
        </h1>
        <div className="w-12 h-12 border-4 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render error state if no session
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Authentication Failed</h1>
        <p>Please try signing in again.</p>
        <Button onClick={() => window.close()} className="mt-4 transition hover:cursor-pointer">
          Close Window
        </Button>
      </div>
    );
  }

  // Render error state if save failed
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
            <Button onClick={() => window.close()} variant="outline" className="w-full transition hover:cursor-pointer">
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render success state
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