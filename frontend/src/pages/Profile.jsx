import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Camera,
  Upload,
  Image,
  Film,
  MapPin,
  Calendar,
  Edit3,
  X,
  Plus,
  Trash2,
  Play
} from 'lucide-react';

const Profile = () => {
  const { userId } = useParams();
  const { user, updateProfile } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [album, setAlbum] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ bio: '', country: '' });
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const fileInputRef = useRef(null);

  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get(`/users/${targetUserId}`);
        setProfileData(response.data);
        setEditForm({ bio: response.data.bio || '', country: response.data.country || '' });
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    const loadAlbum = async () => {
      try {
        const response = await api.get(`/media/album/${targetUserId}`);
        setAlbum(response.data);
      } catch (error) {
        console.error('Error loading album:', error);
      }
    };

    if (targetUserId) {
      loadProfile();
      loadAlbum();
    }
  }, [targetUserId]);

  // Update profile
  const handleUpdateProfile = async () => {
    try {
      await updateProfile(editForm);
      setProfileData({ ...profileData, ...editForm });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  // Upload media
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await api.upload('/media/upload', formData);
      setAlbum((prev) => [...response.data.media.map(m => ({
        ...m,
        created_at: new Date().toISOString()
      })), ...prev]);
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error uploading files. Max size: 50MB');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete media
  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;

    try {
      await api.delete(`/media/${mediaId}`);
      setAlbum((prev) => prev.filter((m) => m.id !== mediaId));
      setSelectedMedia(null);
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  };

  const filteredAlbum = album.filter((item) => {
    if (activeTab === 'photos') return item.type === 'photo';
    if (activeTab === 'videos') return item.type === 'video';
    return true;
  });

  const getMediaUrl = (item) => {
    const folder = item.type === 'video' ? 'videos' : 'photos';
    return `/uploads/${folder}/${item.filename}`;
  };

  if (!profileData) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-cover"></div>
        <div className="profile-info-section">
          <div className="profile-avatar-large">
            {profileData.avatar ? (
              <img src={profileData.avatar} alt={profileData.username} />
            ) : (
              <span>{profileData.username?.charAt(0).toUpperCase()}</span>
            )}
            <div className={`status-badge ${profileData.is_online ? 'online' : 'offline'}`}></div>
          </div>

          <div className="profile-details">
            <h1>{profileData.username}</h1>
            {isEditing ? (
              <div className="edit-form">
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Write something about yourself..."
                  rows={3}
                />
                <input
                  type="text"
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                  placeholder="Country"
                />
                <div className="edit-actions">
                  <button className="save-btn" onClick={handleUpdateProfile}>Save</button>
                  <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="profile-bio">{profileData.bio || 'No bio yet'}</p>
                <div className="profile-meta">
                  {profileData.country && (
                    <span><MapPin size={14} /> {profileData.country}</span>
                  )}
                  <span><Calendar size={14} /> Joined {new Date(profileData.created_at).toLocaleDateString()}</span>
                  <span><Image size={14} /> {album.length} media items</span>
                </div>
              </>
            )}
          </div>

          {isOwnProfile && !isEditing && (
            <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
              <Edit3 size={16} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Album Section */}
      <div className="album-section">
        <div className="album-header">
          <h2>
            <Camera size={22} /> Album
          </h2>
          <div className="album-tabs">
            <button
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button
              className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
              onClick={() => setActiveTab('photos')}
            >
              <Image size={14} /> Photos
            </button>
            <button
              className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
              onClick={() => setActiveTab('videos')}
            >
              <Film size={14} /> Videos
            </button>
          </div>

          {isOwnProfile && (
            <div className="upload-section">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                hidden
              />
              <button
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <><div className="loading-spinner-small"></div> Uploading...</>
                ) : (
                  <><Plus size={16} /> Upload</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Media Grid */}
        <div className="media-grid">
          {filteredAlbum.length === 0 ? (
            <div className="empty-album">
              <Upload size={48} />
              <p>{isOwnProfile ? 'Upload your first photo or video!' : 'No media yet'}</p>
            </div>
          ) : (
            filteredAlbum.map((item) => (
              <div
                key={item.id}
                className="media-item"
                onClick={() => setSelectedMedia(item)}
              >
                {item.type === 'photo' ? (
                  <img src={getMediaUrl(item)} alt={item.caption || 'Photo'} loading="lazy" />
                ) : (
                  <div className="video-thumbnail">
                    <video src={getMediaUrl(item)} preload="metadata" />
                    <div className="play-overlay">
                      <Play size={32} />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Media Lightbox */}
      {selectedMedia && (
        <div className="media-lightbox" onClick={() => setSelectedMedia(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelectedMedia(null)}>
              <X size={24} />
            </button>

            {selectedMedia.type === 'photo' ? (
              <img src={getMediaUrl(selectedMedia)} alt={selectedMedia.caption || 'Photo'} />
            ) : (
              <video src={getMediaUrl(selectedMedia)} controls autoPlay />
            )}

            <div className="lightbox-info">
              {selectedMedia.caption && <p>{selectedMedia.caption}</p>}
              <span className="lightbox-date">
                {new Date(selectedMedia.created_at).toLocaleDateString()}
              </span>
              {isOwnProfile && (
                <button
                  className="delete-media-btn"
                  onClick={() => handleDeleteMedia(selectedMedia.id)}
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
