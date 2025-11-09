# Agreed Contracts - Solana Program

Phase 1 implementation: Basic on-chain contract accounts with approval tracking.

## Structure

```
agreed_contracts/
├── programs/
│   └── agreed_contracts/
│       ├── src/
│       │   └── lib.rs          # Main program logic
│       └── Cargo.toml
├── Anchor.toml                  # Anchor configuration
├── Cargo.toml                   # Workspace configuration
└── package.json
```

## Features

- **Initialize Contract**: Create a new contract account on-chain with participants
- **Approve Contract**: Participants approve contracts on-chain
- **Cancel Contract**: Creator can cancel active contracts
- **Track Status**: Contract status (Active/Completed/Cancelled) stored on-chain

## Account Structure

Each contract is a PDA (Program Derived Address) with:
- Contract ID (u64)
- Creator public key
- List of participants (max 10)
- Approval threshold
- Current approvals count
- List of approvers
- Status enum
- IPFS hash (for future content storage)
- Created timestamp

## Building

```bash
anchor build
```

## Deploying

See `../SOLANA_DEPLOYMENT.md` for complete deployment guide.

Quick deploy to devnet:
```bash
anchor deploy --provider.cluster devnet
```

## Testing

```bash
anchor test
```

## What's NOT Included (Future Phases)

- ❌ Escrow/fund transfers (Phase 3)
- ❌ Reputation system (Phase 2)
- ❌ IPFS content storage
- ❌ Complex approval logic

## Integration

See `../INTEGRATION_GUIDE.md` for frontend/backend integration examples.

