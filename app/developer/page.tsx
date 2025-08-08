'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Project {
  title: string;
  description: string;
  tech: string[];
  image: string;
  link?: string;
  github?: string;
}

const projects: Project[] = [
  {
    title: "Netflix Portfolio",
    description: "A creative portfolio website designed like Netflix's interface with smooth animations and premium UI/UX",
    tech: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
    image: "/projects/netflix-portfolio.jpg",
    github: "https://github.com/sumanthsamala/netflix-portfolio"
  },
  {
    title: "E-Commerce Platform",
    description: "Full-stack e-commerce solution with payment integration, admin dashboard, and real-time inventory",
    tech: ["React", "Node.js", "MongoDB", "Stripe API", "Socket.io"],
    image: "/projects/ecommerce.jpg",
    link: "https://ecommerce-demo.com"
  },
  {
    title: "Task Management App",
    description: "Collaborative project management tool with real-time updates, drag-and-drop functionality",
    tech: ["Vue.js", "Express.js", "PostgreSQL", "WebSockets"],
    image: "/projects/task-manager.jpg",
    link: "https://taskmanager-demo.com"
  },
  {
    title: "AI Chat Bot",
    description: "Intelligent chatbot with natural language processing and machine learning capabilities",
    tech: ["Python", "TensorFlow", "Flask", "OpenAI API"],
    image: "/projects/chatbot.jpg",
    github: "https://github.com/sumanthsamala/ai-chatbot"
  }
];

export default function DeveloperPage() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            Developer
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Full-Stack Development & Web Technologies
          </p>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Crafting scalable web applications with modern technologies and best practices
          </p>
        </div>

        {/* Projects Grid */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Featured Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projects.map((project, index) => (
              <div 
                key={index}
                className="group cursor-pointer bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-700/50 transition-all duration-300 hover:scale-105"
                onClick={() => setSelectedProject(project)}
              >
                <div className="h-48 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 flex items-center justify-center">
                  <div className="text-6xl opacity-30">💻</div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {project.tech.slice(0, 3).map((tech, techIndex) => (
                      <span key={techIndex} className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                        {tech}
                      </span>
                    ))}
                    {project.tech.length > 3 && (
                      <span className="text-xs bg-gray-600/20 text-gray-400 px-2 py-1 rounded">
                        +{project.tech.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills Section */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Technical Skills</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800/30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-blue-400">Frontend</h3>
              <div className="space-y-3">
                {[
                  { skill: "React/Next.js", level: 95 },
                  { skill: "TypeScript", level: 90 },
                  { skill: "Tailwind CSS", level: 92 },
                  { skill: "Vue.js", level: 85 }
                ].map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{item.skill}</span>
                      <span className="text-blue-400">{item.level}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${item.level}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-blue-400">Backend</h3>
              <div className="space-y-3">
                {[
                  { skill: "Node.js", level: 88 },
                  { skill: "Python", level: 85 },
                  { skill: "PostgreSQL", level: 82 },
                  { skill: "MongoDB", level: 80 }
                ].map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{item.skill}</span>
                      <span className="text-blue-400">{item.level}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${item.level}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-blue-400">Tools & Others</h3>
              <ul className="space-y-2">
                {[
                  "Git & GitHub",
                  "Docker",
                  "AWS/Vercel",
                  "REST APIs",
                  "GraphQL",
                  "Jest/Testing",
                  "CI/CD",
                  "Agile/Scrum"
                ].map((tool, index) => (
                  <li key={index} className="text-gray-300 text-sm flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                    {tool}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Experience */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Experience</h2>
          <div className="space-y-8">
            {[
              {
                title: "Senior Full Stack Developer",
                company: "TechCorp Inc.",
                period: "2023 - Present",
                description: "Lead development of enterprise-scale applications using React, Node.js, and cloud technologies."
              },
              {
                title: "Frontend Developer",
                company: "StartupXYZ",
                period: "2021 - 2023",
                description: "Built responsive web applications and implemented modern UI/UX designs for various client projects."
              },
              {
                title: "Junior Developer",
                company: "WebSolutions Ltd.",
                period: "2020 - 2021",
                description: "Collaborated on multiple web projects, gained experience in full-stack development and team workflows."
              }
            ].map((job, index) => (
              <div key={index} className="bg-gray-800/30 p-6 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-blue-400">{job.title}</h3>
                  <span className="text-sm text-gray-400">{job.period}</span>
                </div>
                <p className="text-gray-300 font-medium mb-2">{job.company}</p>
                <p className="text-gray-400">{job.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="text-center bg-gradient-to-r from-blue-600/20 to-cyan-600/20 p-8 rounded-lg">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Let's Build Something Amazing</h2>
          <p className="text-lg text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Ready to bring your ideas to life? I specialize in creating high-performance, 
            scalable web applications that deliver exceptional user experiences.
          </p>
        </div>
      </div>

      {/* Project Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedProject(null)}>
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">{selectedProject.title}</h2>
              <button onClick={() => setSelectedProject(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <p className="text-gray-300 mb-4">{selectedProject.description}</p>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-blue-400">Technologies Used</h3>
              <div className="flex flex-wrap gap-2">
                {selectedProject.tech.map((tech, index) => (
                  <span key={index} className="text-sm bg-blue-600/20 text-blue-400 px-3 py-1 rounded">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              {selectedProject.link && (
                <a href={selectedProject.link} target="_blank" rel="noopener noreferrer" 
                   className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors">
                  Live Demo
                </a>
              )}
              {selectedProject.github && (
                <a href={selectedProject.github} target="_blank" rel="noopener noreferrer" 
                   className="px-6 py-2 border border-blue-500 rounded hover:bg-blue-500/20 transition-colors">
                  View Code
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
