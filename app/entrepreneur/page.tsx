'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Venture {
  name: string;
  description: string;
  status: 'Active' | 'Exited' | 'Developing';
  industry: string;
  year: string;
  achievements: string[];
  website?: string;
}

const ventures: Venture[] = [
  {
    name: "TechStart Solutions",
    description: "SaaS platform helping small businesses automate their workflow processes and increase productivity",
    status: "Active",
    industry: "SaaS/B2B",
    year: "2023",
    achievements: ["$500K ARR", "1000+ Users", "Series A Funding"],
    website: "https://techstart-solutions.com"
  },
  {
    name: "EcoDelivery",
    description: "Sustainable last-mile delivery service using electric vehicles and optimized routing algorithms",
    status: "Exited",
    industry: "Logistics/Sustainability",
    year: "2022",
    achievements: ["Acquired by LogiCorp", "50+ Cities", "Carbon Neutral Operations"],
  },
  {
    name: "HealthTech AI",
    description: "AI-powered healthcare diagnostics platform for early disease detection and personalized treatment",
    status: "Developing",
    industry: "HealthTech/AI",
    year: "2024",
    achievements: ["FDA Approval Process", "Clinical Trials", "$2M Seed Funding"],
  }
];

const achievements = [
  { metric: "$2.5M+", label: "Total Funding Raised" },
  { metric: "3", label: "Companies Founded" },
  { metric: "50+", label: "Team Members Hired" },
  { metric: "10K+", label: "Users Impacted" }
];

export default function EntrepreneurPage() {
  const [selectedVenture, setSelectedVenture] = useState<Venture | null>(null);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Active': return 'text-green-400 bg-green-600/20';
      case 'Exited': return 'text-blue-400 bg-blue-600/20';
      case 'Developing': return 'text-yellow-400 bg-yellow-600/20';
      default: return 'text-gray-400 bg-gray-600/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <Link 
          href="/"
          className="mb-8 text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2"
        >
          ← Back to Profiles
        </Link>
        
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-4">
            Entrepreneur
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Business Strategy & Innovation
          </p>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Building scalable businesses that solve real-world problems and create lasting impact
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {achievements.map((achievement, index) => (
            <div key={index} className="text-center bg-gray-800/30 p-6 rounded-lg">
              <div className="text-3xl md:text-4xl font-bold text-green-400 mb-2">
                {achievement.metric}
              </div>
              <div className="text-gray-300 text-sm">
                {achievement.label}
              </div>
            </div>
          ))}
        </div>

        {/* Ventures */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Ventures & Companies</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {ventures.map((venture, index) => (
              <div 
                key={index}
                className="group cursor-pointer bg-gray-800/50 rounded-lg p-6 hover:bg-gray-700/50 transition-all duration-300 hover:scale-105"
                onClick={() => setSelectedVenture(venture)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold group-hover:text-green-400 transition-colors">
                    {venture.name}
                  </h3>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(venture.status)}`}>
                      {venture.status}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-gray-600/20 text-gray-400">
                      {venture.year}
                    </span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  {venture.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-green-400 bg-green-600/20 px-2 py-1 rounded">
                    {venture.industry}
                  </span>
                  <span className="text-xs text-gray-500">
                    {venture.achievements.length} key achievements
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Philosophy & Approach */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Entrepreneurial Philosophy</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800/30 p-6 rounded-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                💡
              </div>
              <h3 className="text-xl font-semibold mb-3 text-green-400">Problem-First</h3>
              <p className="text-gray-300">Start with a real problem that affects real people. The solution comes naturally when you truly understand the pain.</p>
            </div>
            <div className="bg-gray-800/30 p-6 rounded-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                🚀
              </div>
              <h3 className="text-xl font-semibold mb-3 text-green-400">Scale Smart</h3>
              <p className="text-gray-300">Build systems and processes that can grow. Focus on unit economics and sustainable growth over vanity metrics.</p>
            </div>
            <div className="bg-gray-800/30 p-6 rounded-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                🤝
              </div>
              <h3 className="text-xl font-semibold mb-3 text-green-400">Team Excellence</h3>
              <p className="text-gray-300">Hire people smarter than you, create a culture of ownership, and empower teams to make decisions.</p>
            </div>
          </div>
        </div>

        {/* Skills & Expertise */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Core Competencies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Business Strategy", skills: ["Market Analysis", "Competitive Intelligence", "Strategic Planning"] },
              { title: "Fundraising", skills: ["Pitch Decks", "Financial Modeling", "Investor Relations"] },
              { title: "Operations", skills: ["Process Optimization", "Team Building", "Performance Metrics"] },
              { title: "Product", skills: ["MVP Development", "User Research", "Product-Market Fit"] }
            ].map((area, index) => (
              <div key={index} className="bg-gray-800/30 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-green-400">{area.title}</h3>
                <ul className="space-y-2">
                  {area.skills.map((skill, skillIndex) => (
                    <li key={skillIndex} className="text-gray-300 text-sm flex items-center">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Vision */}
        <div className="text-center bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-8 rounded-lg">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Vision for the Future</h2>
          <p className="text-lg text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Building the next generation of technology companies that prioritize sustainability, social impact, and human-centered design. 
            The future belongs to businesses that can balance profit with purpose, creating value for all stakeholders.
          </p>
        </div>
      </div>

      {/* Venture Modal */}
      {selectedVenture && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedVenture(null)}>
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedVenture.name}</h2>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(selectedVenture.status)}`}>
                    {selectedVenture.status}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-green-600/20 text-green-400">
                    {selectedVenture.industry}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-gray-600/20 text-gray-400">
                    Founded {selectedVenture.year}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedVenture(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <p className="text-gray-300 mb-6">{selectedVenture.description}</p>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-green-400">Key Achievements</h3>
              <ul className="space-y-2">
                {selectedVenture.achievements.map((achievement, index) => (
                  <li key={index} className="text-gray-300 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    {achievement}
                  </li>
                ))}
              </ul>
            </div>
            {selectedVenture.website && (
              <div className="flex gap-4">
                <a href={selectedVenture.website} target="_blank" rel="noopener noreferrer" 
                   className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors">
                  Visit Website
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
