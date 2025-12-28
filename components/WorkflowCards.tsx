'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface Step {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    number: "01",
    title: "Select Patient",
    description: "Doctor logs in and selects a patient from their roster to assess disease risk",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    number: "02",
    title: "Run Prediction",
    description: "Platform analyzes clinical data + genomic risk (PRS) and generates risk assessment in real-time",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    )
  },
  {
    number: "03",
    title: "Review Insights",
    description: "Doctor reviews SHAP explanations showing which features drove the prediction and why",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    number: "04",
    title: "Make Decision",
    description: "Ask AI assistant for recommendations, view treatment options, and log clinical decision",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
];

export default function WorkflowCards() {
  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Horizontal Flow */}
      <div className="relative">
        {/* Desktop: Horizontal */}
        <div className="hidden md:flex items-stretch justify-between gap-6">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              {/* Step Card */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex-1 relative group"
              >
                <div className="h-full bg-white rounded-2xl p-6 border border-black/5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
                  {/* Subtle background gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-black/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Header */}
                  <div className="relative flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black/60 group-hover:bg-black group-hover:text-white transition-colors duration-300">
                      {step.icon}
                    </div>
                    <span className="text-4xl font-bold text-black/5 group-hover:text-black/10 transition-colors font-mono">
                      {step.number}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <h3 className="relative text-lg font-bold text-black mb-3 group-hover:text-black/80">
                    {step.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="relative text-sm text-black/60 leading-relaxed group-hover:text-black/70">
                    {step.description}
                  </p>
                  
                  {/* Bottom Line Indicator */}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5 group-hover:bg-black/10 transition-colors">
                    <div className="h-full bg-black w-0 group-hover:w-full transition-all duration-700 ease-out opacity-20" />
                  </div>
                </div>
              </motion.div>
              
              {/* Arrow between steps */}
              {index < steps.length - 1 && (
                <div className="flex items-center justify-center flex-shrink-0 pt-16 opacity-30">
                  <svg 
                    className="w-6 h-6 text-black" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Mobile: Vertical */}
        <div className="md:hidden space-y-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black/60">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-bold text-black">
                    {step.title}
                  </h3>
                </div>
                
                <p className="text-sm text-black/60 leading-relaxed pl-14">
                  {step.description}
                </p>
              </div>
              
              {/* Arrow down */}
              {index < steps.length - 1 && (
                <div className="flex justify-center py-4 opacity-30">
                  <svg 
                    className="w-6 h-6 text-black rotate-90" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Bottom feature badges */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        viewport={{ once: true }}
        className="mt-16"
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          {['Privacy-preserving', 'Federated learning', 'SHAP explainability', 'Full auditability'].map((badge) => (
            <div
              key={badge}
              className="bg-white px-4 py-2 rounded-full border border-black/5 shadow-sm text-xs font-medium text-black/60 hover:border-black/20 hover:text-black transition-all cursor-default"
            >
              {badge}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
