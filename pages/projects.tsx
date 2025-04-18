import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const projects = [
    {
      title: "AI-Powered Solutions",
      category: "AI Series",
      description: "Predicts disease from symptoms using ML and deep learning algorithms.",
      tech: ["Python", "Scikit-learn", "TensorFlow", "Streamlit"],
      link: "#",
    },
    {
      title: "POS Billing System",
      category: "Business Projects",
      description: "A cross-platform point-of-sale system with Firebase backend, real-time inventory, and analytics dashboard.",
      tech: ["Flutter", "Firebase", "Dart"],
      link: "#",
    },
    {
      title: "University All Projects",
      category: "University Projects",
      description: "A collection of semester-wise academic projects built using core technologies for practical learning.",
      tech: ["Java", "HTML", "CSS", "Python"],
      link: "#",
    },
    {
      title: "Defense Project Showcase",
      category: "Defense Projects",
      description: "Thesis-level project with detailed documentation, authentication, and frontend/backend structure.",
      tech: ["Next.js", "MongoDB", "Firebase", "Tailwind CSS"],
      link: "#",
    },
  ];
  
  

export default function ProjectsPage() {
  return (
    <>
      <Head>
        <title>Projects | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-24 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white">
        <h1 className="text-3xl md:text-5xl font-bold mb-10 text-center">
          All Projects
        </h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <div
              key={index}
              className="border border-gray-700 rounded-xl p-6 hover:border-teal-500 transition"
            >
              <h2 className="text-xl font-semibold text-teal-400 mb-2">
                {project.title}
              </h2>
              <p className="text-sm text-gray-400 mb-2">
                <strong>Category:</strong> {project.category}
              </p>
              <p className="text-gray-300 mb-3">{project.description}</p>
              <p className="text-sm text-gray-400 mb-4">
                <strong>Tech Stack:</strong> {project.tech.join(", ")}
              </p>
              <a
                href={project.link}
                className="text-teal-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Project →
              </a>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
