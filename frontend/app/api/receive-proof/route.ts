import { NextResponse } from 'next/server';

// In-memory store for the latest proof data (for simplicity; use a DB in production)
let latestProofData: any = null;

export async function POST(request: Request) {
  try {
    const proofData = await request.json();
    console.log('Received proof data:', proofData);

    // Store the latest proof data
    latestProofData = proofData;

    return NextResponse.json(
      { message: 'Proof received successfully', data: proofData },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing proof:', error);
    return NextResponse.json(
      { error: 'Failed to process proof' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ data: latestProofData });
}
