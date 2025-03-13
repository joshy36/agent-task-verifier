import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { agent, system } = await req.json();

    if (!agent) {
      return NextResponse.json(
        { error: 'Please provide a wallet address' },
        { status: 400 }
      );
    }

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/generate_proof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent,
        system: system || 'groth16',
      }),
    });

    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.error('Error generating proof:', error);
    return NextResponse.json(
      {
        error:
          'If the wallet has a zero balance of any of the tokens this will error. I need to fix that cause you would still want to generate a proof that shows invalid',
      },
      { status: 500 }
    );
  }
}
