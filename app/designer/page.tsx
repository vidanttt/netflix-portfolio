'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DesignProject {
  title: string;
  description: string;
  category: 'UI/UX' | 'Branding' | 'Web Design' | 'Mobile App';
  tools: string[];
  image: string;
  link?: string;
}

const projects: DesignProject[] = [
  {
    title: "FinTech Mobile App",
    description: "Complete UI/UX design for a cryptocurrency trading mobile application with focus on user experience",
    category: "Mobile App",
    tools: ["Figma", "Principle", "Adobe XD"],
    image: "/designs/fintech-app.jpg",
    link: "https://figma.com/fintech-design"
  },
  {
    title: "SaaS Dashboard Design",
    description: "Modern dashboard interface for analytics platform with data visualization and user management",
    category: "UI/UX",
    tools: ["Figma", "Sketch", "InVision"],
    image: "/designs/saas-dashboard.jpg"
  },
  {
    title: "Brand Identity System",
    description: "Complete brand identity including logo, typography, color palette, and brand guidelines",
    category: "Branding",
    tools: ["Adobe Illustrator", "Photoshop", "InDesign"],
    image: "/designs/brand-identity.jpg"
  },
  {
    title: "E-commerce Website",
    description: "Responsive e-commerce website design with focus on conversion optimization and user journey",
    category: "Web Design",
    tools: ["Figma", "Adobe XD", "Webflow"],
    image: "/designs/ecommerce-web.jpg",
    link: "https://ecommerce-design-demo.com"
  }
];

export default function DesignerPage() {
  const [selectedProject, setSelectedProject] = useState<DesignProject | null>(null);

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'UI/UX': return 'text-purple-400 bg-purple-600/20';
      case 'Branding': return 'text-pink-400 bg-pink-600/20';
      case 'Web Design': return 'text-blue-400 bg-blue-600/20';
      case 'Mobile App': return 'text-green-400 bg-green-600/20';
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
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Designer
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            UI/UX Design & Creative Solutions
          </p>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Creating beautiful, functional designs that enhance user experiences and drive engagement
          </p>
        </div>

        {/* Design Projects */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Design Portfolio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projects.map((project, index) => (
              <div 
                key={index}
                className="group cursor-pointer bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-700/50 transition-all duration-300 hover:scale-105"
                onClick={() => setSelectedProject(project)}
              >
                <div className="h-48 bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex items-center justify-center">
                  <div className="text-6xl opacity-30">🎨</div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold group-hover:text-purple-400 transition-colors">
                      {project.title}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(project.category)}`}>
                      {project.category}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {project.tools.slice(0, 3).map((tool, toolIndex) => (
                      <span key={toolIndex} className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Design Skills */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Design Skills</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800/30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-purple-400">Design Tools</h3>
              <div className="space-y-3">
                {[
                  { skill: "Figma", level: 95 },
                  { skill: "Adobe Creative Suite", level: 90 },
                  { skill: "Sketch", level: 85 },
                  { skill: "Principle/Framer", level: 80 }
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
              <h3 className="text-xl font-semibold mb-4 text-purple-400">Design Skills</h3>
              <div className="space-y-3">
                {[
                  { skill: "UI/UX Design", level: 92 },
                  { skill: "User Research", level: 88 },
                  { skill: "Prototyping", level: 90 },
                  { skill: "Branding", level: 85 }
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
              <h3 className="text-xl font-semibold mb-4 text-purple-400">Specializations</h3>
              <ul className="space-y-2">
                {[
                  "Mobile App Design",
                  "Web Interface Design",
                  "Design Systems",
                  "User Experience",
                  "Brand Identity",
                  "Icon Design",
                  "Responsive Design",
                  "Accessibility Design"
                ].map((spec, index) => (
                  <li key={index} className="text-gray-300 text-sm flex items-center">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                    {spec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Design Process */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Design Process</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Research", description: "Understanding user needs and market requirements" },
              { step: "2", title: "Ideate", description: "Brainstorming and conceptualizing design solutions" },
              { step: "3", title: "Design", description: "Creating wireframes, mockups, and prototypes" },
              { step: "4", title: "Test", description: "User testing and iterating based on feedback" }
            ].map((phase, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                  {phase.step}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-purple-400">{phase.title}</h3>
                <p className="text-gray-300 text-sm">{phase.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Design Philosophy */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Design Philosophy</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800/30 p-6 rounded-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                👤
              </div>
              <h3 className="text-xl font-semibold mb-3 text-purple-400">User-Centered</h3>
              <p className="text-gray-300">Every design decision is made with the user's needs and experience at the forefront.</p>
            </div>
            <div className="bg-gray-800/30 p-6 rounded-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                ⚡
              </div>
              <h3 className="text-xl font-semibold mb-3 text-purple-400">Simplicity</h3>
              <p className="text-gray-300">Clean, intuitive designs that make complex interactions feel effortless and natural.</p>
            </div>
            <div className="bg-gray-800/30 p-6 rounded-lg text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                🎯
              </div>
              <h3 className="text-xl font-semibold mb-3 text-purple-400">Purpose-Driven</h3>
              <p className="text-gray-300">Every element serves a purpose and contributes to achieving business and user goals.</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-8 rounded-lg">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Let's Create Something Beautiful</h2>
          <p className="text-lg text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Ready to elevate your product with exceptional design? I bring together creativity, 
            user research, and technical expertise to create designs that users love.
          </p>
        </div>
      </div>

      {/* Project Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedProject(null)}>
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedProject.title}</h2>
                <span className={`text-xs px-2 py-1 rounded mt-2 inline-block ${getCategoryColor(selectedProject.category)}`}>
                  {selectedProject.category}
                </span>
              </div>
              <button onClick={() => setSelectedProject(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <p className="text-gray-300 mb-6">{selectedProject.description}</p>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-purple-400">Tools Used</h3>
              <div className="flex flex-wrap gap-2">
                {selectedProject.tools.map((tool, index) => (
                  <span key={index} className="text-sm bg-purple-600/20 text-purple-400 px-3 py-1 rounded">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
            {selectedProject.link && (
              <div className="flex gap-4">
                <a href={selectedProject.link} target="_blank" rel="noopener noreferrer" 
                   className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors">
                  View Design
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
