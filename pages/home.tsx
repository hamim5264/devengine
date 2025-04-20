import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState } from "react";
import {
  FaBrain,
  FaBriefcase,
  FaUniversity,
  FaShieldAlt,
  FaCogs,
} from "react-icons/fa";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const categories = [
    {
      title: "Intelligent Systems",
      description: "Solutions powered by Machine Learning and Data Analysis.",
      icon: <FaBrain size={24} />,
      details:
        "These projects are focused on AI, ML, and data-driven solutions such as disease predictors, recommendation engines, or intelligent automation tools.",
    },
    {
      title: "Business Projects",
      description: "POS, inventory, and management systems.",
      icon: <FaBriefcase size={24} />,
      details:
        "Projects tailored for small businesses or enterprises including inventory control, POS systems, invoicing tools, and sales tracking platforms.",
    },
    {
      title: "University Projects",
      description: "Academic and semester-wise software projects.",
      icon: <FaUniversity size={24} />,
      details:
        "These are academic solutions such as quiz platforms, student portals, course planners, and other university-focused tools with documentation.",
    },
    {
      title: "Defense Projects",
      description: "Final year thesis & advanced research-based builds.",
      icon: <FaShieldAlt size={24} />,
      details:
        "These are professional-level thesis submissions with complex documentation, use-case validation, and cutting-edge implementation.",
    },
    {
      title: "Professional Solutions",
      description: "Industry-ready systems for real-world application.",
      icon: <FaCogs size={24} />,
      details:
        "Enterprise-grade apps and tools built for clients, featuring payment gateways, user dashboards, APIs, and robust backend integration.",
    },
  ];

  const filteredCategories = categories.filter((cat) =>
    cat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-24 min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        {/* Hero Section */}
        <div className="text-center px-6 pt-24 pb-28">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-teal-400 to-blue-500 text-transparent bg-clip-text">
            DevEngine: Build Fast. Learn Smart.
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
            Buy ready-made software or request custom enterprise-level solutions — built for students, startups, and business owners.
          </p>
          <Link href="/projects">
            <button className="bg-teal-500 hover:scale-105 hover:bg-teal-600 text-white px-6 py-3 rounded-xl transition text-lg shadow-lg">
              🚀 Explore Projects
            </button>
          </Link>
        </div>

        {/* Project Categories Section */}
        <section className="py-20 px-6 md:px-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Project Categories
          </h2>

          <div className="max-w-xl mx-auto mb-10">
            <input
              type="text"
              placeholder="Search by category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:border-teal-400"
            />
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((cat, index) => (
              <div
                key={index}
                className="border border-gray-700 rounded-xl p-6 hover:border-teal-500 transition bg-gray-800 shadow-md cursor-pointer"
                onClick={() => setSelectedCategory(cat.details)}
              >
                <div className="text-teal-400 mb-4">{cat.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{cat.title}</h3>
                <p className="text-gray-300 mb-4">{cat.description}</p>
                <span className="text-teal-400 hover:underline">View Details →</span>
              </div>
            ))}
          </div>

          {selectedCategory && (
            <div className="mt-10 bg-gray-900 p-6 rounded-xl border border-teal-600 text-gray-200">
              <h3 className="text-xl font-bold mb-2 text-teal-400">Category Details</h3>
              <p>{selectedCategory}</p>
            </div>
          )}
        </section>

        {/* Terms and Conditions Section */}
        <section className="py-16 px-6 md:px-20 bg-gray-800 rounded-xl text-white mt-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center text-teal-400">
            Terms & Conditions
          </h2>
          <ul className="list-disc list-inside space-y-4 text-lg text-gray-300">
            <li>
              Each completed solution includes a license agreement. Full ownership is granted unless explicitly stated otherwise in a signed agreement.
            </li>
            <li>
              In certain partnership-based projects, DevEngine reserves the right to retain partial ownership (up to 50%) based on scope and innovation.
            </li>
            <li>
              For custom software development, a 3-phase payment structure is required:
              <ul className="list-disc list-inside ml-6">
                <li>70% upfront before development begins</li>
                <li>30% before final delivery</li>
                <li>Post-deployment maintenance is billed separately, based on mutual agreement</li>
              </ul>
            </li>
            <li>
              All clients must complete and digitally sign the Terms & Conditions Agreement Form before project initiation.
            </li>
            <li>
              Project timelines and post-sale support will be agreed upon and added to the final agreement.
            </li>
          </ul>

          <div className="text-center mt-8">
            <Link href="/terms-form" className="text-teal-400 underline text-lg">
              Fill Out Terms & Conditions Form
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}



