import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { User, Truck, Camera, Check, ChevronRight, CheckCircle2, ChevronLeft, Loader2, Star } from 'lucide-react';
import emailjs from '@emailjs/browser';
import FrequentVisitorLookup from './FrequentVisitorLookup';

const CheckInForm = ({ onCheckInSuccess }) => {
  const [step, setStep] = useState(0); // 0: Home, 1: Details, 2: Visit, 3: Photo, 4: Confirm
  const [visitorType, setVisitorType] = useState(null); // 'visitor' or 'delivery'
  const [showLookup, setShowLookup] = useState(false);
  const [frequentVisitorId, setFrequentVisitorId] = useState(null); // ID of linked frequent visitor profile
  
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    idType: 'National ID',
    idNumber: '',
    hostName: '',
    hostEmail: '',
    purpose: 'Business Meeting',
    agreed: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Camera state
  const [photo, setPhoto] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

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
      const photoDataUrl = canvas.toDataURL('image/jpeg');
      setPhoto(photoDataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  const handleFrequentVisitorSelect = (profile) => {
    setShowLookup(false);
    setFrequentVisitorId(profile.id);
    setVisitorType('visitor');
    setFormData(prev => ({
      ...prev,
      name: profile.name || '',
      company: profile.company || '',
      phone: profile.phone || '',
      email: profile.email || '',
      idType: profile.idType || 'National ID',
      idNumber: profile.idNumber || '',
      hostName: profile.defaultHostName || '',
      hostEmail: profile.defaultHostEmail || '',
      purpose: profile.defaultPurpose || 'Business Meeting',
    }));
    // Skip personal details — go straight to visit details
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agreed) {
      setError("You must agree to the terms and conditions.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const docRef = await addDoc(collection(db, 'visitors'), {
        ...formData,
        type: visitorType,
        photoUrl: photo || null,
        checkInTime: serverTimestamp(),
        status: 'Active',
        frequentVisitorId: frequentVisitorId || null,
      });

      // Send email
      if (formData.hostEmail) {
        try {
          await emailjs.send(
            'service_pudj21h',
            'template_g63m5w7',
            {
              to_email: formData.hostEmail,
              to_name: formData.hostName,
              visitor_name: formData.name,
              purpose: formData.purpose
            },
            '8YlVwO1i4WdIf-sYn'
          );
        } catch (emailErr) {
          console.error("Failed to send email notification:", emailErr);
        }
      }

      onCheckInSuccess({ id: docRef.id, ...formData, type: visitorType, photoUrl: photo, checkInTime: new Date() });
    } catch (err) {
      console.error("Error adding document: ", err);
      setError("Failed to check in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepper = () => {
    const steps = [
      { num: 1, label: 'Your Details' },
      { num: 2, label: 'Visit Details' },
      { num: 3, label: 'Photo Capture' },
      { num: 4, label: 'Confirm & Print' }
    ];

    return (
      <div className="w-64 border-r border-slate-100 p-8 hidden md:block bg-slate-50/50">
        <div className="space-y-8">
          {steps.map((s) => (
            <div key={s.num} className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step === s.num ? 'bg-blue-600 text-white' : 
                step > s.num ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'
              }`}>
                {step > s.num ? <Check size={16} /> : s.num}
              </div>
              <span className={`font-semibold text-sm ${
                step === s.num ? 'text-slate-900' : 'text-slate-500'
              }`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Screen 0: Initial Kiosk Screen
  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#0B192C] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-blue-900 blur-3xl"></div>
          <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-900 blur-3xl"></div>
        </div>

        {/* Frequent Visitor Lookup Modal */}
        {showLookup && (
          <FrequentVisitorLookup
            onSelect={handleFrequentVisitorSelect}
            onClose={() => setShowLookup(false)}
          />
        )}

        <div className="z-10 text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20">
              <span className="font-bold text-4xl text-white tracking-tight">VMS</span>
            </div>
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-4">Welcome</h1>
          <p className="text-xl text-blue-200">We're happy to see you</p>
        </div>

        <div className="z-10 flex flex-col sm:flex-row items-center justify-center max-w-2xl w-full gap-5">
          {/* New Visitor */}
          <button
            onClick={() => { setVisitorType('visitor'); setFrequentVisitorId(null); setStep(1); }}
            className="flex-1 w-full bg-[#0a1526] border border-blue-500/30 hover:border-blue-400 hover:bg-[#0d1b33] transition-all p-10 rounded-3xl flex flex-col items-center justify-center gap-4 group shadow-2xl"
          >
            <div className="w-20 h-20 rounded-full border-2 border-blue-500/50 flex items-center justify-center group-hover:scale-110 transition-transform bg-[#0B192C]">
              <User size={36} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white mt-2">New Visitor</span>
            <span className="text-blue-400 group-hover:text-blue-300 text-sm">First time here &rarr;</span>
          </button>

          {/* Returning Visitor */}
          <button
            onClick={() => setShowLookup(true)}
            className="flex-1 w-full bg-[#0a1526] border border-amber-500/30 hover:border-amber-400 hover:bg-[#0d1b33] transition-all p-10 rounded-3xl flex flex-col items-center justify-center gap-4 group shadow-2xl"
          >
            <div className="w-20 h-20 rounded-full border-2 border-amber-500/50 flex items-center justify-center group-hover:scale-110 transition-transform bg-[#0B192C]">
              <Star size={36} className="text-amber-400" />
            </div>
            <span className="text-2xl font-bold text-white mt-2">Returning Visitor</span>
            <span className="text-amber-400/80 group-hover:text-amber-300 text-sm">Fast check-in &rarr;</span>
          </button>
        </div>

        <div className="absolute bottom-6 right-6 z-20">
          <Link to="/admin" className="text-blue-500/50 hover:text-blue-400 text-sm font-medium transition-colors flex items-center gap-2">
            Admin Portal &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex overflow-hidden border border-slate-200">
        
        {renderStepper()}

        <div className="flex-1 p-8 md:p-12">
          {/* Header */}
          <div className="flex items-center mb-8">
            <button onClick={() => setStep(step === 1 ? 0 : step - 1)} className="mr-4 text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {step === 1 && "Visitor Self Check-In"}
                {step === 2 && "Visit Details"}
                {step === 3 && "Photo Capture"}
                {step === 4 && "Confirm Your Visit"}
              </h2>
              <p className="text-slate-500 mt-1">
                {step === 1 && "Please fill in your details"}
                {step === 2 && "Who are you here to see?"}
                {step === 3 && "Please look at the camera"}
                {step === 4 && "Please confirm your details"}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r">
              <p>{error}</p>
            </div>
          )}

          {/* Step 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="John Smith" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Company / Organization (Optional)</label>
                <input type="text" name="company" value={formData.company} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="ABC Technologies" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="+1 234 567 8900" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="john.smith@example.com" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">ID Type (Optional)</label>
                  <select name="idType" value={formData.idType} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white">
                    <option>None</option>
                    <option>National ID</option>
                    <option>Passport</option>
                    <option>Driver's License</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">ID Number (Optional)</label>
                  <input type="text" name="idNumber" value={formData.idNumber} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="12345678901" />
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <button 
                  onClick={() => {
                    if(!formData.name || !formData.phone) {
                      setError("Please fill in required fields.");
                      return;
                    }
                    setError('');
                    setStep(2);
                  }}
                  className="bg-[#0B192C] hover:bg-[#14294a] text-white px-8 py-3 rounded-lg font-semibold flex items-center transition-colors"
                >
                  Next <ChevronRight size={18} className="ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Visit Details */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Host Name *</label>
                <input required type="text" name="hostName" value={formData.hostName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="Who are you visiting?" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Host Email</label>
                <input type="email" name="hostEmail" value={formData.hostEmail} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="host@company.com" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Purpose of Visit</label>
                <select name="purpose" value={formData.purpose} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white">
                  <option>Business Meeting</option>
                  <option>Official Visit</option>
                  <option>Casual Visit</option>
                  <option>Personal Visit</option>
                  <option>Interview</option>
                  <option>Site Inspection</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="pt-6 flex justify-end">
                <button 
                  onClick={() => {
                    if(!formData.hostName) {
                      setError("Please provide host name.");
                      return;
                    }
                    setError('');
                    setStep(3);
                    startCamera();
                  }}
                  className="bg-[#0B192C] hover:bg-[#14294a] text-white px-8 py-3 rounded-lg font-semibold flex items-center transition-colors"
                >
                  Next <ChevronRight size={18} className="ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Photo Capture */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col items-center">
              
              <div className="relative w-full max-w-sm aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 mb-8 flex items-center justify-center">
                
                {/* Camera Viewers */}
                {photo ? (
                  <img src={photo} alt="Captured" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Viewfinder overlay */}
                    <div className="absolute inset-0 border-[40px] border-white/20 pointer-events-none"></div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-64 border-2 border-blue-500/50 rounded-full"></div>
                    </div>
                  </>
                )}
                
                {!isCameraOpen && !photo && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100">
                    <Camera size={48} className="text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium text-center px-6">Camera is inactive</p>
                    <button onClick={startCamera} className="mt-4 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors">Start Camera</button>
                  </div>
                )}
              </div>

              <div className="flex space-x-4 w-full max-w-sm">
                {!photo ? (
                  <button onClick={capturePhoto} disabled={!isCameraOpen} className="flex-1 bg-[#0B192C] hover:bg-[#14294a] text-white py-3 rounded-lg font-semibold flex items-center justify-center transition-colors disabled:opacity-50">
                    <Camera size={18} className="mr-2" /> Capture Photo
                  </button>
                ) : (
                  <>
                    <button onClick={retakePhoto} className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-3 rounded-lg font-semibold transition-colors">
                      Retake
                    </button>
                    <button onClick={() => setStep(4)} className="flex-1 bg-[#0B192C] hover:bg-[#14294a] text-white py-3 rounded-lg font-semibold transition-colors">
                      Next &rarr;
                    </button>
                  </>
                )}
              </div>

            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 mb-8 space-y-4">
                <div className="grid grid-cols-[120px_1fr] items-start">
                  <span className="text-slate-500 font-medium text-sm flex items-center"><User size={16} className="mr-2"/> Full Name</span>
                  <span className="font-semibold text-slate-800">{formData.name}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-start">
                  <span className="text-slate-500 font-medium text-sm flex items-center"><Truck size={16} className="mr-2"/> Company</span>
                  <span className="font-semibold text-slate-800">{formData.company || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-start">
                  <span className="text-slate-500 font-medium text-sm flex items-center"><UserCheck size={16} className="mr-2"/> Visiting</span>
                  <span className="font-semibold text-slate-800">{formData.hostName}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-start">
                  <span className="text-slate-500 font-medium text-sm flex items-center"><ClipboardList size={16} className="mr-2"/> Purpose</span>
                  <span className="font-semibold text-slate-800">{formData.purpose}</span>
                </div>
              </div>

              <label className="flex items-start space-x-3 cursor-pointer mb-8">
                <input 
                  type="checkbox" 
                  name="agreed"
                  checked={formData.agreed}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-slate-600 text-sm">
                  I agree to the <a href="#" className="text-blue-600 hover:underline">terms and conditions</a> and understand that my photo and details will be securely stored for security purposes.
                </span>
              </label>

              <button 
                onClick={handleSubmit}
                disabled={loading || !formData.agreed}
                className="w-full bg-[#0B192C] hover:bg-[#14294a] text-white py-4 rounded-xl font-bold flex items-center justify-center transition-all disabled:opacity-50 shadow-lg"
              >
                {loading ? <Loader2 size={20} className="animate-spin mr-2" /> : null}
                {loading ? 'Processing...' : 'Confirm & Print Badge'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CheckInForm;
