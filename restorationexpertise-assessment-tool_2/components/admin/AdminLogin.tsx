import React, { useState } from 'react';
import { XMarkIcon } from '../icons';

interface AdminLoginProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // NOTE: This is a placeholder for real authentication.
        if (password === 'admin') {
            onLoginSuccess();
            onClose();
            setPassword('');
            setError('');
        } else {
            setError('Invalid password. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray hover:text-charcoal">
                    <XMarkIcon className="w-7 h-7"/>
                </button>

                <div className="text-center mb-6">
                    <img src="https://restorationexpertise.com/wp-content/uploads/2025/11/Restorationexpertise_ig_profilepic_2_small.webp" alt="Logo" className="w-12 h-12 mx-auto mb-3"/>
                    <h2 className="font-sora text-2xl font-bold text-charcoal">Admin Access</h2>
                    <p className="text-gray mt-1">Enter your password to continue.</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div>
                        <label className="block text-sm font-medium text-gray mb-1" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 ${error ? 'border-error ring-error/50' : 'border-gray-border focus:ring-gold focus:border-gold'}`}
                        />
                    </div>
                    
                    {error && <p className="text-error text-sm mt-2">{error}</p>}
                    
                    <div className="mt-6">
                        <button
                            type="submit"
                            className="w-full py-3 px-4 bg-gold text-charcoal font-bold rounded-lg shadow-md hover:bg-gold-light transition-transform transform hover:scale-105"
                        >
                            Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;