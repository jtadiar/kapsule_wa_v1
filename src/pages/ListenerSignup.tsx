import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import TextInput from '../components/TextInput';
import Button from '../components/Button';

const ListenerSignup: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, error, isLoading, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  
  const [formErrors, setFormErrors] = useState({
    username: '',
    email: '',
    password: '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
    if (error) clearError();
  };
  
  const validateForm = () => {
    let valid = true;
    const newErrors = { ...formErrors };
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
      valid = false;
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      valid = false;
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }
    
    setFormErrors(newErrors);
    return valid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      const { data, error: signUpError } = await signUp(formData.email, formData.password, {
        username: formData.username,
        role: 'listener',
      });
      
      if (signUpError) {
        if (signUpError.message === 'User already registered') {
          setFormErrors({
            ...formErrors,
            email: 'This email is already registered. Please use a different email or log in.',
          });
        } else {
          setFormErrors({
            ...formErrors,
            email: signUpError.message,
          });
        }
        return;
      }
      
      if (data?.user) {
        navigate('/player');
      }
    } catch (err: any) {
      console.error('Error during signup:', err);
      setFormErrors({
        ...formErrors,
        email: err.message || 'An error occurred during signup',
      });
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-6">
        <button
          onClick={() => navigate('/account-type')}
          className="text-primary hover:text-primary-hover transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={24} />
          <span>Back</span>
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md px-6"
        >
          <h1 className="text-3xl font-bold mb-8 text-center">Create Your Account</h1>
          
          <form onSubmit={handleSubmit}>
            <TextInput
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              error={formErrors.username}
            />
            
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
            
            {error && (
              <p className="text-primary text-sm mb-4">{error}</p>
            )}
            
            <div className="mt-8">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Start Listening'}
              </Button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Already have an account?{' '}
              <span 
                className="text-primary cursor-pointer"
                onClick={() => navigate('/login')}
              >
                Log In
              </span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ListenerSignup;