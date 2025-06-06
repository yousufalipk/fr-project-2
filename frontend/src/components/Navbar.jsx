"use client";

import { MdKeyboardArrowDown } from "react-icons/md";
import logo from "./assets/logo.jpeg"
import Image from "next/image";
import Link from "next/link";

const Navbar = () => {
  return (
    <nav
      className="bg-gray-900 px-8 fixed w-[100%] z-50"
      style={{ borderBottom: "1px solid rgb(51 65 85)" }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo Section */}
        <Link href='/' className="flex items-center space-x-2">
          <Image
            src={logo}
            height={100}
            alt="logo"
            width={100}
            className="h-24 w-24 overflow-hidden p-2"
          />

        </Link>

        <div className="flex items-center justify-between gap-12">
          {/* Menu Items */}

          <div className="hidden md:flex text-gray-300 gap-12">
            <a href="/unified-search" className="hover:text-white">
              Search
            </a>
            <a href="/business" className="hover:text-white">
              Business
            </a>
            <a href="/PropertyCompany" className="hover:text-white">
              Property Company
            </a>
            <a href="/map" className="hover:text-white">
              Map
            </a>
            <a href="/phone" className="hover:text-white">
              Phone
            </a>
            <a href="/email" className="hover:text-white">
              Email
            </a>
            <div className="relative group">
              <button className="hover:text-white flex items-center">
                Contact{" "}
                <span className="ml-1">
                  <MdKeyboardArrowDown />
                </span>
              </button>
              {/* Dropdown (hidden by default) */}
              <div className="absolute hidden group-hover:block bg-gray-800 rounded-md mt-2 p-1 shadow-lg text-sm w-[140px]">
                <a
                  href="#"
                  className="block px-4 py-2 hover:bg-gray-700 rounded-md"
                >
                  Contact Us
                </a>
                <a
                  href="#"
                  className="block px-4 py-2 hover:bg-gray-700 rounded-md"
                >
                  Book a meeting
                </a>
              </div>
            </div>
          </div>

          {/* Sign In Button */}
          <div>
            <a
              href="/signin"
              className="bg-gradient-to-r from-teal-400 to-blue-600 text-white px-7 py-3 rounded-full hover:opacity-90 text-sm font-semibold"
            >
              Sign in
            </a>
          </div>
        </div>
      </div>
    </nav >
  );
};

export default Navbar;
