import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState } from "react";

const projects = [
  {
    id: "craftybay",
    title: "CraftyBay",
    subtitle: "E-Commerce App with Payment Integration",
    link: "/projects/craftybay",
    category: "android",
    price: 70000,
    tag: ["most-popular"],
  },
  {
    id: "quizcrafter-beta",
    title: "QuizCrafter Beta",
    subtitle: "Simple Quiz Application",
    link: "/projects/quizcrafter-beta",
    category: "android",
    price: 15000,
    tag: ["trending", "students-favourite"],
  },
  {
    id: "quizcrafter-premium",
    title: "QuizCrafter Premium",
    subtitle: "World-Class Quiz App with Earning System",
    link: "/projects/quizcrafter-premium",
    category: "android",
    price: 50000,
    tag: ["most-popular"],
  },
  {
    id: "find-it",
    title: "Find It",
    subtitle: "Lost and Found Application",
    link: "/projects/find-it",
    category: "android",
    price: 20000,
    tag: ["trending", "new", "students-favourite"],
  },
  {
    id: "task-manager",
    title: "Task Manager",
    subtitle: "Simple Task Management App",
    link: "/projects/task-manager",
    category: "android",
    price: 7000,
    tag: [],
  },
  {
    id: "quizwhiz",
    title: "QuizWhiz",
    subtitle: "Java-Based Quiz Application",
    link: "/projects/quizwhiz",
    category: "desktop",
    price: 20,
    tag: ["students-favourite"],
  },
];

const ProjectSection = ({ title, tag, projects }: any) => {
  const filtered = projects.filter((p: any) => p.tag.includes(tag));

  if (filtered.length === 0) return null;

  return (
    <div className="mb-16">
      <h2 className="text-2xl md:text-3xl font-semibold text-teal-400 mb-6">
        {title}
      </h2>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project: any) => (
          <Link
            key={project.id}
            href={project.link}
            className="group block bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-teal-500 shadow-xl hover:shadow-teal-500/40 hover:scale-105 transition-all duration-300"
          >
            <h2 className="text-xl font-bold text-white group-hover:text-teal-400 mb-2">
              {project.title}
            </h2>
            <p className="text-gray-400 group-hover:text-gray-300 text-sm mb-1">
              {project.subtitle}
            </p>
            <p className="text-sm text-teal-400 font-semibold">
              Price: BDT {project.price.toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default function ProjectsPage() {
  const [priceRange, setPriceRange] = useState(100000);
  const [category, setCategory] = useState("all");

  const filteredProjects = projects.filter((project) => {
    const matchesPrice = project.price <= priceRange;
    const matchesCategory = category === "all" || project.category === category;
    return matchesPrice && matchesCategory;
  });

  return (
    <>
      <Head>
        <title>Projects | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-24 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-12 text-teal-400">
          All Projects
        </h1>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-12">
          <div className="flex flex-col gap-3 w-full md:w-1/2 bg-gray-800 p-4 rounded-xl shadow-md h-36 justify-center">
            <label className="text-sm text-teal-400 font-semibold">
              Filter by Price (Up to BDT {priceRange.toLocaleString()})
            </label>
            <input
              type="range"
              min="1000"
              max="100000"
              step="1000"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-3 w-full md:w-1/2 bg-gray-800 p-4 rounded-xl shadow-md h-36 justify-center">
            <label className="text-sm text-teal-400 font-semibold">
              Filter by Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-gray-900 border border-teal-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner"
            >
              <option value="all">All</option>
              <option value="android">Android</option>
              <option value="ios">iOS</option>
              <option value="desktop">Desktop</option>
            </select>
          </div>
        </div>

        <ProjectSection
          title="Most Popular"
          tag="most-popular"
          projects={filteredProjects}
        />
        <ProjectSection
          title="Trending"
          tag="trending"
          projects={filteredProjects}
        />
        <ProjectSection
          title="New Releases"
          tag="new"
          projects={filteredProjects}
        />
        <ProjectSection
          title="Students' Favourite"
          tag="students-favourite"
          projects={filteredProjects}
        />
      </main>

      <Footer />
    </>
  );
}
