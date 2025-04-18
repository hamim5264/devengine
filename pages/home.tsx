import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FaBrain, FaBriefcase, FaUniversity, FaShieldAlt, FaCogs } from "react-icons/fa";

export default function Home() {
  const categories = [
    {
      title: "AI Series",
      description: "Projects based on AI, ML, and Data Science.",
      icon: <FaBrain size={24} />,
    },
    {
      title: "Business Projects",
      description: "POS, inventory, and management systems.",
      icon: <FaBriefcase size={24} />,
    },
    {
      title: "University Projects",
      description: "Academic and semester-wise mini projects.",
      icon: <FaUniversity size={24} />,
    },
    {
      title: "Defense Projects",
      description: "Final year thesis & advanced research builds.",
      icon: <FaShieldAlt size={24} />,
    },
    {
      title: "Professional Projects",
      description: "Client-ready systems and premium builds.",
      icon: <FaCogs size={24} />,
    },
  ];

  return (
    <>
      <Head>
        <title>DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-24 min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        {/* 👑 Hero Section */}
        <div className="text-center px-6 pt-24 pb-28"> {/* 👈 increase pb-28 here */}
  <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-teal-400 to-blue-500 text-transparent bg-clip-text">
    DevEngine: Build Fast. Learn Smart.
  </h1>
  <p className="text-lg md:text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
    Buy ready-made projects or request custom-built solutions designed for students, startups, and developers.
  </p>
  <button className="bg-teal-500 hover:scale-105 hover:bg-teal-600 text-white px-6 py-3 rounded-xl transition text-lg shadow-lg">
    🚀 Explore Projects
  </button>
</div>


        {/* 📁 Project Categories Section */}
        <section className="py-20 px-6 md:px-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Project Categories
          </h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, index) => (
              <div
                key={index}
                className="border border-gray-700 rounded-xl p-6 hover:border-teal-500 transition bg-gray-800 shadow-md"
              >
                <div className="text-teal-400 mb-4">{cat.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{cat.title}</h3>
                <p className="text-gray-300 mb-4">{cat.description}</p>
                <button className="text-teal-400 hover:underline">
                  View Projects →
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
