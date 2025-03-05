import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';

interface TwitterData {
  walletAddress: string;
  twitterId: string;
  twitterUsername: string;
  twitterHandle?: string;
  twitterImage?: string;
  canBeRoasted?: boolean;
}

interface SuccessResponse {
  success: true;
  message: string;
}

interface ErrorResponse {
  success: false;
  error: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: TwitterData = await request.json();

    const { 
      walletAddress, 
      twitterId, 
      twitterUsername, 
      twitterHandle, 
      twitterImage, 
      canBeRoasted = true 
    } = body;

    // Validate input
    if (!walletAddress || !twitterId || !twitterUsername) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' } as ErrorResponse,
        { status: 400 }
      );
    }

    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' } as ErrorResponse,
        { status: 400 }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const userDocRef = db.collection('roasted').doc(normalizedAddress);

    await userDocRef.set(
      {
        walletAddress: normalizedAddress,
        twitterId,
        twitterUsername,
        twitterHandle: twitterHandle || twitterUsername,
        twitterImage: twitterImage || null,
        canBeRoasted,
        createdAt: FieldValue.serverTimestamp(), // Use server timestamp
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Twitter account connected successfully'
    } as SuccessResponse);
  } catch (error) {
    console.error('Error saving Twitter account:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save Twitter data'
    } as ErrorResponse, { status: 500 });
  }
}