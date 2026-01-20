"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { ethers } from "ethers";

// Type definition for MetaMask
declare global {
    interface Window {
        ethereum: any;
    }
}

// 1. Get API URL from Build Time Env OR fallback to localhost
// We do NOT get ROLLUP_ADDRESS from env anymore. We ask the backend.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Minimal ABI for the actions we need
const ROLLUP_ABI = [
    "function deposit(uint256 accountIndex) external payable",
    "function requestWithdrawal(uint256 accountIndex, uint256 amount) external"
];

export default function Home() {
  // --- STATE MANAGEMENT ---
  
  // Config State
  const [rollupAddress, setRollupAddress] = useState<string>(""); 

  // Network State
  const [l2Root, setL2Root] = useState<string>("Loading...");
  const [l1Root, setL1Root] = useState<string>("Loading...");
  const [status, setStatus] = useState<{msg: string, color: string}>({ msg: "", color: "" });
  
  // User Account State
  const [myIndex, setMyIndex] = useState<number>(0); 
  const [balance, setBalance] = useState<string>("0");
  
  // Action Inputs
  const [toIndex, setToIndex] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Transaction Tracking
  const [watchingTxId, setWatchingTxId] = useState<number | null>(null);
  const [txs, setTxs] = useState<any[]>([]);

  // --- 1. FETCH CONFIGURATION (ON LOAD) ---
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        console.log(`🔌 Connecting to Backend at: ${API_URL}`);
        const res = await axios.get(`${API_URL}/config`);
        if (res.data.rollupAddress) {
            console.log("✅ Config Loaded. Contract:", res.data.rollupAddress);
            setRollupAddress(res.data.rollupAddress);
        }
      } catch (e: any) {
        console.error("Failed to load config:", e);
        setStatus({ 
            msg: `Backend Connection Failed: ${e.message}. Is the API running?`, 
            color: "text-red-500" 
        });
      }
    };
    fetchConfig();
  }, []);

  // --- 2. POLL STATE & EXPLORER ---
  const fetchState = async () => {
    try {
      // Fetch Roots
      const res = await axios.get(`${API_URL}/state`);
      setL2Root(res.data.l2Root);
      setL1Root(res.data.l1Root);
      
      // Fetch Balance
      const accRes = await axios.get(`${API_URL}/account/${myIndex}`);
      setBalance(accRes.data.balance);

      // Fetch Explorer Data
      const txRes = await axios.get(`${API_URL}/explorer/transactions`);
      setTxs(txRes.data);
    } catch (e) {
      console.error("API Poll Error (Backend might be restarting)", e);
    }
  };

  useEffect(() => {
    // Poll every 3 seconds
    const interval = setInterval(async () => {
      fetchState();

      // Check Watchlist
      if (watchingTxId) {
        try {
          const res = await axios.get(`${API_URL}/transaction/${watchingTxId}`);
          const txStatus = res.data.status; 
          
          if (txStatus === "ON_CHAIN") {
            setStatus({ msg: `✅ Tx ${watchingTxId} Confirmed on Sepolia!`, color: "text-green-400" });
            setWatchingTxId(null);
          } else if (txStatus === "PROVED") {
            setStatus({ msg: `🔐 Tx ${watchingTxId} Proved (Submitting to L1...)`, color: "text-blue-400" });
          }
        } catch (e) { console.error(e); }
      }
    }, 3000); 

    return () => clearInterval(interval);
  }, [myIndex, watchingTxId]);


  // --- 3. ACTIONS ---

  // Deposit (L1 -> L2)
  const handleDeposit = async () => {
    if (!window.ethereum) return alert("Install MetaMask!");
    if (!depositAmount) return;
    if (!rollupAddress) return alert("Rollup Address not loaded yet. Check Backend connection.");

    setStatus({ msg: "Initiating L1 Deposit...", color: "text-blue-400" });

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(rollupAddress, ROLLUP_ABI, signer);
      
      const tx = await contract.deposit(myIndex, { value: parseInt(depositAmount) });
      setStatus({ msg: `L1 Tx Sent: ${tx.hash.substring(0,10)}...`, color: "text-yellow-400" });
      
      await tx.wait();
      setStatus({ msg: "✅ Deposit Confirmed on L1! Waiting for L2...", color: "text-green-400" });
      setDepositAmount("");
    } catch (e: any) {
      console.error(e);
      setStatus({ msg: "Deposit Failed: " + (e.reason || e.message), color: "text-red-500" });
    }
  };

  // Transfer (L2 -> L2)
  const handleTransfer = async () => {
    if (!toIndex || !amount) return;
    setStatus({ msg: "Sending to L2 Node...", color: "text-yellow-400" });
    
    try {
      const res = await axios.post(`${API_URL}/transfer`, {
        from: myIndex,
        to: parseInt(toIndex),
        amount: parseInt(amount)
      });
      
      const txId = res.data.txId;
      setStatus({ msg: `⏳ Tx ${txId} Pending (Generating ZK Proof...)`, color: "text-yellow-400" });
      setWatchingTxId(txId);
      setAmount("");
    } catch (e: any) {
      console.error(e);
      setStatus({ msg: "Error sending tx", color: "text-red-500" });
    }
  };

  // Withdraw (L2 -> L1)
  const handleWithdraw = async () => {
    if (!window.ethereum) return alert("Install MetaMask!");
    if (!withdrawAmount) return;
    if (!rollupAddress) return alert("Rollup Address not loaded yet.");

    setStatus({ msg: "Requesting Withdrawal on L1...", color: "text-blue-400" });

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(rollupAddress, ROLLUP_ABI, signer);
      
      const tx = await contract.requestWithdrawal(myIndex, parseInt(withdrawAmount));
      setStatus({ msg: `Withdrawal Requested: ${tx.hash.substring(0,10)}...`, color: "text-yellow-400" });
      
      await tx.wait();
      setStatus({ msg: "✅ Request Confirmed! Waiting for Sequencer...", color: "text-green-400" });
      setWithdrawAmount("");
    } catch (e: any) {
      console.error(e);
      setStatus({ msg: "Withdraw Failed: " + (e.reason || e.message), color: "text-red-500" });
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 md:p-10 font-sans">
      
      {/* Debug Bar */}
      <div className="text-xs text-center text-gray-500 mb-6 font-mono">
        Backend: <span className="text-gray-400">{API_URL}</span> | 
        Contract: <span className={rollupAddress ? "text-green-400" : "text-red-400 animate-pulse"}>
            {rollupAddress || "Fetching..."}
        </span>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            ZK-Rollup Demo
        </h1>
        
        {/* TOP ROW: Status & Wallet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Card */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 border-b border-slate-600 pb-2">Network Status</h2>
            <div className="space-y-4">
                <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider">L2 State Root</span>
                <p className="font-mono text-xs text-green-400 bg-slate-900 p-2 rounded mt-1 truncate">{l2Root}</p>
                </div>
                <div>
                <span className="text-gray-400 text-xs uppercase tracking-wider">L1 State Root</span>
                <p className="font-mono text-xs text-yellow-400 bg-slate-900 p-2 rounded mt-1 truncate">{l1Root}</p>
                </div>
                <div className="pt-2 text-sm font-medium">
                {l2Root === l1Root ? (
                    <span className="text-green-500 flex items-center gap-2">✅ State Synced</span>
                ) : (
                    <span className="text-yellow-500 flex items-center gap-2 animate-pulse">⏳ Syncing L1...</span>
                )}
                </div>
            </div>
            </div>

            {/* Account Card */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 border-b border-slate-600 pb-2">My L2 Wallet</h2>
            <div className="flex gap-4 items-center mb-6">
                <label className="text-gray-300">Account ID:</label>
                <input 
                type="number" 
                value={myIndex} 
                onChange={(e) => setMyIndex(parseInt(e.target.value))}
                className="bg-slate-900 border border-slate-600 p-2 rounded w-24 text-center focus:outline-none focus:border-blue-500"
                />
            </div>
            <div className="text-4xl font-bold tracking-tight">
                {balance} <span className="text-lg font-normal text-gray-400">TOKENS</span>
            </div>
            </div>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Deposit */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg border-t-4 border-t-purple-500">
                <h3 className="font-bold text-lg mb-4">Deposit (L1 {'\u2192'} L2)</h3>
                <div className="space-y-3">
                    <input 
                        type="number" 
                        value={depositAmount} 
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 p-3 rounded"
                        placeholder="Wei Amount"
                    />
                    <button 
                        onClick={handleDeposit}
                        className="w-full bg-purple-600 hover:bg-purple-500 py-2 rounded font-bold transition-colors"
                    >
                        Deposit
                    </button>
                </div>
            </div>

            {/* 2. Transfer */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg border-t-4 border-t-blue-500">
                <h3 className="font-bold text-lg mb-4">Transfer (L2 {'\u2192'} L2)</h3>
                <div className="space-y-3">
                    <input 
                        type="number" value={toIndex} onChange={(e) => setToIndex(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 p-3 rounded" placeholder="To ID"
                    />
                    <input 
                        type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 p-3 rounded" placeholder="Amount"
                    />
                    <button 
                        onClick={handleTransfer}
                        className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded font-bold transition-colors"
                    >
                        Send
                    </button>
                </div>
            </div>

            {/* 3. Withdraw */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg border-t-4 border-t-red-500">
                <h3 className="font-bold text-lg mb-4">Withdraw (L2 {'\u2192'} L1)</h3>
                <div className="space-y-3">
                    <input 
                        type="number" 
                        value={withdrawAmount} 
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 p-3 rounded"
                        placeholder="Amount"
                    />
                    <button 
                        onClick={handleWithdraw}
                        className="w-full bg-red-600 hover:bg-red-500 py-2 rounded font-bold transition-colors"
                    >
                        Withdraw
                    </button>
                </div>
            </div>
        </div>

        {/* Global Status Message */}
        {status.msg && (
            <div className={`p-4 rounded-lg text-center font-mono border ${status.color.includes("red") ? "bg-red-900/20 border-red-500/50" : "bg-blue-900/20 border-blue-500/50"}`}>
                <p className={`text-lg ${status.color} ${status.msg.includes("Pending") || status.msg.includes("Initiating") ? "animate-pulse" : ""}`}>
                    {status.msg}
                </p>
            </div>
        )}

        {/* BLOCK EXPLORER SECTION */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 border-b border-slate-600 pb-2 text-gray-300">
            Recent Transactions
            </h2>
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-200 uppercase bg-slate-700">
                <tr>
                    <th className="px-4 py-3">Tx ID</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">To</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                </tr>
                </thead>
                <tbody>
                {txs.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                    <td className="px-4 py-3 font-mono">#{tx.id}</td>
                    <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                        tx.type === 'DEPOSIT' ? 'bg-green-900 text-green-300' :
                        tx.type === 'WITHDRAWAL' ? 'bg-red-900 text-red-300' :
                        'bg-blue-900 text-blue-300'
                        }`}>
                        {tx.type || 'TRANSFER'}
                        </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{tx.from_index}</td>
                    <td className="px-4 py-3 font-mono">
                        {tx.type === 'WITHDRAWAL' 
                        ? <span title={tx.to_address}>{tx.to_address ? tx.to_address.substring(0,6) + '...' : 'Unknown'}</span> 
                        : tx.to_index}
                    </td>
                    <td className="px-4 py-3 text-white">{tx.amount}</td>
                    <td className="px-4 py-3">
                        <span className={`${
                        tx.status === 'ON_CHAIN' ? 'text-green-400' :
                        tx.status === 'PROVED' ? 'text-blue-400' :
                        'text-yellow-400'
                        }`}>
                        {tx.status === 'ON_CHAIN' ? '✅ L1 Confirmed' : tx.status}
                        </span>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>

      </div>
    </div>
  );
}