'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
import { motion, AnimatePresence } from 'framer-motion';

interface Motif {
  pattern: string;
  name: string;
  type: string;
  importance: string;
  count: number;
  positions: number[];
}

interface AnalysisResult {
  success: boolean;
  data: {
    sequence_length?: number;
    input_sequence?: string;
    generated_extension?: string;
    generation_length?: number;
    confidence_scores?: number[];
    avg_confidence?: number;
    elapsed_ms?: number;
    gc_content?: number;
    generated_gc_content?: number;
    motifs_found?: Motif[];
    nucleotide_analysis?: {
      input: { A: number; T: number; G: number; C: number };
      generated: { A: number; T: number; G: number; C: number };
    };
    organism_bias?: string;
    temperature?: number;
    model?: string;
    timestamp?: string;
  };
}

const ORGANISMS = [
  { id: 'none', name: 'Auto-detect', icon: '🧬' },
  { id: 'human', name: 'Human', icon: '👤' },
  { id: 'mouse', name: 'Mouse', icon: '🐭' },
  { id: 'ecoli', name: 'E. coli', icon: '🦠' },
  { id: 'yeast', name: 'Yeast', icon: '🍞' },
];

const EXAMPLE_SEQUENCES = [
  {
    name: 'BRCA1 Gene',
    sequence: 'ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAGAGTGTCCCATCTGTCTGGAGTTGATCAAGGAACCTGTCTCCACAAAGTGTGACCACATATTTTGCAAATTTTGCATGCTGAAACTTCTCAACCAGAAGAAAGGGCCTTCACAGTGTCCTTTATGTAAGAATGATATAACCAAAAG',
    description: 'Breast cancer susceptibility gene'
  },
  {
    name: 'TP53 Tumor Suppressor',
    sequence: 'ATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCCCCCTCTGAGTCAGGAAACATTTTCAGACCTATGGAAACTACTTCCTGAAAACAACGTTCTGTCC',
    description: 'Guardian of the genome'
  },
  {
    name: 'Insulin Gene',
    sequence: 'ATGGCCCTGTGGATGCGCCTCCTGCCCCTGCTGGCGCTGCTGGCCCTCTGGGGACCTGACCCAGCCGCAGCCTTTGTGAACCAACACCTGTGCGGCTCACACCTGGTGGAAGCTCTCTACCTAGTGTGCGGGGAACGAGGCTTCTTCTACACACCCAAGACCCGCCGGGAGGCAGAGGACCTGCAGGTGGGGCAGGTGGAGCTGGGCGGGGGCCCTGGTGCAGGCAGCCTGCAGCCCTTGGCCCTGGAGGGGTCCCTGCAGAAGCGTGGCATTGTGGAACAATGCTGTACCAGCATCTGCTCCCTCTACCAGCTGGAGAACTACTGCAACTAGACGCAGCCCGCAGGCAGCCCCACACCCGCCGCCTCCTGCACCGAGAGAGATGGAATAAAGCCCTTGAACCAGC',
    description: 'Blood sugar regulation'
  },
];

