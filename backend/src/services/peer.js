export async function checkPeerRoom(room) {
  if (!room || !process.env.PEER_BASE_URL || !process.env.PEER_OUTBOUND_API_KEY) {
    return { configured: false, active: false };
  }

  try {
    const url = new URL(`${process.env.PEER_BASE_URL.replace(/\/$/, '')}/rooms/current`);
    url.searchParams.set('room', room);
    const response = await fetch(url, {
      headers: { 'x-api-key': process.env.PEER_OUTBOUND_API_KEY, accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return { configured: true, active: false, error: `Partner returned ${response.status}` };
    const data = await response.json();
    return { configured: true, active: data.active === true, data };
  } catch (error) {
    return { configured: true, active: false, error: error.message };
  }
}

