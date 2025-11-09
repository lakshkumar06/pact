import crypto from 'crypto';

// For demo purposes, we'll use a simulated IPFS hash
// In production, connect to an actual IPFS node or use a service like Pinata/Web3.Storage
const USE_MOCK_IPFS = true;

let ipfsClient = null;

// Initialize IPFS client (if using real IPFS)
async function initIPFSClient() {
  if (!USE_MOCK_IPFS && !ipfsClient) {
    try {
      // Dynamically import only when needed
      const { create } = await import('kubo-rpc-client');
      ipfsClient = create({ url: process.env.IPFS_API_URL || 'http://127.0.0.1:5001' });
      console.log('IPFS client initialized');
    } catch (error) {
      console.warn('IPFS client not available, falling back to mock mode');
    }
  }
}

/**
 * Upload contract content to IPFS
 * @param {string} content - The contract content to upload
 * @returns {Promise<string>} - The IPFS hash (CID)
 */
export async function uploadToIPFS(content) {
  if (USE_MOCK_IPFS || !ipfsClient) {
    // Generate a deterministic mock hash for demo purposes
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return `Qm${hash.substring(0, 44)}`; // Mock IPFS CIDv0 format
  }

  // Initialize IPFS client if needed
  await initIPFSClient();

  try {
    const { cid } = await ipfsClient.add(content);
    return cid.toString();
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw new Error('Failed to upload content to IPFS');
  }
}

/**
 * Retrieve content from IPFS
 * @param {string} ipfsHash - The IPFS hash (CID)
 * @returns {Promise<string>} - The content
 */
export async function retrieveFromIPFS(ipfsHash) {
  if (USE_MOCK_IPFS || !ipfsClient) {
    // In mock mode, we can't actually retrieve
    throw new Error('Mock IPFS mode - content must be stored in database');
  }

  // Initialize IPFS client if needed
  await initIPFSClient();

  try {
    const chunks = [];
    for await (const chunk of ipfsClient.cat(ipfsHash)) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch (error) {
    console.error('Error retrieving from IPFS:', error);
    throw new Error('Failed to retrieve content from IPFS');
  }
}

/**
 * Pin content to IPFS to ensure it persists
 * @param {string} ipfsHash - The IPFS hash (CID) to pin
 * @returns {Promise<void>}
 */
export async function pinToIPFS(ipfsHash) {
  if (USE_MOCK_IPFS || !ipfsClient) {
    return; // No-op in mock mode
  }

  // Initialize IPFS client if needed
  await initIPFSClient();

  try {
    await ipfsClient.pin.add(ipfsHash);
    console.log(`Pinned ${ipfsHash} to IPFS`);
  } catch (error) {
    console.error('Error pinning to IPFS:', error);
    // Don't throw - pinning failure shouldn't break the flow
  }
}

