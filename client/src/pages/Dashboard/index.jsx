import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from './Layout';
import { useAuth } from '../../contexts/AuthContext';
import MemberDashboard from './Member/MemberDashboard';
import TrainerDashboard from './Trainer/TrainerDashboard';
import AdminDashboard from './Admin/AdminDashboard';

import ManageTrainers from './Admin/ManageTrainers';
import ManageClasses from './Admin/ManageClasses';
import ManageMembers from './Admin/ManageMembers';
import Plans from './Common/Plans';
import MyBookings from './Member/MyBookings';
import ClassBooking from './Member/ClassBooking';
import Subscription from './Member/Subscription';
import ManagePlans from './Trainer/ManagePlans';

// New Pages
import AttendanceLogs from './Admin/AttendanceLogs';
import PaymentHistory from './Admin/PaymentHistory';
import Notifications from './Admin/Notifications';
import ManageMembershipPlans from './Admin/ManageMembershipPlans';

import MyClasses from './Trainer/MyClasses';
import MyMembers from './Trainer/MyMembers';
import TrainerAttendance from './Trainer/TrainerAttendance';
import MyPlans from './Member/MyPlans';
import MemberAttendance from './Member/MemberAttendance';

const Dashboard = () => {
    const { user } = useAuth();

    // Determine the Index page based on Role
    const getIndexPage = () => {
        if (user?.role === 'admin') return <AdminDashboard />;
        if (user?.role === 'trainer') return <TrainerDashboard />;
        return <MemberDashboard />;
    };

    return (
        <Routes>
            <Route path="/" element={<DashboardLayout />}>
                <Route index element={getIndexPage()} />

                {/* Admin Routes */}
                <Route path="trainers" element={<ManageTrainers />} />
                <Route path="classes" element={user?.role === 'member' ? <ClassBooking /> : <ManageClasses />} />
                <Route path="members" element={<ManageMembers />} />
                <Route path="admin/memberships" element={<ManageMembershipPlans />} />
                <Route path="admin/attendance" element={<AttendanceLogs />} />
                <Route path="admin/payments" element={<PaymentHistory />} />
                <Route path="admin/notifications" element={<Notifications />} />

                {/* Trainer Routes */}
                <Route path="my-classes" element={<MyClasses />} />
                <Route path="my-members" element={<MyMembers />} />
                <Route path="trainer/attendance" element={<TrainerAttendance />} />

                {/* Member Routes */}
                <Route path="my-bookings" element={<MyBookings />} />
                <Route path="my-plans" element={<MyPlans />} />
                <Route path="my-attendance" element={<MemberAttendance />} />

                {/* Shared/conditional Routes */}
                <Route path="plans" element={user?.role === 'member' ? <Plans /> : <ManagePlans />} />
                <Route path="subscription" element={<Subscription />} />
            </Route>
        </Routes>
    );
};

export default Dashboard;
