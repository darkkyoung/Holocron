// Only the standalone visual harness uses this adapter. Real app uses Web Locks.
export const CREDIT_CHANGED='holocron-credit-changed';
export async function initializeGuestCredits(){const value=await (await fetch('/api/credit/visit')).json();window.dispatchEvent(new CustomEvent(CREDIT_CHANGED,{detail:value}));return value;}
