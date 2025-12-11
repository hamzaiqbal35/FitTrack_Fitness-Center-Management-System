import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LandingNavbar = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 10;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [scrolled]);

    const isHomePage = location.pathname === '/';

    return (
        <nav className={`fixed w-full z-50 top-0 transition-all duration-300 ${scrolled || !isHomePage ? 'bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm' : 'bg-transparent'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="flex justify-between items-center h-24">
                    {/* Logo */}
                    <Link to="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <img src="/logo.png" alt="FitTrack Logo" className="h-32 w-auto object-contain -my-4 hover:scale-105 transition-transform" />
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex space-x-8">
                        {['Features', 'Classes', 'Prices'].map((item) => (
                            <a
                                key={item}
                                href={isHomePage ? `#${item.toLowerCase()}` : `/#${item.toLowerCase()}`}
                                className="text-gray-600 hover:text-primary-600 font-medium transition-colors relative group py-2"
                            >
                                {item}
                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-600 transition-all duration-300 group-hover:w-full"></span>
                            </a>
                        ))}
                        <Link
                            to="/contact"
                            className={`text-gray-600 hover:text-primary-600 font-medium transition-colors relative group py-2 ${location.pathname === '/contact' ? 'text-primary-600' : ''}`}
                        >
                            Contact Us
                            <span className={`absolute bottom-0 left-0 h-0.5 bg-primary-600 transition-all duration-300 ${location.pathname === '/contact' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                        </Link>
                    </div>

                    {/* Auth Buttons */}
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <Link
                                to="/dashboard"
                                className="btn-primary shadow-lg shadow-primary-500/20 px-6 py-2.5 rounded-full text-base"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="text-gray-600 font-medium hover:text-gray-900 transition-colors px-4 py-2"
                                >
                                    Log in
                                </Link>
                                <Link
                                    to="/signup"
                                    className="btn-primary shadow-lg shadow-primary-500/20 px-6 py-2.5 rounded-full text-base transition-transform hover:scale-105"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default LandingNavbar;
