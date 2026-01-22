// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVerifier {
    function verifyProof(uint256[24] calldata proof, uint256[1] calldata pubSignals) external view returns (bool);
}

contract ZkRollup {
    IVerifier public verifier;
    uint256 public stateRoot;

    // --- CENSORSHIP RESISTANCE ---
    uint256 public nextWithdrawalIndex = 0; // The next request ID to be processed
    uint256 public totalWithdrawalRequests = 0; // Total requests made

    event BatchProcessed(uint256 indexed batchId, uint256 oldRoot, uint256 newRoot);
    event Deposit(uint256 indexed accountIndex, uint256 amount, address sender);
    event WithdrawalRequested(uint256 indexed requestId, uint256 indexed accountIndex, uint256 amount, address receiver);
    event WithdrawalFinalized(uint256 indexed requestId, address indexed receiver, uint256 amount);

    constructor(address _verifier, uint256 _initialRoot) {
        verifier = IVerifier(_verifier);
        stateRoot = _initialRoot;
    }

    function deposit(uint256 accountIndex) external payable {
        require(msg.value > 0, "Amount > 0");
        emit Deposit(accountIndex, msg.value, msg.sender);
    }

    // 1. User Forces a Request
    function requestWithdrawal(uint256 accountIndex, uint256 amount) external {
        // We assign a sequential ID to this request
        uint256 requestId = totalWithdrawalRequests;
        totalWithdrawalRequests++;
        
        emit WithdrawalRequested(requestId, accountIndex, amount, msg.sender);
    }

    // 2. Sequencer Must Include Them
    function submitBatch(
        uint256 _newRoot,
        uint256[24] calldata _proof,
        address[] calldata withdrawalReceivers,
        uint256[] calldata withdrawalAmounts
        
    ) external {
        require(withdrawalReceivers.length == withdrawalAmounts.length, "Length mismatch");

        // Verify Proof
        uint256[1] memory pubSignals;
        pubSignals[0] = _newRoot;
        require(verifier.verifyProof(_proof, pubSignals), "Invalid ZK Proof");

        stateRoot = _newRoot;
        emit BatchProcessed(block.number, stateRoot, _newRoot);

        // Process Withdrawals
        for (uint i = 0; i < withdrawalReceivers.length; i++) {
            uint256 amount = withdrawalAmounts[i];
            address receiver = withdrawalReceivers[i];
            
            require(address(this).balance >= amount, "Contract underflow");
            payable(receiver).transfer(amount);
            
            // We mark this Request ID as processed
            // (In a real system, we'd verify the ID matches the queue order)
            emit WithdrawalFinalized(nextWithdrawalIndex, receiver, amount);
            nextWithdrawalIndex++;
        }
        
        // CHECK: Censorship Resistance Logic
        // If there are pending requests (total > next), and this batch processed ZERO withdrawals,
        // we could revert here to force the sequencer to process them.
        // For this demo, we assume the Sequencer is honest, but we track the indices publicly.
    }
}