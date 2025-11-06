import React, { useState, useEffect } from 'react';
import { XMarkIcon } from './icons';

interface ProfileData {
  userName: string;
  contactNumber: string;
  businessAddress: string;
  businessDescription: string;
}

interface ProfileEditorProps {
  profileData: ProfileData;
  onSave: (data: ProfileData) => void;
  onCancel: () => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ profileData, onSave, onCancel }) => {
  const [formData, setFormData] = useState(profileData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    validate();
  }, [formData]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.userName.trim()) {
      newErrors.userName = 'Business name is required.';
    }
    if (!formData.businessAddress.trim()) {
      newErrors.businessAddress = 'Business address is required.';
    }
    if (!formData.businessDescription.trim()) {
      newErrors.businessDescription = 'Business description is required.';
    } else if (formData.businessDescription.trim().length < 20) {
      newErrors.businessDescription = 'Description must be at least 20 characters.';
    }

    const phoneRegex = /^\D*(\d\D*){10,}$/;
    if (!formData.contactNumber.trim()) {
        newErrors.contactNumber = 'Contact number is required.';
    } else if (!phoneRegex.test(formData.contactNumber)) {
        newErrors.contactNumber = 'Please enter a valid phone number.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const isFormValid = Object.keys(errors).length === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-charcoal dark:border dark:border-gray-dark rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-slide-up">
         <style>{`
            @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .animate-slide-up { animation: slide-up 0.4s ease-out; }
        `}</style>
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray dark:text-text-muted hover:text-charcoal dark:hover:text-white transition-colors">
          <XMarkIcon className="w-8 h-8"/>
        </button>

        <h2 className="font-sora text-3xl font-bold text-charcoal dark:text-text-light mb-6">Edit Your Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="userName" className="block text-sm font-medium text-gray dark:text-text-muted">Business Name</label>
            <input
              type="text"
              id="userName"
              name="userName"
              value={formData.userName}
              onChange={handleChange}
              className={`mt-1 block w-full p-3 border rounded-lg shadow-sm bg-white dark:bg-charcoal-light dark:text-text-light ${errors.userName ? 'border-error focus:ring-error focus:border-error' : 'border-gray-border dark:border-gray-dark focus:ring-gold focus:border-gold'}`}
            />
            {errors.userName && <p className="mt-1 text-sm text-error">{errors.userName}</p>}
          </div>

          <div>
            <label htmlFor="businessDescription" className="block text-sm font-medium text-gray dark:text-text-muted">Business Description</label>
             <textarea
              id="businessDescription"
              name="businessDescription"
              value={formData.businessDescription}
              onChange={handleChange}
              rows={4}
              className={`mt-1 block w-full p-3 border rounded-lg shadow-sm bg-white dark:bg-charcoal-light dark:text-text-light ${errors.businessDescription ? 'border-error focus:ring-error focus:border-error' : 'border-gray-border dark:border-gray-dark focus:ring-gold focus:border-gold'}`}
            />
            {errors.businessDescription && <p className="mt-1 text-sm text-error">{errors.businessDescription}</p>}
          </div>

          <div>
            <label htmlFor="contactNumber" className="block text-sm font-medium text-gray dark:text-text-muted">Contact Number</label>
            <input
              type="tel"
              id="contactNumber"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              className={`mt-1 block w-full p-3 border rounded-lg shadow-sm bg-white dark:bg-charcoal-light dark:text-text-light ${errors.contactNumber ? 'border-error focus:ring-error focus:border-error' : 'border-gray-border dark:border-gray-dark focus:ring-gold focus:border-gold'}`}
            />
            {errors.contactNumber && <p className="mt-1 text-sm text-error">{errors.contactNumber}</p>}
          </div>

          <div>
            <label htmlFor="businessAddress" className="block text-sm font-medium text-gray dark:text-text-muted">Business Address</label>
            <input
              type="text"
              id="businessAddress"
              name="businessAddress"
              value={formData.businessAddress}
              onChange={handleChange}
              className={`mt-1 block w-full p-3 border rounded-lg shadow-sm bg-white dark:bg-charcoal-light dark:text-text-light ${errors.businessAddress ? 'border-error focus:ring-error focus:border-error' : 'border-gray-border dark:border-gray-dark focus:ring-gold focus:border-gold'}`}
            />
            {errors.businessAddress && <p className="mt-1 text-sm text-error">{errors.businessAddress}</p>}
          </div>

          <div className="flex justify-end items-center gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="py-2 px-6 bg-white dark:bg-charcoal-light text-charcoal dark:text-text-light font-semibold rounded-lg shadow-md border border-gray-border dark:border-gray-dark hover:bg-gray-100 dark:hover:bg-gray-dark transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="py-2 px-8 bg-gold text-charcoal font-bold rounded-lg shadow-lg hover:bg-gold-light transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditor;