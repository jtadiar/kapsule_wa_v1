import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import TextInput from '../components/TextInput';
import Button from '../components/Button';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, error, isLoading, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };
  
  const validateForm = () => {
    let valid = true;
    const newErrors = { ...formErrors };
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
      valid = false;
    }
    
    setFormErrors(newErrors);
    return valid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      const { data, error: signInError } = await signIn(formData.email, formData.password);
      
      if (signInError) {
        console.error('Sign in error:', signInError);
        return;
      }

      if (data?.user) {
        navigate('/player');
      }
    } catch (err) {
      console.error('Error during login:', err);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-6">
        <button
          onClick={() => navigate(-1)}
          className="text-primary hover:text-primary-hover transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={24} />
          <span>Back</span>
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <h1 className="text-3xl font-bold mb-8 text-center">Log In</h1>
          
          <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <div className="w-full mb-6">
              <TextInput
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                error={formErrors.email}
              />
              
              <TextInput
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                error={formErrors.password}
              />
            </div>
            
            {error && (
              <p className="text-primary text-sm mb-4">{error}</p>
            )}
            
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Don't have an account?{' '}
              <span 
                className="text-primary cursor-pointer"
                onClick={() => navigate('/account-type')}
              >
                Sign Up
              </span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;