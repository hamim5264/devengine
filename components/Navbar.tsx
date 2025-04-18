import { useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="w-full bg-black text-white shadow-md fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-teal-400">
          DevEngine
        </Link>

        {/* Hamburger Icon */}
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Desktop Menu */}
        <ul className="hidden md:flex gap-6 text-lg">
          <li>
            <Link href="/home" className="hover:text-teal-400 transition">Home</Link>
          </li>
          <li>
            <Link href="/projects" className="hover:text-teal-400 transition">Projects</Link>
          </li>
          <li>
            <Link href="/about" className="hover:text-teal-400 transition">About</Link>
          </li>
          <li>
            <Link href="/contact" className="hover:text-teal-400 transition">Contact</Link>
          </li>
          <li>
            <Link href="/privacy-policy" className="hover:text-teal-400 transition">Privacy Policy</Link>
          </li>
        </ul>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <ul className="md:hidden bg-black px-4 pb-4 space-y-2 text-center text-lg">
          <li>
            <Link href="/home" onClick={() => setIsOpen(false)} className="block py-1 hover:text-teal-400">Home</Link>
          </li>
          <li>
            <Link href="/projects" onClick={() => setIsOpen(false)} className="block py-1 hover:text-teal-400">Projects</Link>
          </li>
          <li>
            <Link href="/about" onClick={() => setIsOpen(false)} className="block py-1 hover:text-teal-400">About</Link>
          </li>
          <li>
            <Link href="/contact" onClick={() => setIsOpen(false)} className="block py-1 hover:text-teal-400">Contact</Link>
          </li>
          <li>
            <Link href="/privacy-policy" onClick={() => setIsOpen(false)} className="block py-1 hover:text-teal-400">Privacy Policy</Link>
          </li>
        </ul>
      )}
    </nav>
  );
}
