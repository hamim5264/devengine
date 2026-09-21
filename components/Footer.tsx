import {
  FaLinkedin,
  FaGithub,
  FaFacebook,
  FaYoutube,
  FaInstagram,
  FaXTwitter,
} from "react-icons/fa6";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-tr from-gray-900 to-black text-white py-10 px-6 mt-0 border-t-[1px] border-teal-500/30 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 md:gap-0">
        {/* Left Section */}
        <div className="text-center md:text-left">
          <h3 className="text-lg font-semibold text-teal-400 mb-1">
            Connect with DevEngine
          </h3>
          <p className="text-sm text-gray-400">
            Engineering the Cinematic Future. High-fidelity, performant digital ecosystems.
          </p>
        </div>

        {/* Social Icons */}
        <div className="flex gap-5 text-2xl items-center">
          <a
            href="https://github.com/DevEngine-Build-Fast-Learn-Smart"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-400 transition transform hover:scale-110"
            title="GitHub"
          >
            <FaGithub />
          </a>
          <a
            href="https://www.linkedin.com/in/abdul-hamim-a35b02253/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-400 transition transform hover:scale-110"
            title="LinkedIn"
          >
            <FaLinkedin />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61575608701014"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-400 transition transform hover:scale-110"
            title="Facebook"
          >
            <FaFacebook />
          </a>
          <a
            href="https://www.youtube.com/@TheDevHamim"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-400 transition transform hover:scale-110 text-2xl"
            title="YouTube"
          >
            <FaYoutube />
          </a>
        </div>

        {/* Copyright */}
        <p className="text-xs text-gray-500 text-center md:text-right">
          ©{" "}
          <Link
            href="/copyright"
            className="text-teal-400 font-semibold hover:underline"
          >
            DevEngine
          </Link>{" "}
          2025. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
