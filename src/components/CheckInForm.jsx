import { useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserPlus, Phone, ClipboardList, UserCheck, Loader2, Mail, Camera, X } from 'lucide-react';
import emailjs from '@emailjs/browser';

const CheckInForm = ({ onCheckInSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    purpose: '',
    hostName: '',
    hostEmail: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please allow permissions.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 320;
      canvas.height = 240;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setPhoto(dataUrl);
      stopCamera();
    }
  };

  const clearPhoto = () => setPhoto(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const docRef = await addDoc(collection(db, 'visitors'), {
        ...formData,
        photo: photo,
        checkInTime: serverTimestamp(),
        checkOutTime: null,
        status: 'Active'
      });

      try {
        const SERVICE_ID = 'service_1yt2lto';
        const TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
        const PUBLIC_KEY = 'YOUR_PUBLIC_KEY';

        if (SERVICE_ID !== 'YOUR_SERVICE_ID') {
          await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
            host_name: formData.hostName,
            host_email: formData.hostEmail,
            visitor_name: formData.name,
            purpose: formData.purpose,
          }, PUBLIC_KEY);
        }
      } catch (emailErr) {
        console.error("Failed to send email notification:", emailErr);
      }

      onCheckInSuccess({ id: docRef.id, ...formData, photo, checkInTime: new Date() });
    } catch (err) {
      console.error("Error adding document: ", err);
      setError('Failed to check in. Please check your Firebase configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const inputStyle = {
    width: '100%',
    paddingLeft: '2.75rem',
    paddingRight: '1rem',
    paddingTop: '0.75rem',
    paddingBottom: '0.75rem',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: '0.75rem',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    display: 'block',
    marginBottom: '0.25rem',
    marginLeft: '0.25rem',
  };

  const fields = [
    { label: 'Full Name', name: 'name', type: 'text', placeholder: 'John Doe', Icon: UserCheck, required: true },
    { label: 'Phone Number', name: 'phone', type: 'tel', placeholder: '+234 800 000 0000', Icon: Phone, required: true },
    { label: 'Purpose of Visit', name: 'purpose', type: 'text', placeholder: 'Meeting, Delivery, etc.', Icon: ClipboardList, required: true },
    { label: 'Host Name', name: 'hostName', type: 'text', placeholder: 'Who are you visiting?', Icon: UserPlus, required: true },
    { label: 'Host Email', name: 'hostEmail', type: 'email', placeholder: 'host@company.com', Icon: Mail, required: true },
  ];

  return (
    <div className="max-w-md mx-auto rounded-3xl shadow-2xl overflow-hidden border animate-in fade-in zoom-in duration-500"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      {/* Header */}
      <div className="bg-indigo-600 p-8 text-white text-center">
        <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <UserPlus size={32} />
        </div>
        <h2 className="text-2xl font-bold">Visitor Check-In</h2>
        <p className="text-indigo-100 mt-2">Welcome! Please provide your details.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl text-sm border text-rose-500"
            style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}
          >
            {error}
          </div>
        )}

        <div className="space-y-4">
          {fields.map(({ label, name, type, placeholder, Icon, required }) => (
            <div key={name} className="relative">
              <label style={labelStyle}>{label}</label>
              <div className="relative">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--text-muted)' }} />
                <input
                  required={required}
                  type={type}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  style={inputStyle}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Camera Section */}
        <div className="space-y-4 border-t pt-6 mt-6" style={{ borderColor: 'var(--border-color)' }}>
          <label style={{ ...labelStyle, marginLeft: 0 }}>Visitor Photo (Optional)</label>

          {!photo && !isCameraOpen && (
            <button
              type="button"
              onClick={startCamera}
              className="w-full py-4 border-2 border-dashed rounded-xl font-bold flex items-center justify-center space-x-2 transition-colors"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent-text)', background: 'var(--accent-light)' }}
            >
              <Camera size={20} />
              <span>Take a Photo</span>
            </button>
          )}

          {isCameraOpen && (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-inner animate-in fade-in zoom-in duration-300">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                <button type="button" onClick={capturePhoto}
                  className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold shadow-lg hover:bg-indigo-50 transition-colors"
                >Capture</button>
                <button type="button" onClick={stopCamera}
                  className="bg-slate-800/80 text-white px-6 py-2 rounded-full font-bold shadow-lg backdrop-blur-sm"
                >Cancel</button>
              </div>
            </div>
          )}

          {photo && (
            <div className="flex justify-center animate-in fade-in zoom-in duration-300">
              <div className="relative inline-block">
                <img src={photo} alt="Visitor" className="w-32 h-32 object-cover rounded-2xl shadow-md border-4 border-white" />
                <button type="button" onClick={clearPhoto}
                  className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded-full shadow-lg transition-colors"
                ><X size={16} /></button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setFormData({ name: '', phone: '', purpose: '', hostName: '', hostEmail: '' });
              setPhoto(null);
            }}
            className="flex-1 font-bold py-4 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
          >
            <X size={20} />
            <span>Clear</span>
          </button>
          <button
            disabled={loading}
            type="submit"
            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200/30 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Processing...</span>
              </>
            ) : (
              <span>Check In Now</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CheckInForm;
