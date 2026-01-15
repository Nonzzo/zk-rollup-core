"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ethers } from "ethers";

const API_URL =  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const ROLLUP_ADDRESS = process.env.NEXT_PUBLIC_ROLLUP_ADDRESS || "";
const ROLLUP_ABI = [
    "function deposit(uint256 accountIndex) external payable",
    "function requestWithdrawal(uint256 accountIndex, uint256 amount) external"
  ];

export default function Home() {


  const [l2Root, setL2Root] = useState<string>("Loading...");
  const [l1Root, setL1Root] = useState<string>("Loading...");
  
  // Status is now an object to track color and text
  const [status, setStatus] = useState<{msg: string, color: string}>({ msg: "", color: "" });
  
  const [myIndex, setMyIndex] = useState<number>(0); 
  const [balance, setBalance] = useState<string>("0");
  const [toIndex, setToIndex] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  // Track the active Transaction ID we are watching
  const [watchingTxId, setWatchingTxId] = useState<number | null>(null);

  const [txs, setTxs] = useState<any[]>([]);

  const fetchState = async () => {
    try {
      // Fetch root states
      const res = await axios.get(`${API_URL}/state`);
      setL2Root(res.data.l2Root);
      setL1Root(res.data.l1Root);
      
      // Fetch account balance
      const accRes = await axios.get(`${API_URL}/account/${myIndex}`);
      setBalance(accRes.data.balance);

      // Fetch Explorer Data
      const txRes = await axios.get(`${API_URL}/explorer/transactions`);
      setTxs(txRes.data);
    } catch (e) {
      console.error("API Error", e);
    }
  };

  const [depositAmount, setDepositAmount] = useState("");

  const handleDeposit = async () => {
    if (!window.ethereum) return alert("Install MetaMask!");
    if (!depositAmount) return;

    setStatus({ msg: "Initiating L1 Deposit...", color: "text-blue-400" });

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(ROLLUP_ADDRESS, ROLLUP_ABI, signer);
      
      // Send Deposit Tx
      const tx = await contract.deposit(myIndex, { value: parseInt(depositAmount) });
      setStatus({ msg: `L1 Tx Sent: ${tx.hash.substring(0,10)}...`, color: "text-yellow-400" });
      
      await tx.wait();
      setStatus({ msg: "✅ Deposit Confirmed on L1! Waiting for L2...", color: "text-green-400" });
      
      // Clear input
      setDepositAmount("");
    } catch (e: any) {
      console.error(e);
      setStatus({ msg: "Deposit Failed: " + (e.reason || e.message), color: "text-red-500" });
    }
  };

  // Poll State & Transaction Status
  useEffect(() => {
    fetchState();
    const interval = setInterval(async () => {
      fetchState();

      // Check Transaction Status if we are watching one
      if (watchingTxId) {
        try {
          const res = await axios.get(`${API_URL}/transaction/${watchingTxId}`);
          const txStatus = res.data.status; // PENDING, PROVED, or ON_CHAIN
          
          if (txStatus === "ON_CHAIN") {
            setStatus({ msg: `✅ Tx ${watchingTxId} Confirmed on Sepolia!`, color: "text-green-400" });
            setWatchingTxId(null); // Stop watching
          } else if (txStatus === "PROVED") {
            setStatus({ msg: `🔐 Tx ${watchingTxId} Proved (Submitting to L1...)`, color: "text-blue-400" });
          }
        } catch (e) {
          console.error("Tx Check Error", e);
        }
      }
    }, 3000); 

    return () => clearInterval(interval);
  }, [myIndex, watchingTxId]);

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
      setWatchingTxId(txId); // Start polling this ID
      setAmount("");
    } catch (e) {
      console.error(e);
      setStatus({ msg: "Error sending tx", color: "text-red-500" });
    }
  };

  const [withdrawAmount, setWithdrawAmount] = useState("");

  const handleWithdraw = async () => {
    if (!window.ethereum) return alert("Install MetaMask!");
    if (!withdrawAmount) return;

    setStatus({ msg: "Requesting Withdrawal on L1...", color: "text-blue-400" });

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(ROLLUP_ADDRESS, ROLLUP_ABI, signer);
      
      // Call requestWithdrawal(accountIndex, amount)
      // Note: In ABI, ensure requestWithdrawal is defined
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

  

  return (
    <div className="min-h-screen bg-slate-900 text-white p-10 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-blue-400">ZK-Rollup</h1>
        
        {/* Status Card */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 border-b border-slate-600 pb-2">Network Status</h2>
          <div className="space-y-4">
            <div>
              <span className="text-gray-400 text-sm uppercase tracking-wider">L2 State Root (Local API)</span>
              <p className="font-mono text-xs text-green-400 break-all bg-slate-900 p-2 rounded mt-1">
                {l2Root}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm uppercase tracking-wider">L1 State Root (Sepolia Contract)</span>
              <p className="font-mono text-xs text-yellow-400 break-all bg-slate-900 p-2 rounded mt-1">
                {l1Root}
              </p>
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
          <h2 className="text-xl font-semibold mb-4 border-b border-slate-600 pb-2">My Wallet</h2>
          <div className="flex gap-4 items-center mb-6">
            <label className="text-gray-300">Account Index:</label>
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

        {/* Deposit Card */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg border-l-4 border-l-purple-500">
                    <h2 className="text-xl font-semibold mb-4 border-b border-slate-600 pb-2">Deposit ETH (L1 {'\u2192'} L2)</h2>
          <div className="flex gap-4">
            <input 
              type="number" 
              value={depositAmount} 
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 p-3 rounded"
              placeholder="Amount in Wei (e.g. 100)"
            />
            <button 
              onClick={handleDeposit}
              className="bg-purple-600 hover:bg-purple-500 px-6 rounded font-bold transition-colors"
            >
              Deposit
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * This sends real Sepolia ETH to the contract. The L2 Node will detect it and credit your balance.
          </p>
        </div>

        {/* Transfer Action */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 border-b border-slate-600 pb-2">Execute Transfer</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">To Account Index</label>
                <input 
                  type="number" 
                  value={toIndex} 
                  onChange={(e) => setToIndex(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 p-3 rounded focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. 1"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Amount</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 p-3 rounded focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. 10"
                />
              </div>
            </div>

            <button 
              onClick={handleTransfer}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 py-3 rounded-lg font-bold shadow-lg transform active:scale-95 transition-all"
            >
              Send Transaction
            </button>

            {/* Withdraw Card */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg border-l-4 border-l-red-500">
                    <h2 className="text-xl font-semibold mb-4 border-b border-slate-600 pb-2">Force Withdraw (L2 {'\u2192'} L1)</h2>
          <div className="flex gap-4">
            <input 
              type="number" 
              value={withdrawAmount} 
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 p-3 rounded"
              placeholder="Amount to Withdraw"
            />
            <button 
              onClick={handleWithdraw}
              className="bg-red-600 hover:bg-red-500 px-6 rounded font-bold transition-colors"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* BLOCK EXPLORER SECTION */}
  <div className="mt-10 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
    <h2 className="text-xl font-semibold mb-4 border-b border-slate-600 pb-2 text-purple-400">
      L2 Block Explorer (Latest Transactions)
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
                  ? <span title={tx.to_address}>{tx.to_address.substring(0,6)}...</span> 
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
            
            
            
            {status.msg && (
              <div className="mt-4 p-3 bg-slate-900 rounded text-center border border-slate-600 transition-all duration-500">
                <p className={`text-sm font-mono ${status.color} ${status.msg.includes("Pending") ? "animate-pulse" : ""}`}>
                  {status.msg}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}