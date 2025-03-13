import { NextResponse } from 'next/server';

interface ProofData {
  agent: string; // Ethereum address
  wbtc_bal: string; // 32-byte hex value
  eth_bal: string; // 32-byte hex value
  doge_bal: string; // 32-byte hex value
  is_valid: boolean; // Validity flag
  vkey: string; // 32-byte hex value
  public_values: string[]; // Array of hex values
  proof: string; // Hex value (possibly empty)
}

// In-memory store for the latest proof data
let latestProofData: ProofData | null = null;

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
