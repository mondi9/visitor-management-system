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
      
      // Use fixed size for small base64 footprint
      canvas.width = 320;
      canvas.height = 240;
      
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Compress to 70% quality JPEG
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
        // IMPORTANT: Replace these with your actual EmailJS credentials
        const SERVICE_ID = 'service_1yt2lto';
        const TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
        const PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
        
        if (SERVICE_ID !== 'YOUR_SERVICE_ID') {
          await emailjs.send(
            SERVICE_ID,
            TEMPLATE_ID,
            {
              host_name: formData.hostName,
              host_email: formData.hostEmail,
              visitor_name: formData.name,
              purpose: formData.purpose,
            },
            PUBLIC_KEY
          );
        }
      } catch (emailErr) {
        console.error("Failed to send email notification:", emailErr);
        // We don't fail the check-in if the email fails, just log it
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

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-500">
      <div className="bg-indigo-600 p-8 text-white text-center">
        <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <UserPlus size={32} />
        </div>
        <h2 className="text-2xl font-bold">Visitor Check-In</h2>
        <p className="text-indigo-100 mt-2">Welcome! Please provide your details.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <label className="text-sm font-medium text-slate-700 mb-1 block ml-1">Full Name</label>
            <div className="relative">
              <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-sm font-medium text-slate-700 mb-1 block ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                required
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-sm font-medium text-slate-700 mb-1 block ml-1">Purpose of Visit</label>
            <div className="relative">
              <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                required
                type="text"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="Meeting, Delivery, etc."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-sm font-medium text-slate-700 mb-1 block ml-1">Host Name</label>
            <div className="relative">
              <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                required
                type="text"
                name="hostName"
                value={formData.hostName}
                onChange={handleChange}
                placeholder="Who are you visiting?"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              />
            </div>
          </div>

          <div className="relative">
            <label className="text-sm font-medium text-slate-700 mb-1 block ml-1">Host Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                required
                type="email"
                name="hostEmail"
                value={formData.hostEmail}
                onChange={handleChange}
                placeholder="host@company.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Camera Section */}
        <div className="space-y-4 border-t border-slate-100 pt-6 mt-6">
          <label className="text-sm font-medium text-slate-700 block ml-1">Visitor Photo (Optional)</label>
          
          {!photo && !isCameraOpen && (
            <button
              type="button"
              onClick={startCamera}
              className="w-full py-4 border-2 border-dashed border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold flex items-center justify-center space-x-2 transition-colors shadow-sm"
            >
              <Camera size={20} />
              <span>Take a Photo</span>
            </button>
          )}

          {isCameraOpen && (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-inner animate-in fade-in zoom-in duration-300">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold shadow-lg hover:bg-indigo-50 transition-colors"
                >
                  Capture
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="bg-slate-800/80 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-slate-900 transition-colors backdrop-blur-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {photo && (
            <div className="flex justify-center animate-in fade-in zoom-in duration-300">
              <div className="relative inline-block">
                <img src={photo} alt="Visitor" className="w-32 h-32 object-cover rounded-2xl shadow-md border-4 border-white" />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded-full shadow-lg transition-colors transform hover:scale-105 active:scale-95"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setFormData({ name: '', phone: '', purpose: '', hostName: '', hostEmail: '' });
              setPhoto(null);
            }}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            <X size={20} />
            <span>Clear</span>
          </button>
          <button
            disabled={loading}
            type="submit"
            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
