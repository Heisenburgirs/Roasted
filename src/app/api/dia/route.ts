import { NextResponse } from 'next/server';

interface DiaResponse {
  Symbol: string;
  Name: string;
  Address: string;
  Blockchain: string;
  Price: number;
  PriceYesterday: number;
  VolumeYesterdayUSD: number;
  Time: string;
  Source: string;
  Signature: string;
}

export async function GET() {
  try {
    const response = await fetch(
      'https://api.diadata.org/v1/assetQuotation/Lukso/0x0000000000000000000000000000000000000000'
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: DiaResponse = await response.json();

    return NextResponse.json({
      price: data.Price,
      symbol: data.Symbol,
      timestamp: data.Time,
    });
  } catch (error) {
    console.error('Error fetching LYX price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LYX price' },
      { status: 500 }
    );
  }
}