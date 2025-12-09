import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const profileRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const isActive = (path) => {
        return location.pathname === path
            ? 'bg-primary-50 text-primary-600 shadow-sm ring-1 ring-primary-200'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900';
    };

    const handleLogout = () => {
        setIsProfileOpen(false);
        setIsMobileMenuOpen(false);
        navigate('/');
        setTimeout(() => logout(), 100);
    };

    const adminLinks = [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Members', path: '/dashboard/members' },
        { name: 'Trainers', path: '/dashboard/trainers' },
        { name: 'Scheduling', path: '/dashboard/classes' },
        { name: 'Memberships', path: '/dashboard/admin/memberships' },
        { name: 'Plans', path: '/dashboard/plans' },
        { name: 'Attendance', path: '/dashboard/admin/attendance' },
        { name: 'Payments', path: '/dashboard/admin/payments' },
    ];

    const trainerLinks = [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'My Classes', path: '/dashboard/my-classes' },
        { name: 'My Members', path: '/dashboard/my-members' },
        { name: 'Plans', path: '/dashboard/plans' },
        { name: 'Attendance', path: '/dashboard/trainer/attendance' },
    ];

    const memberLinks = [
        { name: 'Dashboard', path: '/dashboard' },
        { name: 'Classes', path: '/dashboard/classes' },
        { name: 'My Bookings', path: '/dashboard/my-bookings' },
        { name: 'My Plans', path: '/dashboard/my-plans' },
        { name: 'Billing', path: '/dashboard/subscription' },
    ];

    let links = [];
    if (user?.role === 'admin') links = adminLinks;
    else if (user?.role === 'trainer') links = trainerLinks;
    else links = memberLinks;

    return (
        <nav className="sticky top-0 z-50 w-full backdrop-blur-lg bg-white/80 border-b border-slate-200/60 supports-[backdrop-filter]:bg-white/60 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span className="font-display font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 group-hover:from-primary-600 group-hover:to-blue-600 transition-all duration-300">
                                FitTrack
                            </span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden lg:ml-10 lg:flex lg:space-x-1 items-center">
                            {links.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive(link.path)}`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: Profile & Mobile Toggle */}
                    <div className="flex items-center gap-4">
                        {/* Desktop Profile Dropdown */}
                        <div className="hidden lg:flex lg:items-center relative" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="group flex items-center gap-3 pl-3 pr-1.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-primary-200 hover:bg-white hover:shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500"
                            >
                                <span className="text-sm font-semibold text-slate-700 group-hover:text-primary-700 transition-colors">
                                    {user?.name?.split(' ')[0]}
                                </span>
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Profile" className="h-8 w-8 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </button>

                            {/* Dropdown Menu */}
                            <div className={`
                                absolute right-0 top-full mt-4 w-56 rounded-2xl shadow-xl bg-white ring-1 ring-black/5 transform transition-all duration-200 origin-top-right
                                ${isProfileOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}
                            `}>
                                <div className="p-2 space-y-1">
                                    <div className="px-3 py-2 bg-slate-50 rounded-xl mb-2">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Signed in as</p>
                                        <p className="text-sm font-bold text-slate-800 truncate">{user?.email}</p>
                                        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-50 text-primary-700 capitalize border border-primary-100">
                                            {user?.role}
                                        </div>
                                    </div>

                                    <Link
                                        to="/dashboard/profile"
                                        onClick={() => setIsProfileOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                        Your Profile
                                    </Link>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Toggle */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all focus:outline-none"
                        >
                            {isMobileMenuOpen ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <div className={`
                lg:hidden fixed inset-x-0 top-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 shadow-lg transform transition-all duration-300 ease-in-out
                ${isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}
            `}>
                <div className="max-h-[80vh] overflow-y-auto px-4 py-4 space-y-2">
                    {links.map((link) => (
                        <Link
                            key={link.name}
                            to={link.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`block px-4 py-3 rounded-xl text-base font-medium transition-all ${location.pathname === link.path
                                ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}

                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <div className="flex items-center px-4 py-3 bg-slate-50 rounded-xl mb-3">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Profile" className="h-10 w-10 rounded-full object-cover shadow-sm" />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="ml-3">
                                <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                                <p className="text-xs text-slate-500 font-medium capitalize">{user?.role}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Link
                                to="/dashboard/profile"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:border-primary-200 hover:text-primary-600 transition-all"
                            >
                                Profile
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex justify-center items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition-all"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
