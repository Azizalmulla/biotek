'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function FederatedStatus() {
  const [nodes, setNodes] = useState([
    { id: 'A', name: 'Hospital A', patients: 333, status: 'Synced', latency: 12, lastSync: new Date() },
    { id: 'B', name: 'Hospital B', patients: 333, status: 'Synced', latency: 15, lastSync: new Date() },
    { id: 'C', name: 'Hospital C', patients: 334, status: 'Synced', latency: 18, lastSync: new Date() },
  ]);

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-black mb-2">Federated Learning Network</h2>
          <p className="text-sm text-black/60">Real-time status of distributed training nodes</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-green-700">All Nodes Online</span>
        </div>
      </div>

      {/* Network Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-black/5 rounded-2xl p-4">
          <div className="text-2xl font-bold text-black">{nodes.reduce((sum, n) => sum + n.patients, 0)}</div>
          <div className="text-xs text-black/60 mt-1">Total Patients</div>
        </div>
        <div className="bg-black/5 rounded-2xl p-4">
          <div className="text-2xl font-bold text-black">{nodes.length}</div>
          <div className="text-xs text-black/60 mt-1">Active Nodes</div>
        </div>
        <div className="bg-black/5 rounded-2xl p-4">
          <div className="text-2xl font-bold text-black">{Math.round(nodes.reduce((sum, n) => sum + n.latency, 0) / nodes.length)}ms</div>
          <div className="text-xs text-black/60 mt-1">Avg Latency</div>
        </div>
        <div className="bg-black/5 rounded-2xl p-4">
          <div className="text-2xl font-bold text-black">100%</div>
          <div className="text-xs text-black/60 mt-1">Privacy Preserved</div>
        </div>
      </div>

      {/* Node List */}
      <div className="space-y-3">
        {nodes.map((node, i) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/60 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black/10 rounded-xl flex items-center justify-center">
                  <span className="text-lg font-bold text-black">{node.id}</span>
                </div>
                <div>
                  <div className="font-medium text-black">{node.name}</div>
                  <div className="text-xs text-black/50">{node.patients} patients</div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm font-medium text-black">{node.latency}ms</div>
                  <div className="text-xs text-black/50">Latency</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-black">{node.lastSync.toLocaleTimeString()}</div>
                  <div className="text-xs text-black/50">Last Sync</div>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  {node.status}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Privacy Guarantee */}
      <div className="mt-6 p-4 bg-black/5 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🔒</div>
          <div>
            <h3 className="font-medium text-black mb-1">Privacy Guarantee</h3>
            <p className="text-xs text-black/70">
              Patient data never leaves hospital premises. Only encrypted model updates are exchanged via federated learning, ensuring HIPAA and GDPR compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
