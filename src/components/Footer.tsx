import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Footer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleNavigation = (path: string) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path);
      window.scrollTo({ top: 0 });
    }
  };

  return (
    <>
      <div className="h-[10px] bg-white w-full" />
      <footer className="bg-[#ffffff] text-[#868686]">
        <div className="container mx-auto px-6 pt-16 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* Logo Section */}
            <div className="lg:col-span-1">
              <img 
                src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/kapsule%20logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMva2Fwc3VsZSBsb2dvLnBuZyIsImlhdCI6MTc0ODc5MzQ2OCwiZXhwIjoyMDY0MTUzNDY4fQ.ZGlbV2HKwlL1bqrPQJP5tj85nATiT59OA_XpuYHhebE" 
                alt="Kapsule" 
                className="h-12 mb-6"
              />
            </div>

            {/* Product Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Product</h3>
              <ul className="space-y-3">
                <li>
                  <button 
                    onClick={() => handleNavigation('/about')}
                    className="text-[#868686] hover:text-gray-900 hover:underline"
                  >
                    About
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleNavigation('/how-it-works')}
                    className="text-[#868686] hover:text-gray-900 hover:underline"
                  >
                    How It Works
                  </button>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Company</h3>
              <ul className="space-y-3">
                <li>
                  <button 
                    onClick={() => handleNavigation('/our-story')}
                    className="text-[#868686] hover:text-gray-900 hover:underline"
                  >
                    Our Story
                  </button>
                </li>
                <li><a href="#" className="text-[#868686] hover:text-gray-900 hover:underline">Careers</a></li>
                <li><a href="#" className="text-[#868686] hover:text-gray-900 hover:underline">Press</a></li>
                <li><a href="#" className="text-[#868686] hover:text-gray-900 hover:underline">Blog</a></li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <button 
                    onClick={() => handleNavigation('/terms')}
                    className="text-[#868686] hover:text-gray-900 hover:underline"
                  >
                    Terms of Service
                  </button>
                </li>
                <li><a href="#" className="text-[#868686] hover:text-gray-900 hover:underline">Privacy Policy</a></li>
                <li><a href="#" className="text-[#868686] hover:text-gray-900 hover:underline">Cookie Policy</a></li>
                <li><a href="#" className="text-[#868686] hover:text-gray-900 hover:underline">DMCA Policy</a></li>
              </ul>
            </div>

            {/* Help Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Help</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-[#868686] hover:text-gray-900 hover:underline">Support / FAQ</a></li>
                <li><a href="#" className="text-[#868686] hover:text-gray-900 hover:underline">Contact Us</a></li>
                <li><a href="#" className="text-[#868686] hover:text-gray-900 hover:underline">Report a Bug</a></li>
                <li><a href="#" className="text-[#868686] hover:text-gray-900 hover:underline">Artist Guidelines</a></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-300 pt-8 text-center">
            <p className="text-[#868686]">
              © 2025 Kapsule. All rights reserved. Made with ❤️ for undiscovered music.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;