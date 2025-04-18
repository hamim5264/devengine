import {
    FaLinkedin,
    FaGithub,
    FaInstagram,
    FaFacebook,
    FaXTwitter,
  } from "react-icons/fa6";
  
  export default function Footer() {
    return (
      <footer className="bg-black text-white py-6 px-4 mt-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400 text-center md:text-left">
            © DevEngine 2025. All rights reserved.
          </p>
  
          <div className="flex gap-4 text-xl justify-center">
            <a
              href="https://www.linkedin.com/in/abdul-hamim-a35b02253?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-400 transition"
            >
              <FaLinkedin />
            </a>
            <a
              href="https://github.com/hamim5264"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-400 transition"
            >
              <FaGithub />
            </a>
            <a
              href="https://www.instagram.com/hamimleon?igsh=aTV3Zm8xemFoNmZu&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-400 transition"
            >
              <FaInstagram />
            </a>
            <a
              href="https://www.facebook.com/share/18wTRxW6Fk/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-400 transition"
            >
              <FaFacebook />
            </a>
            <a
              href="https://x.com/yourprofile"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal-400 transition"
            >
              <FaXTwitter />
            </a>
          </div>
        </div>
      </footer>
    );
  }
  