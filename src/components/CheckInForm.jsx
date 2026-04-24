import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserPlus, Phone, ClipboardList, UserCheck, Loader2 } from 'lucide-react';

const CheckInForm = ({ onCheckInSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    purpose: '',
    hostName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const docRef = await addDoc(collection(db, 'visitors'), {
        ...formData,
        checkInTime: serverTimestamp(),
        checkOutTime: null,
        status: 'Active'
      });
      
      onCheckInSuccess({ id: docRef.id, ...formData, checkInTime: new Date() });
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
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
      </form>
    </div>
  );
};

export default CheckInForm;
