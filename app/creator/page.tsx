"use client";

import { useState } from "react";
import Link from "next/link";

interface CreativeProject {
  title: string;
  description: string;
  type: "Video" | "Writing" | "Social" | "Brand" | "Campaign";
  platform: string;
  metrics: {
    label: string;
    value: string;
  }[];
  year: string;
  link?: string;
}

const projects: CreativeProject[] = [
  {
    title: "Tech Simplified Series",
    description:
      "Educational video series breaking down complex technology concepts for everyday users",
    type: "Video",
    platform: "YouTube",
    metrics: [
      { label: "Views", value: "500K+" },
      { label: "Subscribers", value: "25K+" },
      { label: "Episodes", value: "50+" },
    ],
    year: "2023",
    link: "https://youtube.com/techsimplified",
  },
  {
    title: "Future of Work Blog",
    description:
      "In-depth articles exploring remote work trends, productivity tools, and workplace evolution",
    type: "Writing",
    platform: "Medium",
    metrics: [
      { label: "Reads", value: "100K+" },
      { label: "Followers", value: "5K+" },
      { label: "Articles", value: "75+" },
    ],
    year: "2023",
    link: "https://medium.com/@futureofwork",
  },
  {
    title: "StartupLife Stories",
    description:
      "Instagram series featuring authentic stories from startup founders and entrepreneurs",
    type: "Social",
    platform: "Instagram",
    metrics: [
      { label: "Followers", value: "15K+" },
      { label: "Engagement", value: "8.5%" },
      { label: "Stories", value: "200+" },
    ],
    year: "2024",
  },
  {
    title: "Brand Strategy Campaign",
    description:
      "Complete rebrand campaign for emerging SaaS company including messaging and visual identity",
    type: "Brand",
    platform: "Multi-Platform",
    metrics: [
      { label: "Brand Lift", value: "45%" },
      { label: "Engagement", value: "3x" },
      { label: "Reach", value: "1M+" },
    ],
    year: "2024",
  },
];

const contentPillars = [
  {
    title: "Education",
    description: "Making complex topics accessible to everyone",
    icon: "📚",
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Inspiration",
    description: "Stories that motivate and drive action",
    icon: "✨",
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "Innovation",
    description: "Exploring the cutting edge of technology",
    icon: "🚀",
    color: "from-green-500 to-teal-500",
  },
  {
    title: "Authenticity",
    description: "Real experiences and genuine connections",
    icon: "💫",
    color: "from-orange-500 to-red-500",
  },
];