export default function DNAAnalysis() {
  const [sequence, setSequence] = useState('');
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [organism, setOrganism] = useState('none');
  const [temperature, setTemperature] = useState(0.7);
  const [numTokens, setNumTokens] = useState(100);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateSequence = (seq: string): boolean => {
    const cleanSeq = seq.toUpperCase().replace(/\s/g, '');
    return /^[ACGT]+$/.test(cleanSeq) && cleanSeq.length >= 10;
  };

  const handleExampleSelect = (example: typeof EXAMPLE_SEQUENCES[0]) => {
    setSelectedExample(example.name);
    setSequence(example.sequence);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!validateSequence(sequence)) {
      setError('Please enter a valid DNA sequence (at least 10 nucleotides, only A, C, G, T)');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/cloud/dna/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequence: sequence.toUpperCase().replace(/\s/g, ''),
          num_tokens: numTokens,
          temperature: temperature,
          organism: organism === 'none' ? null : organism,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sequenceStats = sequence ? {
    length: sequence.replace(/\s/g, '').length,
    gcContent: ((sequence.match(/[GC]/gi) || []).length / sequence.replace(/\s/g, '').length * 100).toFixed(1),
    aCount: (sequence.match(/A/gi) || []).length,
    tCount: (sequence.match(/T/gi) || []).length,
    gCount: (sequence.match(/G/gi) || []).length,
    cCount: (sequence.match(/C/gi) || []).length,
  } : null;

  // Render confidence-colored nucleotides
  const renderColoredSequence = (seq: string, probs: number[]) => {
    return seq.split('').map((nucleotide, i) => {
      const prob = probs[i] || 0;
      const hue = prob * 120; // 0 = red, 120 = green
      return (
        <span
          key={i}
          className="font-mono"
          style={{
            color: `hsl(${hue}, 70%, 45%)`,
            fontWeight: prob > 0.8 ? 'bold' : 'normal',
          }}
          title={`Confidence: ${(prob * 100).toFixed(1)}%`}
        >
          {nucleotide}
        </span>
      );
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-black/10 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-black/10 bg-[#f3e7d9]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center shadow-lg">
              <span className="text-2xl">🧬</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-black">Evo 2 DNA Analysis</h2>
              <p className="text-sm text-black/60">40B parameter genomic foundation model</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-black/40">Powered by</div>
            <div className="text-sm font-semibold text-black">NVIDIA NIM</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Example Sequences */}
        <div>
          <label className="block text-sm font-semibold text-black/80 mb-3">Quick Start Examples</label>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_SEQUENCES.map((example) => (
              <button
                key={example.name}
                onClick={() => handleExampleSelect(example)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedExample === example.name
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-black/5 text-black/70 hover:bg-black/10'
                }`}
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sequence Input */}
        <div>
          <label className="block text-sm font-semibold text-black/80 mb-2">
            DNA Sequence
          </label>
          <textarea
            value={sequence}
            onChange={(e) => {
              setSequence(e.target.value);
              setSelectedExample(null);
              setResult(null);
            }}
            placeholder="Paste your DNA sequence here (A, C, G, T only)..."
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-black font-mono text-sm placeholder-black/30 focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all resize-none"
            rows={4}
            spellCheck={false}
          />
        </div>

        {/* Live Stats */}
        {sequenceStats && sequenceStats.length > 0 && (
          <div className="grid grid-cols-5 gap-2">
            <div className="p-3 bg-stone-100 rounded-xl text-center">
              <div className="text-xl font-bold text-black">{sequenceStats.length}</div>
              <div className="text-xs text-black/60">Length</div>
            </div>
            <div className="p-3 bg-stone-100 rounded-xl text-center">
              <div className="text-xl font-bold text-black">{sequenceStats.gcContent}%</div>
              <div className="text-xs text-black/60">GC</div>
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-center">
              <div className="text-xl font-bold text-red-600">{sequenceStats.aCount}</div>
              <div className="text-xs text-red-500">A</div>
            </div>
            <div className="p-3 bg-green-50 rounded-xl text-center">
              <div className="text-xl font-bold text-green-600">{sequenceStats.tCount}</div>
              <div className="text-xs text-green-500">T</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-center">
              <div className="text-xl font-bold text-amber-600">{sequenceStats.gCount + sequenceStats.cCount}</div>
              <div className="text-xs text-amber-500">G+C</div>
            </div>
          </div>
        )}

        {/* Advanced Controls */}
        <div className="p-4 bg-stone-50 rounded-xl space-y-4 border border-stone-100">
          <div className="text-sm font-semibold text-black/70">Generation Settings</div>
          
          {/* Organism Selector */}
          <div>
            <label className="block text-xs text-black/50 mb-2">Target Organism</label>
            <div className="flex flex-wrap gap-2">
              {ORGANISMS.map((org) => (
                <button
                  key={org.id}
                  onClick={() => setOrganism(org.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5 ${
                    organism === org.id
                      ? 'bg-black text-white'
                      : 'bg-white text-black/70 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span>{org.icon}</span>
                  {org.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-black/50 mb-1">
                Temperature: {temperature.toFixed(1)} 
                <span className="text-black/30 ml-1">({temperature < 0.4 ? 'precise' : temperature > 0.7 ? 'creative' : 'balanced'})</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-black"
              />
            </div>
            <div>
              <label className="block text-xs text-black/50 mb-1">
                Generate: {numTokens} nucleotides
              </label>
              <input
                type="range"
                min="50"
                max="300"
                step="50"
                value={numTokens}
                onChange={(e) => setNumTokens(parseInt(e.target.value))}
                className="w-full accent-black"
              />
            </div>
          </div>
        </div>

        {/* Analyze Button */}
        <motion.button
          onClick={handleAnalyze}
          disabled={!sequence || isAnalyzing}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 ${
            sequence && !isAnalyzing
              ? 'bg-black text-white shadow-lg hover:bg-stone-800'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing with Evo 2...
            </>
          ) : (
            <>
              <span>🧬</span>
              Analyze & Generate
            </>
          )}
        </motion.button>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600"
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && result.success && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Stats Grid */}
              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                  ✅ Analysis Complete
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-black">{result.data.sequence_length}</div>
                    <div className="text-xs text-black/50">Input bp</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-purple-600">{result.data.generation_length}</div>
                    <div className="text-xs text-black/50">Generated</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">{result.data.avg_confidence}%</div>
                    <div className="text-xs text-black/50">Confidence</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-green-600">{result.data.gc_content}%</div>
                    <div className="text-xs text-black/50">Input GC</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-amber-600">{result.data.elapsed_ms}ms</div>
                    <div className="text-xs text-black/50">Time</div>
                  </div>
                </div>
              </div>

              {/* Generated Sequence with Confidence Colors */}
              {result.data.generated_extension && (
                <div className="p-5 bg-white rounded-2xl border border-black/10">
                  <h4 className="font-bold text-black mb-2 flex items-center gap-2">
                    🧬 AI-Generated Sequence
                    <span className="text-xs font-normal text-black/40">
                      (color = confidence: <span className="text-red-500">low</span> → <span className="text-green-500">high</span>)
                    </span>
                  </h4>
                  <div className="p-4 bg-black/5 rounded-xl overflow-x-auto">
                    <code className="text-sm break-all leading-relaxed">
                      {result.data.confidence_scores && result.data.confidence_scores.length > 0
                        ? renderColoredSequence(result.data.generated_extension, result.data.confidence_scores)
                        : <span className="text-purple-600">{result.data.generated_extension}</span>
                      }
                    </code>
                  </div>
                  <p className="text-xs text-black/40 mt-2">
                    Evo 2 predicts this sequence would naturally follow your input based on 9 trillion nucleotides of training data.
                  </p>
                </div>
              )}

              {/* Motifs Found */}
              {result.data.motifs_found && result.data.motifs_found.length > 0 && (
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200">
                  <h4 className="font-bold text-black mb-3 flex items-center gap-2">
                    🔍 Regulatory Motifs Detected
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {result.data.motifs_found.map((motif, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg ${
                          motif.importance === 'high' ? 'bg-red-100 border border-red-200' :
                          motif.importance === 'medium' ? 'bg-amber-100 border border-amber-200' :
                          'bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <div className="font-mono font-bold text-sm">{motif.pattern}</div>
                        <div className="text-xs text-black/70">{motif.name}</div>
                        <div className="text-xs text-black/50">Found {motif.count}x • {motif.type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nucleotide Comparison */}
              {result.data.nucleotide_analysis && (
                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-200">
                  <h4 className="font-bold text-black mb-3">📊 Nucleotide Distribution</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-black/50 mb-2">Input Sequence</div>
                      <div className="flex gap-1">
                        {['A', 'T', 'G', 'C'].map((n) => {
                          const count = result.data.nucleotide_analysis?.input[n as 'A'|'T'|'G'|'C'] || 0;
                          const total = Object.values(result.data.nucleotide_analysis?.input || {}).reduce((a, b) => a + b, 0);
                          const pct = total ? (count / total * 100) : 0;
                          return (
                            <div key={n} className="flex-1">
                              <div className="h-16 bg-white rounded relative overflow-hidden">
                                <div 
                                  className={`absolute bottom-0 w-full transition-all ${
                                    n === 'A' ? 'bg-red-400' : n === 'T' ? 'bg-green-400' : n === 'G' ? 'bg-blue-400' : 'bg-amber-400'
                                  }`}
                                  style={{ height: `${pct}%` }}
                                />
                              </div>
                              <div className="text-center mt-1">
                                <div className="font-bold text-sm">{n}</div>
                                <div className="text-xs text-black/50">{pct.toFixed(0)}%</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-black/50 mb-2">Generated Sequence</div>
                      <div className="flex gap-1">
                        {['A', 'T', 'G', 'C'].map((n) => {
                          const count = result.data.nucleotide_analysis?.generated[n as 'A'|'T'|'G'|'C'] || 0;
                          const total = Object.values(result.data.nucleotide_analysis?.generated || {}).reduce((a, b) => a + b, 0);
                          const pct = total ? (count / total * 100) : 0;
                          return (
                            <div key={n} className="flex-1">
                              <div className="h-16 bg-white rounded relative overflow-hidden">
                                <div 
                                  className={`absolute bottom-0 w-full transition-all ${
                                    n === 'A' ? 'bg-red-400' : n === 'T' ? 'bg-green-400' : n === 'G' ? 'bg-blue-400' : 'bg-amber-400'
                                  }`}
                                  style={{ height: `${pct}%` }}
                                />
                              </div>
                              <div className="text-center mt-1">
                                <div className="font-bold text-sm">{n}</div>
                                <div className="text-xs text-black/50">{pct.toFixed(0)}%</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Model Info */}
              <div className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🧠</div>
                  <div>
                    <div className="font-bold text-black">Evo 2 • 40 Billion Parameters</div>
                    <div className="text-sm text-black/60">
                      Trained on 9 trillion nucleotides from 128,000+ genomes across all domains of life
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
