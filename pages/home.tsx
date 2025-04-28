import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useState } from "react";
import { FaBriefcase, FaRobot, FaCode } from "react-icons/fa6";
import { FaUniversity, FaCogs } from "react-icons/fa";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const offerings = [
    {
      title: "Business Application Projects",
      description: "Robust POS, inventory, and ERP systems for enterprises.",
      icon: <FaBriefcase size={28} />,
    },
    {
      title: "AI Application Projects",
      description: "Smart solutions using Machine Learning and Data Science.",
      icon: <FaRobot size={28} />,
    },
    {
      title: "Defense Projects for University Students",
      description: "Well-documented, thesis-ready final year submissions.",
      icon: <FaUniversity size={28} />,
    },
    {
      title: "Basic Application Projects",
      description: "Simple apps perfect for academic or personal portfolios.",
      icon: <FaCode size={28} />,
    },
    {
      title: "Client-Based Customized Projects",
      description: "Tailored applications built to match your business needs.",
      icon: <FaCogs size={28} />,
    },
  ];

  const filteredOfferings = offerings.filter((offer) =>
    offer.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-24 min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        {/* Hero Section */}
        <div className="text-center px-6 pt-24 pb-36 relative">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-teal-400 to-blue-500 text-transparent bg-clip-text">
            DevEngine: Build Fast. Learn Smart.
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
            Buy ready-made software or request custom enterprise-level solutions
            — built for students, startups, and business owners.
          </p>

          <div className="flex justify-center mt-8">
            <Link href="/projects">
              <button className="relative px-8 py-3 text-lg rounded-full font-semibold text-white shadow-lg bg-black overflow-hidden group border-2 border-teal-400">
                <span className="absolute inset-0 rounded-full border-2 border-teal-400 animate-[spin_3s_linear_infinite] group-hover:border-blue-500"></span>
                <span className="relative z-10 flex items-center gap-2">
                  🚀 Explore Projects
                </span>
              </button>
            </Link>
          </div>
        </div>

        {/* Search Field */}
        <div className="max-w-xl mx-auto mb-10 px-6 md:px-20">
          <input
            type="text"
            placeholder="🔍 Search by project name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-teal-500 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-lg"
          />
        </div>

        {/* Offerings Section */}
        <section className="py-20 px-6 md:px-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What We Offer
          </h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredOfferings.map((offer, index) => (
              <div
                key={index}
                className="border border-gray-700 rounded-xl p-6 hover:border-teal-500 bg-gray-900 transition shadow-md cursor-pointer hover:shadow-teal-400/30 hover:shadow-lg"
                onClick={() => setSelectedCategory(offer.description)}
              >
                <div className="text-teal-400 mb-4 flex justify-center">
                  {offer.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center">
                  {offer.title}
                </h3>
                <p className="text-gray-300 mb-4 text-sm text-center">
                  {offer.description}
                </p>
              </div>
            ))}
          </div>

          {selectedCategory && (
            <div className="mt-10 bg-gray-900 p-6 rounded-xl border border-teal-600 text-gray-200">
              <h3 className="text-xl font-bold mb-2 text-teal-400">Details</h3>
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
              Upon successful purchase, full copyright ownership of the
              purchased project will be granted to the client, ensuring
              exclusive usage rights.
            </li>
            <li>
              All projects are delivered "as is" at the time of purchase. Any
              modifications, upgrades, or additional customizations requested
              afterward may incur additional charges based on mutual agreement.
            </li>
            <li>
              Before proceeding with any purchase, clients must review and
              accept the Terms & Conditions to ensure clear understanding and
              agreement with DevEngine’s policies.
            </li>
            <li>
              For custom software development services, a three-phase payment
              structure is applicable:
              <ul className="list-disc list-inside ml-6">
                <li>70% upfront before project initiation</li>
                <li>30% before final project delivery</li>
                <li>
                  Post-delivery maintenance and support will be billed
                  separately as per mutual agreement
                </li>
              </ul>
            </li>
            <li>
              Project delivery timelines, revision policies, and ongoing support
              details will be clearly outlined and agreed upon during the
              initial purchase discussion.
            </li>
            <li>
              DevEngine is not responsible for any misuse, resale, or
              redistribution of the purchased projects without prior
              authorization after ownership transfer.
            </li>
          </ul>
        </section>
      </main>

      <Footer />
    </>
  );
}
