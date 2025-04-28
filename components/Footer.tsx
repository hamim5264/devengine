import {
  FaLinkedin,
  FaGithub,
  FaInstagram,
  FaFacebook,
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
            Connect with Me
          </h3>
          <p className="text-sm text-gray-400">
            Let’s build something amazing together!
          </p>
        </div>

        {/* Social Icons */}
        <div className="flex gap-5 text-2xl">
          <a
            href="https://www.linkedin.com/in/abdul-hamim-a35b02253?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-400 transition transform hover:scale-110"
          >
            <FaLinkedin />
          </a>
          <a
            href="https://github.com/hamim5264"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-400 transition transform hover:scale-110"
          >
            <FaGithub />
          </a>
          <a
            href="https://www.instagram.com/hamimleon?igsh=aTV3Zm8xemFoNmZu&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-400 transition transform hover:scale-110"
          >
            <FaInstagram />
          </a>
          <a
            href="https://www.facebook.com/share/18wTRxW6Fk/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-400 transition transform hover:scale-110"
          >
            <FaFacebook />
          </a>
          <a
            href="https://x.com/hamim_leon?s=21"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal-400 transition transform hover:scale-110"
          >
            <FaXTwitter />
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
