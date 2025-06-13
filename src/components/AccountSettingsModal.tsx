import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Bell, Shield, CreditCard, LogOut, Camera, Check, Loader2, Monitor, ChevronRight, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useThemeStore, Theme, getThemeColors } from '../store/themeStore';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    id: string;
    username: string;
    artist_name: string;
    bio: string;
    profile_image_url: string | null;
    verification_status: string;
    gold_badge_applied: boolean;
  };
  onUpdate: () => void;
  onSignOut: () => void;
  isListener?: boolean;
}

type SettingsTab = 'profile' | 'interface' | 'notifications' | 'security' | 'subscription';

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdate,
  onSignOut,
  isListener = false
}) => {
  const { theme, setTheme } = useThemeStore();
  const themeColors = getThemeColors(theme);
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [artistName, setArtistName] = useState(profile.artist_name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [applyingVerification, setApplyingVerification] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showTabContent, setShowTabContent] = useState(false); // New state for mobile navigation
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset mobile navigation when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setShowTabContent(false);
      setActiveTab('profile');
    }
  }, [isOpen]);

  // Fetch user email when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUserEmail();
    }
  }, [isOpen]);

  const fetchUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError('');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('artist_profiles')
        .update({ profile_image_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      onUpdate();
      setSuccess('Profile picture updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsEmailLoading(true);
      setError('');

      // Get current user to check if email is actually changing
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser?.email === email) {
        setError('This is already your current email address');
        return;
      }

      console.log('Attempting to update email from', currentUser?.email, 'to', email);

      // Update the user's email using the auth API
      const { data, error } = await supabase.auth.updateUser({
        email: email
      });

      console.log('Email update response:', { data, error });

      if (error) {
        console.error('Email update error:', error);
        // Handle specific error cases
        if (error.message.includes('email_address_not_authorized')) {
          setError('Email address not authorized. Please use a different email.');
        } else if (error.message.includes('email_change_required')) {
          setSuccess('Email change initiated. Please check your new email for a confirmation link.');
        } else if (error.message.includes('same_email')) {
          setError('This is already your current email address');
        } else {
          setError(error.message);
        }
        return;
      }

      // Check if email change requires confirmation
      if (data?.user?.email_change_sent_at) {
        setSuccess('Email change confirmation sent to your new email address. Please check your inbox and click the confirmation link to complete the change.');
        console.log('Email confirmation sent at:', data.user.email_change_sent_at);
      } else if (data?.user?.email === email) {
        setSuccess('Email updated successfully');
        console.log('Email updated immediately to:', data.user.email);
      } else if (data?.user?.new_email === email) {
        setSuccess('Email change initiated. Please check your new email for a confirmation link to complete the change.');
        console.log('Email change pending confirmation. New email:', data.user.new_email);
      } else {
        setSuccess('Email change request submitted. Please check your email for further instructions.');
        console.log('Email change status unclear:', data);
      }
      
      setTimeout(() => setSuccess(''), 7000);
    } catch (error: any) {
      console.error('Email update error:', error);
      setError('Failed to update email. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    try {
      setIsPasswordLoading(true);
      setError('');

      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('Unable to verify current user');
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (isListener) {
      // For listeners, only update username
      if (!username.trim()) {
        setError('Username is required');
        return;
      }

      try {
        setIsLoading(true);
        setError('');

        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', profile.id)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
          setError('Username is already taken');
          return;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ username: username })
          .eq('id', profile.id);

        if (profileError) throw profileError;

        onUpdate();
        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error: any) {
        setError(error.message);
        setTimeout(() => setError(''), 3000);
      } finally {
        setIsLoading(false);
      }
    } else {
      // For artists, update all fields
      if (!artistName.trim() || !username.trim()) {
        setError('Artist name and username are required');
        return;
      }

      try {
        setIsLoading(true);
        setError('');

        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', profile.id)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
          setError('Username is already taken');
          return;
        }

        const { error: artistError } = await supabase
          .from('artist_profiles')
          .update({
            artist_name: artistName,
            username: username,
            bio: bio
          })
          .eq('id', profile.id);

        if (artistError) throw artistError;

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            username: username,
            artist_name: artistName
          })
          .eq('id', profile.id);

        if (profileError) throw profileError;

        onUpdate();
        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error: any) {
        setError(error.message);
        setTimeout(() => setError(''), 3000);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleApplyVerification = async () => {
    try {
      setApplyingVerification(true);
      setError('');

      const { error } = await supabase
        .from('artist_profiles')
        .update({ verification_status: 'pending' })
        .eq('id', profile.id);

      if (error) throw error;

      onUpdate();
      setSuccess('Verification request submitted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setApplyingVerification(false);
    }
  };

  // Handle mobile tab selection
  const handleMobileTabSelect = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    setShowTabContent(true);
  };

  // Handle mobile back navigation
  const handleMobileBack = () => {
    if (showTabContent) {
      setShowTabContent(false);
    } else {
      onClose();
    }
  };

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: User, active: true },
    { id: 'interface' as SettingsTab, label: 'Interface', icon: Monitor, active: true },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell, active: false },
    { id: 'security' as SettingsTab, label: 'Security', icon: Shield, active: true },
    { id: 'subscription' as SettingsTab, label: 'Subscription', icon: CreditCard, active: true },
  ];

  const renderProfileTab = () => (
    <div className="space-y-6">
      {!isListener && (
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 mb-4">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ backgroundColor: themeColors.cardBackground }}
              >
                <User size={32} style={{ color: themeColors.textSecondary }} />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-colors"
              style={{ backgroundColor: themeColors.primary }}
            >
              <Camera size={16} className="text-white" />
            </button>
          </div>
          <p style={{ color: themeColors.textSecondary }} className="text-sm">Change profile picture</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      )}

      <div className="space-y-4">
        {/* Email Field */}
        <div>
          <label style={{ color: themeColors.textSecondary }} className="block text-sm mb-2">Email</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-opacity-50"
              style={{ 
                backgroundColor: themeColors.cardBackground,
                color: themeColors.text,
                borderColor: themeColors.primary + '50'
              }}
              placeholder="Enter your email"
            />
            <button
              onClick={handleUpdateEmail}
              disabled={isEmailLoading}
              className="text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: themeColors.primary }}
            >
              {isEmailLoading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                'Update'
              )}
            </button>
          </div>
          <p style={{ color: themeColors.textSecondary }} className="text-xs mt-1">
            Email changes may require confirmation. Check your inbox after updating.
          </p>
        </div>

        {!isListener && (
          <div>
            <label style={{ color: themeColors.textSecondary }} className="block text-sm mb-2">Artist name</label>
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="w-full p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-opacity-50"
              style={{ 
                backgroundColor: themeColors.cardBackground,
                color: themeColors.text,
                borderColor: themeColors.primary + '50'
              }}
            />
          </div>
        )}

        <div>
          <label style={{ color: themeColors.textSecondary }} className="block text-sm mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-opacity-50"
            style={{ 
              backgroundColor: themeColors.cardBackground,
              color: themeColors.text,
              borderColor: themeColors.primary + '50'
            }}
          />
        </div>

        {!isListener && (
          <div>
            <label style={{ color: themeColors.textSecondary }} className="block text-sm mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-opacity-50 min-h-[80px]"
              style={{ 
                backgroundColor: themeColors.cardBackground,
                color: themeColors.text,
                borderColor: themeColors.primary + '50'
              }}
            />
          </div>
        )}
      </div>

      {!isListener && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: themeColors.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 style={{ color: themeColors.text }} className="font-medium mb-1 flex items-center gap-2">
                Verification
                {profile.gold_badge_applied && (
                  <img
                    src="https://fihjahpokzdqomytswpy.supabase.co/storage/v1/object/sign/assets/Vector%20(4).svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MmU3MzViMy00NTE1LTRlZDctODY0My0wMWY2NWQxZjk2ZWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvVmVjdG9yICg0KS5zdmciLCJpYXQiOjE3NDg5MzUxMzksImV4cCI6MjA2NDI5NTEzOX0.IWBy-InoQwnwl5Q77PFrw2zWNw3UxlJGLWa778U4a8c"
                    alt="Verified"
                    className="w-4 h-4"
                  />
                )}
              </h3>
              <p style={{ color: themeColors.textSecondary }} className="text-sm">
                {profile.gold_badge_applied ? (
                  'Your account is verified'
                ) : profile.verification_status === 'pending' ? (
                  'Verification pending'
                ) : (
                  'Apply for verification'
                )}
              </p>
            </div>
            {!profile.gold_badge_applied && profile.verification_status === 'none' && (
              <button
                onClick={handleApplyVerification}
                disabled={applyingVerification}
                className="text-white px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: themeColors.primary }}
              >
                {applyingVerification ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Applying...
                  </>
                ) : (
                  'Apply'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleSaveProfile}
        disabled={isLoading}
        className="w-full text-white py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: themeColors.primary }}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Saving...
          </>
        ) : (
          <>
            <Check size={20} />
            Save Changes
          </>
        )}
      </button>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 style={{ color: themeColors.text }} className="text-lg font-medium mb-4">Change Password</h3>
        <p style={{ color: themeColors.textSecondary }} className="text-sm mb-6">
          Update your password to keep your account secure
        </p>
        
        <div className="space-y-4">
          {/* Current Password */}
          <div>
            <label style={{ color: themeColors.textSecondary }} className="block text-sm mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-3 pr-12 rounded-xl focus:outline-none focus:ring-1 focus:ring-opacity-50"
                style={{ 
                  backgroundColor: themeColors.cardBackground,
                  color: themeColors.text,
                  borderColor: themeColors.primary + '50'
                }}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity"
                style={{ color: themeColors.textSecondary }}
              >
                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label style={{ color: themeColors.textSecondary }} className="block text-sm mb-2">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 pr-12 rounded-xl focus:outline-none focus:ring-1 focus:ring-opacity-50"
                style={{ 
                  backgroundColor: themeColors.cardBackground,
                  color: themeColors.text,
                  borderColor: themeColors.primary + '50'
                }}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity"
                style={{ color: themeColors.textSecondary }}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label style={{ color: themeColors.textSecondary }} className="block text-sm mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 pr-12 rounded-xl focus:outline-none focus:ring-1 focus:ring-opacity-50"
                style={{ 
                  backgroundColor: themeColors.cardBackground,
                  color: themeColors.text,
                  borderColor: themeColors.primary + '50'
                }}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity"
                style={{ color: themeColors.textSecondary }}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleChangePassword}
            disabled={isPasswordLoading || !currentPassword || !newPassword || !confirmPassword}
            className="w-full text-white py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: themeColors.primary }}
          >
            {isPasswordLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Updating Password...
              </>
            ) : (
              <>
                <Shield size={20} />
                Update Password
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderInterfaceTab = () => (
    <div className="space-y-6">
      <div>
        <h3 style={{ color: themeColors.text }} className="text-lg font-medium mb-4">Theme</h3>
        <p style={{ color: themeColors.textSecondary }} className="text-sm mb-6">
          Choose your preferred color scheme for the app
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => setTheme('dark')}
            className={`w-full p-4 rounded-xl border-2 transition-all ${
              theme === 'dark' 
                ? 'border-opacity-100' 
                : 'border-opacity-20 hover:border-opacity-40'
            }`}
            style={{ 
              backgroundColor: theme === 'dark' ? themeColors.primary + '10' : themeColors.cardBackground,
              borderColor: themeColors.primary
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 bg-black rounded border border-gray-600 flex items-center justify-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
                <div className="text-left">
                  <h4 style={{ color: themeColors.text }} className="font-medium">Dark Mode</h4>
                  <p style={{ color: themeColors.textSecondary }} className="text-sm">Black background with red accents</p>
                </div>
              </div>
              {theme === 'dark' && (
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  <Check size={14} className="text-white" />
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => setTheme('light')}
            className={`w-full p-4 rounded-xl border-2 transition-all ${
              theme === 'light' 
                ? 'border-opacity-100' 
                : 'border-opacity-20 hover:border-opacity-40'
            }`}
            style={{ 
              backgroundColor: theme === 'light' ? themeColors.primary + '10' : themeColors.cardBackground,
              borderColor: themeColors.primary
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
                <div className="text-left">
                  <h4 style={{ color: themeColors.text }} className="font-medium">Light Mode</h4>
                  <p style={{ color: themeColors.textSecondary }} className="text-sm">Light background with red accents</p>
                </div>
              </div>
              {theme === 'light' && (
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  <Check size={14} className="text-white" />
                </div>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderSubscriptionTab = () => (
    <div className="space-y-6">
      <div>
        <h3 style={{ color: themeColors.text }} className="text-lg font-medium mb-4">Subscription</h3>
        
        <div className="p-4 rounded-xl" style={{ backgroundColor: themeColors.cardBackground }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: themeColors.primary }}
              >
                <User size={20} className="text-white" />
              </div>
              <div>
                <h4 style={{ color: themeColors.text }} className="font-medium">
                  {isListener ? 'Listener' : 'Artist'}
                </h4>
                <p style={{ color: themeColors.textSecondary }} className="text-sm">
                  {isListener ? 'Free account' : 'Pro subscription'}
                </p>
              </div>
            </div>
            {isListener && (
              <button 
                className="flex items-center gap-1 hover:opacity-80 transition-opacity opacity-50 cursor-not-allowed"
                style={{ color: themeColors.primary }}
                disabled
              >
                Upgrade
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
        
        {isListener && (
          <p style={{ color: themeColors.textSecondary }} className="text-sm">
            Upgrade options coming soon. Enjoy unlimited music discovery with your free account.
          </p>
        )}
      </div>
    </div>
  );

  const renderInactiveTab = (tabName: string) => (
    <div className="flex flex-col items-center justify-center py-12">
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: themeColors.cardBackground }}
      >
        <Bell size={24} style={{ color: themeColors.textSecondary }} />
      </div>
      <h3 style={{ color: themeColors.text }} className="font-medium mb-2">{tabName}</h3>
      <p style={{ color: themeColors.textSecondary }} className="text-sm text-center">
        This feature is coming soon. We're working hard to bring you more customization options.
      </p>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'interface':
        return renderInterfaceTab();
      case 'security':
        return renderSecurityTab();
      case 'subscription':
        return renderSubscriptionTab();
      case 'notifications':
        return renderInactiveTab('Notifications');
      default:
        return renderProfileTab();
    }
  };

  // Mobile view - full screen with navigation
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: themeColors.background }}
          >
            {/* Mobile Header */}
            <div 
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: themeColors.cardBackground }}
            >
              <button
                onClick={handleMobileBack}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                style={{ color: themeColors.primary }}
              >
                <ChevronLeft size={24} />
                <span>Back</span>
              </button>
              <h2 style={{ color: themeColors.text }} className="text-lg font-semibold">
                {showTabContent ? tabs.find(tab => tab.id === activeTab)?.label : 'Settings'}
              </h2>
              <div className="w-16" /> {/* Spacer for centering */}
            </div>

            {/* Mobile Content */}
            <div className="flex-1 overflow-y-auto">
              {!showTabContent ? (
                // Tab List View
                <div className="p-4 space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => tab.active && handleMobileTabSelect(tab.id)}
                      disabled={!tab.active}
                      className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
                        !tab.active ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                      }`}
                      style={{ backgroundColor: themeColors.cardBackground }}
                    >
                      <div className="flex items-center gap-3">
                        <tab.icon size={20} style={{ color: themeColors.text }} />
                        <span style={{ color: themeColors.text }} className="font-medium">{tab.label}</span>
                        {!tab.active && (
                          <span 
                            className="text-xs px-2 py-1 rounded"
                            style={{ 
                              backgroundColor: themeColors.inputBackground,
                              color: themeColors.textSecondary
                            }}
                          >
                            Soon
                          </span>
                        )}
                      </div>
                      {tab.active && (
                        <ChevronRight size={20} style={{ color: themeColors.textSecondary }} />
                      )}
                    </button>
                  ))}
                  
                  {/* Sign Out Button */}
                  <button
                    onClick={onSignOut}
                    className="w-full flex items-center justify-between p-4 rounded-xl text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut size={20} />
                      <span className="font-medium">Sign Out</span>
                    </div>
                    <ChevronRight size={20} />
                  </button>
                </div>
              ) : (
                // Tab Content View
                <div className="p-4">
                  {renderTabContent()}
                </div>
              )}
            </div>

            {/* Success/Error Messages */}
            <AnimatePresence>
              {(success || error) && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className={`fixed bottom-6 left-4 right-4 px-6 py-3 rounded-xl ${
                    success ? 'bg-green-500' : 'bg-red-500'
                  } text-white text-sm z-60`}
                >
                  {success || error}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Desktop view - modal
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            style={{ backgroundColor: themeColors.background }}
          >
            <div 
              className="flex items-center justify-between p-6 border-b"
              style={{ borderColor: themeColors.cardBackground }}
            >
              <h2 style={{ color: themeColors.text }} className="text-2xl font-bold">Settings</h2>
              <button
                onClick={onClose}
                style={{ color: themeColors.textSecondary }}
                className="hover:opacity-80 transition-opacity"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex h-[600px]">
              <div className="w-64 p-6" style={{ backgroundColor: themeColors.cardBackground }}>
                <div className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => tab.active && setActiveTab(tab.id)}
                      disabled={!tab.active}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                        activeTab === tab.id && tab.active
                          ? 'text-white'
                          : tab.active
                          ? 'hover:opacity-80'
                          : 'cursor-not-allowed opacity-50'
                      }`}
                      style={{
                        backgroundColor: activeTab === tab.id && tab.active ? themeColors.primary : 'transparent',
                        color: activeTab === tab.id && tab.active ? '#ffffff' : themeColors.text
                      }}
                    >
                      <tab.icon size={20} />
                      <span className="font-medium">{tab.label}</span>
                      {!tab.active && (
                        <span 
                          className="ml-auto text-xs px-2 py-1 rounded"
                          style={{ 
                            backgroundColor: themeColors.inputBackground,
                            color: themeColors.textSecondary
                          }}
                        >
                          Soon
                        </span>
                      )}
                    </button>
                  ))}
                  
                  <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left text-red-400 hover:bg-red-900/20 transition-colors mt-6"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {renderTabContent()}
              </div>
            </div>

            <AnimatePresence>
              {(success || error) && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full ${
                    success ? 'bg-green-500' : 'bg-red-500'
                  } text-white text-sm z-60`}
                >
                  {success || error}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AccountSettingsModal;