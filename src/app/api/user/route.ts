// app/api/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import * as admin from 'firebase-admin';

interface SuccessResponse {
  success: true;
  exists: boolean;
  data: admin.firestore.DocumentData | null;
  isRoastable: boolean;
}

interface ErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('address');

  // Debug: Log the requested address
  console.log('API: Requested wallet address:', walletAddress);

  if (!walletAddress) {
    return NextResponse.json(
      { success: false, error: 'Wallet address is required' } as ErrorResponse,
      { status: 400 }
    );
  }

  if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json(
      { success: false, error: 'Invalid wallet address format' } as ErrorResponse,
      { status: 400 }
    );
  }

  try {
    const normalizedAddress = walletAddress.toLowerCase();
    // Debug: Log the normalized address
    console.log('API: Normalized address:', normalizedAddress);
    
    const docRef = db.collection('roasted').doc(normalizedAddress);

    try {
      // Debug: Log that we're attempting to fetch
      console.log('API: Attempting to fetch document from collection "roasted"');
      
      const docSnap = await docRef.get();
      
      // Debug: Log document existence
      console.log('API: Document exists:', docSnap.exists);

      if (docSnap.exists) {
        return NextResponse.json({
          success: true,
          exists: true,
          data: docSnap.data(),
          isRoastable: docSnap.data()?.canBeRoasted || false
        } as SuccessResponse);
      } else {
        // Try to list all documents in the collection to verify it exists
        try {
          const collectionRef = db.collection('roasted');
          const snapshot = await collectionRef.limit(5).get();
          console.log('API: Collection "roasted" exists, document count:', snapshot.size);
          if (snapshot.size > 0) {
            console.log('API: Sample document IDs:', snapshot.docs.map(doc => doc.id));
          }
        } catch (listError) {
          console.error('API: Error listing collection:', listError);
        }
        
        return NextResponse.json({
          success: true,
          exists: false,
          data: null
        } as SuccessResponse);
      }
    } catch (fetchError) {
      console.error('Firestore fetch error:', fetchError);
      return NextResponse.json({
        success: false,
        error: fetchError instanceof Error ? fetchError.message : 'Firestore fetch failed',
        errorCode: (fetchError as { code?: string }).code || 'unknown'
      } as ErrorResponse, { status: 500 });
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ErrorResponse, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};