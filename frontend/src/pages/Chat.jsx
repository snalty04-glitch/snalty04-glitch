import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import {
  Send,
  Hash,
  Users,
  Globe,
  MessageSquare
} from 'lucide-react';

const Chat = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeRoom, setActiveRoom] = useState(roomId || 'global');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load rooms
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const response = await api.get('/rooms');
        setRooms(response.data);
      } catch (error) {
        console.error('Error loading rooms:', error);
      }
    };
    loadRooms();
  }, []);

  // Join room and load messages
  useEffect(() => {
    if (!socket || !activeRoom) return;

    socket.emit('room:join', { roomId: activeRoom, user });

    const loadMessages = async () => {
      try {
        const response = await api.get(`/rooms/${activeRoom}/messages`);
        setMessages(response.data);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };
    loadMessages();

    return () => {
      socket.emit('room:leave', { roomId: activeRoom, user });
    };
  }, [socket, activeRoom]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    socket.on('message:received', (message) => {
      if (message.room_id === activeRoom) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('typing:update', ({ username, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(username) ? prev : [...prev, username];
        }
        return prev.filter((u) => u !== username);
      });
    });

    return () => {
      socket.off('message:received');
      socket.off('typing:update');
    };
  }, [socket, activeRoom]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    socket.emit('message:send', {
      roomId: activeRoom,
      message: {
        userId: user.id,
        username: user.username,
        content: newMessage.trim(),
        avatar: user.avatar,
        type: 'text'
      }
    });

    setNewMessage('');
    socket.emit('typing:stop', { roomId: activeRoom, username: user.username });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (socket) {
      socket.emit('typing:start', { roomId: activeRoom, username: user.username });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { roomId: activeRoom, username: user.username });
      }, 2000);
    }
  };

  const switchRoom = (roomId) => {
    setActiveRoom(roomId);
    setMessages([]);
    setTypingUsers([]);
    navigate(`/chat/${roomId}`);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-page">
      {/* Room List */}
      <div className="room-list">
        <div className="room-list-header">
          <h3><Globe size={18} /> Chat Rooms</h3>
        </div>
        <div className="room-items">
          {rooms.filter(r => r.type !== 'video').map((room) => (
            <button
              key={room.id}
              className={`room-item ${activeRoom === room.id ? 'active' : ''}`}
              onClick={() => switchRoom(room.id)}
            >
              <Hash size={16} />
              <span>{room.name}</span>
            </button>
          ))}
        </div>

        <div className="online-users-panel">
          <h4><Users size={16} /> Online ({onlineUsers.length})</h4>
          <div className="online-users-list">
            {onlineUsers.map((u) => (
              <div key={u.id} className="online-user-item" onClick={() => navigate(`/profile/${u.id}`)}>
                <div className="user-avatar-tiny">
                  {u.avatar ? <img src={u.avatar} alt={u.username} /> : <span>{u.username?.charAt(0).toUpperCase()}</span>}
                </div>
                <span>{u.username}</span>
                <div className="online-dot"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        <div className="chat-header">
          <Hash size={20} />
          <h2>{rooms.find(r => r.id === activeRoom)?.name || activeRoom}</h2>
          <span className="room-description">
            {rooms.find(r => r.id === activeRoom)?.description}
          </span>
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="no-messages">
              <MessageSquare size={48} />
              <p>No messages yet. Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.user_id === user.id ? 'own-message' : ''}`}
              >
                <div className="message-avatar" onClick={() => navigate(`/profile/${msg.user_id}`)}>
                  {msg.avatar ? (
                    <img src={msg.avatar} alt={msg.username} />
                  ) : (
                    <span>{msg.username?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-username">{msg.username}</span>
                    <span className="message-time">{formatTime(msg.created_at)}</span>
                  </div>
                  <p className="message-text">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <form className="message-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder={`Message #${rooms.find(r => r.id === activeRoom)?.name || activeRoom}...`}
            className="message-input"
          />
          <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