export default function CreatorPage() {
  const [selectedProject, setSelectedProject] =
    useState<CreativeProject | null>(null);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Video":
        return "text-red-400 bg-red-600/20";
      case "Writing":
        return "text-blue-400 bg-blue-600/20";
      case "Social":
        return "text-pink-400 bg-pink-600/20";
      case "Brand":
        return "text-purple-400 bg-purple-600/20";
      case "Campaign":
        return "text-green-400 bg-green-600/20";
      default:
        return "text-gray-400 bg-gray-600/20";
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
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Creator
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Content & Brand Storytelling
          </p>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Crafting compelling narratives that engage, educate, and inspire
            audiences across digital platforms
          </p>
        </div>

        {/* Content Pillars */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Content Philosophy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contentPillars.map((pillar, index) => (
              <div
                key={index}
                className="bg-gray-800/30 p-6 rounded-lg text-center group hover:scale-105 transition-transform duration-300"
              >
                <div
                  className={`w-16 h-16 bg-gradient-to-r ${pillar.color} rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4`}
                >
                  {pillar.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 group-hover:text-purple-400 transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-gray-300 text-sm">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Creative Projects */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Creative Projects
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {projects.map((project, index) => (
              <div
                key={index}
                className="group cursor-pointer bg-gray-800/50 rounded-lg p-6 hover:bg-gray-700/50 transition-all duration-300 hover:scale-105"
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold group-hover:text-purple-400 transition-colors">
                    {project.title}
                  </h3>
                  <div className="flex gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${getTypeColor(
                        project.type
                      )}`}
                    >
                      {project.type}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-gray-600/20 text-gray-400">
                      {project.year}
                    </span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  {project.description}
                </p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-purple-400 bg-purple-600/20 px-2 py-1 rounded">
                    {project.platform}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {project.metrics.map((metric, metricIndex) => (
                    <div key={metricIndex} className="text-center">
                      <div className="text-lg font-bold text-purple-400">
                        {metric.value}
                      </div>
                      <div className="text-xs text-gray-500">
                        {metric.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills & Tools */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Creator Toolkit
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800/30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-purple-400">
                Content Creation
              </h3>
              <div className="space-y-3">
                {[
                  { skill: "Video Production", level: 90 },
                  { skill: "Copywriting", level: 95 },
                  { skill: "Photography", level: 85 },
                  { skill: "Graphic Design", level: 80 },
                ].map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{item.skill}</span>
                      <span className="text-purple-400">{item.level}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${item.level}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-purple-400">
                Strategy & Analytics
              </h3>
              <div className="space-y-3">
                {[
                  { skill: "Content Strategy", level: 95 },
                  { skill: "Audience Research", level: 90 },
                  { skill: "Performance Analytics", level: 85 },
                  { skill: "Brand Development", level: 88 },
                ].map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{item.skill}</span>
                      <span className="text-purple-400">{item.level}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${item.level}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-purple-400">
                Tools & Platforms
              </h3>
              <ul className="space-y-2">
                {[
                  "Adobe Creative Suite",
                  "Final Cut Pro",
                  "Figma & Canva",
                  "Analytics Dashboards",
                  "Social Media Management",
                  "Email Marketing",
                  "SEO Tools",
                  "Live Streaming Software",
                ].map((tool, index) => (
                  <li
                    key={index}
                    className="text-gray-300 text-sm flex items-center"
                  >
                    <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                    {tool}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Creative Process */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Creative Process
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Discover",
                description: "Research audience needs and trending topics",
              },
              {
                step: "2",
                title: "Ideate",
                description: "Brainstorm creative concepts and angles",
              },
              {
                step: "3",
                title: "Create",
                description: "Produce high-quality, engaging content",
              },
              {
                step: "4",
                title: "Amplify",
                description: "Distribute, analyze, and optimize performance",
              },
            ].map((phase, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                  {phase.step}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-purple-400">
                  {phase.title}
                </h3>
                <p className="text-gray-300 text-sm">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-8 rounded-lg">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Let's Create Together
          </h2>
          <p className="text-lg text-gray-300 max-w-4xl mx-auto leading-relaxed mb-6">
            Ready to tell your story? Whether it's building brand awareness,
            educating your audience, or creating viral content, let's craft
            something extraordinary that resonates with your community.
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300">
              Start a Project
            </button>
            <button className="px-8 py-3 border border-purple-500 rounded-lg hover:bg-purple-500/20 transition-all duration-300">
              View Portfolio
            </button>
          </div>
        </div>
      </div>

      {/* Project Modal */}
      {selectedProject && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="bg-gray-900 rounded-lg max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedProject.title}</h2>
                <div className="flex gap-2 mt-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${getTypeColor(
                      selectedProject.type
                    )}`}
                  >
                    {selectedProject.type}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-purple-600/20 text-purple-400">
                    {selectedProject.platform}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-gray-600/20 text-gray-400">
                    {selectedProject.year}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-300 mb-6">{selectedProject.description}</p>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">
                Performance Metrics
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {selectedProject.metrics.map((metric, index) => (
                  <div
                    key={index}
                    className="text-center bg-gray-800/50 p-3 rounded"
                  >
                    <div className="text-xl font-bold text-purple-400">
                      {metric.value}
                    </div>
                    <div className="text-sm text-gray-400">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {selectedProject.link && (
              <div className="flex gap-4">
                <a
                  href={selectedProject.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                >
                  View Project
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
