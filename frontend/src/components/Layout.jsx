import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  MessageCircle,
  Video,
  User,
  LogOut,
  Globe,
  Users
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Globe className="logo-icon" size={28} />
          <h1 className="app-title">World Chat</h1>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <MessageCircle size={20} />
            <span>Chat</span>
          </NavLink>
          <NavLink to="/video" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Video size={20} />
            <span>Video Room</span>
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <User size={20} />
            <span>My Profile</span>
          </NavLink>
        </nav>

        <div className="online-status">
          <Users size={16} />
          <span>{onlineUsers.length} online</span>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar-small">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} />
              ) : (
                <span>{user?.username?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="username">{user?.username}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
