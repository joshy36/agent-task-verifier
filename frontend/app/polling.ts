export const startPolling = (
  setProofData: (data: {
    vkey: string;
    publicValues: string;
    proof: string;
  }) => void,
  setIsGenerating: (value: boolean) => void
) => {
  const logWithTimestamp = (
    message: string,
    ...args: (string | number | object | Error | undefined)[]
  ) => {
    console.log(`[${new Date().toISOString()}] ${message}`, ...args);
  };

  const fetchProof = async () => {
    logWithTimestamp('Starting proof polling attempt');
    try {
      const res = await fetch('/api/receive-proof');
      const { data } = await res.json();
      if (data) {
        logWithTimestamp('Received proof data:', {
          vkey: data.vkey.slice(0, 10) + '...',
          publicValues: data.public_values.slice(0, 10) + '...',
          proof: data.proof.slice(0, 10) + '...',
        });
        setProofData({
          vkey: data.vkey,
          publicValues: data.public_values,
          proof: data.proof,
        });
        setIsGenerating(false);
      } else {
        logWithTimestamp('No new proof data received');
      }
    } catch (error) {
      logWithTimestamp(
        'Polling error:',
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  // Initial fetch
  fetchProof();

  // Start polling and never stop (changed to 5000ms as per your update)
  const interval = setInterval(fetchProof, 5000);
  logWithTimestamp('Polling started with interval ID:', interval);

  // No cleanup here since we want it to never stop
};

// Optional: Expose a way to stop polling if needed in the future
export const stopPolling = (interval: NodeJS.Timeout) => {
  clearInterval(interval);
  console.log(`[${new Date().toISOString()}] Polling stopped`);
};
