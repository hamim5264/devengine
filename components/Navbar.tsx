import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { FiMenu, FiX, FiChevronDown } from "react-icons/fi";
import { useAuthRole } from "@/hooks/useAuthRole";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const router = useRouter();
  const { user, isAdmin } = useAuthRole();

  const handleLogout = async () => {
    await signOut(auth);
    if (typeof window !== "undefined") localStorage.removeItem("isAdmin");
    router.push("/");
  };

  const dashHref = isAdmin ? "/admin/dashboard" : "/dashboard";

  const BaseLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      <Link
        href="/"
        onClick={onClick}
        className="hover:text-teal-400 transition"
      >
        Home
      </Link>

      <Link
        href="/projects"
        onClick={onClick}
        className="hover:text-teal-400 transition"
      >
        All Projects
      </Link>

      <Link
        href="/app-lab"
        onClick={onClick}
        className="hover:text-teal-400 transition"
      >
        App Lab
      </Link>

      <Link
        href="/reviews"
        onClick={onClick}
        className="hover:text-teal-400 transition"
      >
        Reviews
      </Link>

      <Link
        href="/about"
        onClick={onClick}
        className="hover:text-teal-400 transition"
      >
        About
      </Link>

      <Link
        href="/contact"
        onClick={onClick}
        className="hover:text-teal-400 transition"
      >
        Contact
      </Link>

      <Link
        href="/privacy-policy"
        onClick={onClick}
        className="hover:text-teal-400 transition whitespace-nowrap"
      >
        Privacy Policy
      </Link>
    </>
  );

  return (
    <nav className="w-full bg-black text-white shadow-md fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-teal-400">
          DevEngine
        </Link>

        {/* Desktop center nav */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="flex gap-6 text-lg">
            <BaseLinks />
          </div>
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-4 text-lg">
          {user ? (
            <>
              <Link
                href={dashHref}
                className="text-teal-400 hover:text-teal-300 transition"
              >
                Dashboard
              </Link>

              {isAdmin && (
                <div
                  className="relative"
                  onMouseLeave={() => setAdminOpen(false)}
                >
                  <button
                    onClick={() => setAdminOpen((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-teal-400 transition"
                  >
                    Admin <FiChevronDown />
                  </button>

                  {adminOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-2">
                      <Link
                        href="/admin/add-project"
                        onClick={() => setAdminOpen(false)}
                        className="block px-3 py-2 rounded-lg hover:bg-gray-800 transition"
                      >
                        Add Project
                      </Link>

                      <Link
                        href="/admin/manage-projects"
                        onClick={() => setAdminOpen(false)}
                        className="block px-3 py-2 rounded-lg hover:bg-gray-800 transition"
                      >
                        Manage Projects
                      </Link>

                      <Link
                        href="/admin/manage-tags"
                        onClick={() => setAdminOpen(false)}
                        className="block px-3 py-2 rounded-lg hover:bg-gray-800 transition"
                      >
                        Manage Tags
                      </Link>

                      <div className="border-t border-gray-700 my-2" />

                      <Link
                        href="/admin/app-lab/add"
                        onClick={() => setAdminOpen(false)}
                        className="block px-3 py-2 rounded-lg hover:bg-gray-800 transition"
                      >
                        Add App (App Lab)
                      </Link>

                      <Link
                        href="/admin/app-lab/manage"
                        onClick={() => setAdminOpen(false)}
                        className="block px-3 py-2 rounded-lg hover:bg-gray-800 transition"
                      >
                        Manage App Lab
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-500 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-teal-400 hover:text-teal-300 transition"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="text-teal-400 hover:text-white transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setIsOpen((v) => !v)}>
          {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-black px-4 pb-4 border-t border-gray-800">
          <ul className="flex flex-col gap-2 py-2 text-center text-lg">
            <BaseLinks onClick={() => setIsOpen(false)} />

            {user ? (
              <>
                <li>
                  <Link
                    href={dashHref}
                    onClick={() => setIsOpen(false)}
                    className="block py-1 text-teal-400"
                  >
                    Dashboard
                  </Link>
                </li>

                {isAdmin && (
                  <>
                    <li className="pt-2 text-sm text-gray-500">Admin</li>

                    <li>
                      <Link
                        href="/admin/add-project"
                        onClick={() => setIsOpen(false)}
                        className="block py-1 hover:text-teal-400"
                      >
                        Add Project
                      </Link>
                    </li>

                    <li>
                      <Link
                        href="/admin/manage-projects"
                        onClick={() => setIsOpen(false)}
                        className="block py-1 hover:text-teal-400"
                      >
                        Manage Projects
                      </Link>
                    </li>

                    <li>
                      <Link
                        href="/admin/manage-tags"
                        onClick={() => setIsOpen(false)}
                        className="block py-1 hover:text-teal-400"
                      >
                        Manage Tags
                      </Link>
                    </li>

                    <li className="pt-2 text-sm text-gray-500">App Lab</li>

                    <li>
                      <Link
                        href="/admin/app-lab/add"
                        onClick={() => setIsOpen(false)}
                        className="block py-1 hover:text-teal-400"
                      >
                        Add App
                      </Link>
                    </li>

                    <li>
                      <Link
                        href="/admin/app-lab/manage"
                        onClick={() => setIsOpen(false)}
                        className="block py-1 hover:text-teal-400"
                      >
                        Manage App Lab
                      </Link>
                    </li>
                  </>
                )}

                <li>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="w-full text-red-400 hover:text-red-500"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="block py-1 text-teal-400"
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    onClick={() => setIsOpen(false)}
                    className="block py-1 text-teal-400"
                  >
                    Sign Up
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </nav>
  );
}
