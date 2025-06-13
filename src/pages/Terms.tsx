import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const Terms: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Logo */}
      <div className="p-6">
        <img 
          src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5XzYyZTczNWIzLTQ1MTUtNGVkNy04NjQzLTAxZjY1ZDFmOTZlYiJ9.eyJ1cmwiOiJhc3NldHMvbG9nby5wbmciLCJpYXQiOjE3NDg4MDA2NDEsImV4cCI6MjA2NDE2MDY0MX0.wNFNgarx6vPYOYs4sZiOAORnHU3qJCxZTRwEGIoA3MY" 
          alt="Kapsule" 
          className="h-8 cursor-pointer" 
          onClick={() => navigate('/')}
        />
      </div>

      <div className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12 text-center">Terms of Service</h1>
          
          <div className="prose prose-lg mx-auto text-[#868686]">
            <p className="text-center mb-8 text-gray-500">Effective Date: 2nd June 2025</p>
            
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p>By creating an account, accessing, or using Kapsule's website, mobile app, or any related services ("Services"), you confirm that you've read, understood, and agree to these Terms and our Privacy Policy.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Eligibility</h2>
              <p>To use the Services, you must be at least 13 years old or the minimum age of digital consent in your country. If you are under 18, you confirm you have permission from a parent or legal guardian.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
              <ul className="list-disc pl-6 mb-4">
                <li>You must provide accurate and complete information when creating an account.</li>
                <li>You are responsible for maintaining the confidentiality of your login details.</li>
                <li>All activity under your account is your responsibility.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Content Guidelines</h2>
              <p>When using Kapsule, you agree not to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Upload or share any content that infringes on intellectual property rights</li>
                <li>Post harmful, offensive, or illegal content</li>
                <li>Use automated systems to access or interact with the platform</li>
                <li>Attempt to disrupt or compromise the platform's security</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Music Rights</h2>
              <p>By uploading music to Kapsule, you:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Confirm you own or have the rights to share the content</li>
                <li>Grant Kapsule a non-exclusive license to host and distribute your music</li>
                <li>Maintain ownership of your original content</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Platform Rules</h2>
              <p>To maintain a fair platform for all users, we prohibit:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Artificial manipulation of plays, likes, or engagement</li>
                <li>Creation of multiple accounts to circumvent restrictions</li>
                <li>Harassment of other users</li>
                <li>Sharing of misleading or false information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Termination</h2>
              <p>Kapsule reserves the right to suspend or terminate accounts that violate these terms or engage in harmful behavior. We may also remove content that violates our guidelines.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Changes to Terms</h2>
              <p>We may update these terms periodically. We'll notify you of significant changes via email or platform notifications. Continued use of Kapsule after changes constitutes acceptance of the new terms.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Contact Us</h2>
              <p>For questions about these terms, contact us at:</p>
              <p className="mt-2">
            <br />
                support@kapsule.co
              </p>
            </section>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Terms;