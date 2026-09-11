import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User, Truck, Camera, CameraOff, RefreshCw, ScanFace, Check, ChevronRight, ChevronLeft, Loader2, Star, UserCheck, ClipboardList, Clock, CalendarClock, BadgeCheck, Home } from 'lucide-react';
import { format } from 'date-fns';
import FrequentVisitorLookup from './FrequentVisitorLookup';
import BadgeLookup from './BadgeLookup';
import OnboardingGuide from './OnboardingGuide';
import { DURATION_OPTIONS, DURATION_MINUTES, getExpectedCheckout } from '../lib/visitUtils';
import { getFaceEmbedding, verifyFace } from '../lib/faceVerification';
import { generateBadgeNumber } from '../lib/badge';
import { sendVisitEmail, sendHostEmail } from '../lib/email';
import { getAppSettings, DEFAULT_DURATION } from '../lib/settings';
import { useAuth } from '../context/AuthContext';

const FIREBASE_TIMEOUT_MS = 15000;
const FIREBASE_RETRIES = 2;

let faceApiPromise = null;
const getFaceApi = () => {
  if (!faceApiPromise) {
    faceApiPromise = import('@vladmandic/face-api');
  }
  return faceApiPromise;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const withTimeout = (promise, ms = FIREBASE_TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    )
  ]);

const CheckInForm = ({ onCheckInSuccess }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0: Home, 1: Details, 2: Visit, 3: Photo, 4: Verify, 5: Confirm
  const [visitorType, setVisitorType] = useState(null); // 'visitor' or 'delivery'
  const [showLookup, setShowLookup] = useState(false);
  const [frequentVisitorId, setFrequentVisitorId] = useState(null); // ID of linked frequent visitor profile
  const [showBadgeLookup, setShowBadgeLookup] = useState(false);
  const [preRegisteredVisit, setPreRegisteredVisit] = useState(null); // Retrieved pre-registered visit for badge check-in
  // Host/admin registration flow (New Visitor button): staff fill in the
  // details, no photo is captured, and Confirm emails the badge number.
  // Reception check-in flows (badge / returning) still capture the photo.
  const [isHostRegistration, setIsHostRegistration] = useState(false);
  
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
    duration: '30 Minutes',
    agreed: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailWarning, setEmailWarning] = useState('');

  useEffect(() => {
    let cancelled = false;
    // Seed the default visit duration from admin Settings when not signed-in,
    // but only before the visitor has chosen anything.
    getAppSettings().then((settings) => {
      if (cancelled) return;
      setFormData((prev) => ({
        ...prev,
        duration: settings.defaultVisitDuration || DEFAULT_DURATION,
      }));
    });
    return () => { cancelled = true; };
  }, []);
  
  // Camera state
  const [verificationStatus, setVerificationStatus] = useState('idle'); // idle, verifying, success, failed
  const [verificationMessage, setVerificationMessage] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [faceModelStatus, setFaceModelStatus] = useState('loading');
  const [photo, setPhoto] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('idle');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const modelReadyRef = useRef(false);
  const countdownTimerRef = useRef(null);
  const detectionTimerRef = useRef(null);
  const faceDetectBusyRef = useRef(false);
  const cameraStartRef = useRef(false);
  const cameraStatusRef = useRef('idle');
  const countdownValueRef = useRef(0);
  const photoRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const startCamera = async () => {
    if (cameraStartRef.current || streamRef.current) return;
    cameraStartRef.current = true;
    setCameraStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      } else {
        loadFaceModel();
      }
      setCameraStatus('live');
      startDetectionLoop();
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraStatus('error');
      setError("Could not access camera. Please allow permissions.");
    } finally {
      cameraStartRef.current = false;
    }
  };

  const stopDetectionLoop = () => {
    if (detectionTimerRef.current) {
      clearInterval(detectionTimerRef.current);
      detectionTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    countdownValueRef.current = 0;
    setCountdown(0);
    setFaceDetected(false);
  };

  const stopCamera = () => {
    stopDetectionLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('idle');
  };

  const loadFaceModel = async () => {
    try {
      const faceapi = await getFaceApi();
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      modelReadyRef.current = true;
      setFaceModelStatus('ready');
    } catch (err) {
      console.error('Failed to load face detection model:', err);
      modelReadyRef.current = false;
      setFaceModelStatus('failed');
    }
  };

  const detectFace = async () => {
    const video = videoRef.current;
    const detectCanvas = detectCanvasRef.current;
    if (!video || !detectCanvas || !modelReadyRef.current || cameraStatusRef.current !== 'live') return;
    if (video.readyState < 2 || !video.videoWidth) return;
    if (faceDetectBusyRef.current) return;
    faceDetectBusyRef.current = true;
    try {
      const faceapi = await getFaceApi();
      const scaleW = 320;
      const scaleH = Math.round((video.videoHeight / video.videoWidth) * scaleW);
      detectCanvas.width = scaleW;
      detectCanvas.height = scaleH;
      const ctx = detectCanvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, detectCanvas.width, detectCanvas.height);
      const detections = await faceapi.detectAllFaces(detectCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 }));
      if (streamRef.current && !photoRef.current) {
        const hasFace = detections && detections.length > 0;
        setFaceDetected(hasFace);
        if (hasFace) {
          if (countdownTimerRef.current === null) startCountdown();
        } else {
          if (countdownTimerRef.current !== null) cancelCountdown();
        }
      }
    } catch (err) {
      if (err) {
        // transient detection failures are ignored
      }
    } finally {
      faceDetectBusyRef.current = false;
    }
  };

  const startDetectionLoop = () => {
    loadFaceModel();
    if (detectionTimerRef.current) return;
    detectionTimerRef.current = setInterval(detectFace, 400);
  };

  const startCountdown = () => {
    countdownValueRef.current = 3;
    setCountdown(3);
    countdownTimerRef.current = setInterval(() => {
      countdownValueRef.current -= 1;
      const next = countdownValueRef.current;
      setCountdown(next);
      if (next <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        capturePhoto();
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    countdownValueRef.current = 0;
    setCountdown(0);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && streamRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 960;
      canvas.height = video.videoHeight || 720;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      photoRef.current = photoDataUrl;
      setPhoto(photoDataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    photoRef.current = null;
    setPhoto(null);
    setFaceDetected(false);
    setCountdown(0);
    startCamera();
  };

  const performVerification = async () => {
    setVerificationStatus('verifying');
    setVerificationMessage('Comparing your photo...');
    try {
      if (!preRegisteredVisit?.photoUrl || !photo) {
        throw new Error('Reference photo or live photo missing.');
      }
      // Convert DataURLs to images for face-api
      const imgRef = new Image();
      imgRef.src = preRegisteredVisit.photoUrl;
      await imgRef.decode();
      
      const imgLive = new Image();
      imgLive.src = photo;
      await imgLive.decode();

      const descRef = await getFaceEmbedding(imgRef);
      const descLive = await getFaceEmbedding(imgLive);

      if (!descRef || !descLive) {
        throw new Error('Could not detect face in one of the photos.');
      }

      const result = await verifyFace(descRef, descLive);
      if (result.verified) {
        setVerificationStatus('success');
        setVerificationMessage('Identity verified!');
      } else {
        setVerificationStatus('failed');
        setVerificationMessage('Identity could not be verified. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setVerificationStatus('failed');
      setVerificationMessage(err.message);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (step === 3 && !photoRef.current) {
        startCamera();
      } else {
        stopCamera();
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    cameraStatusRef.current = cameraStatus;
    if (cameraStatus === 'live' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStatus]);

  const handleFrequentVisitorSelect = (profile) => {
    setShowLookup(false);
    setFrequentVisitorId(profile.id);
    setIsHostRegistration(false);
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
      duration: profile.defaultDuration || '30 Minutes',
    }));
    // Skip personal details — go straight to visit details
    setStep(2);
  };

  const handleBadgeSelect = (visit) => {    setShowBadgeLookup(false);
    setPreRegisteredVisit(visit);
    setFrequentVisitorId(null);
    setIsHostRegistration(false);
    setVisitorType('visitor');
    setFormData((prev) => ({
      ...prev,
      name: visit.name || '',
      company: visit.company || '',
      phone: visit.phone || '',
      email: visit.email || '',
      idType: visit.idType || 'National ID',
      idNumber: visit.idNumber || '',
      hostName: visit.hostName || '',
      hostEmail: visit.hostEmail || '',
      purpose: visit.purpose || 'Business Meeting',
      duration: visit.duration || '30 Minutes',
    }));
    // Skip personal/visit entry — go straight to facial capture/verify
    setStep(3);
  };

  const goHome = () => {
    stopCamera();
    setPreRegisteredVisit(null);
    setFrequentVisitorId(null);
    setIsHostRegistration(false);
    setVisitorType(null);
    setPhoto(null);
    setError('');
    setEmailWarning('');
    setStep(0);
  };

  const sendConfirmationEmail = async (visitor) => {
    const results = await Promise.allSettled([
      sendVisitEmail(visitor, {
        message: 'Your check-in is confirmed. Please present this badge at reception.',
      }),
      visitor.hostEmail
        ? sendHostEmail(visitor, {
            message: `${visitor.name || 'A visitor'} has checked in. Badge number ${visitor.badgeNumber || ''}.`,
          })
        : Promise.resolve(true),
    ]);
    const emailOk = results.every((r) => r.status === 'fulfilled' && r.value === true);
    if (!emailOk) {
      console.warn('One or more notification emails failed to send.');
      setEmailWarning('Check-in saved, but one or more notification emails could not be sent.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agreed) {
      setError("You must agree to the terms and conditions.");
      return;
    }
    if (!formData.email) {
      setError("Please provide an email address so we can send your confirmation.");
      return;
    }
    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError('');
    setEmailWarning('');

    const checkInTime = new Date();
    const expectedCheckoutTime = getExpectedCheckout(formData.duration);
    const durationMinutes = DURATION_MINUTES[formData.duration] || 60;
    let savedVisitor = null;

    try {
      if (preRegisteredVisit) {
        // Pre-registered badge check-in: activate the existing visit record.
        const badgeNumber = preRegisteredVisit.badgeNumber || generateBadgeNumber();
        const payload = {
          photoUrl: photo || null,
          checkInTime: serverTimestamp(),
          checkInBy: user?.uid || null,
          expectedCheckoutTime,
          duration: formData.duration,
          durationMinutes,
          status: 'Checked In',
          frequentVisitorId: frequentVisitorId || preRegisteredVisit.profileId || null,
        };

        let updated = false;
        for (let attempt = 0; attempt <= FIREBASE_RETRIES; attempt += 1) {
          try {
            await withTimeout(updateDoc(doc(db, 'visitors', preRegisteredVisit.id), payload));
            updated = true;
            break;
          } catch (err) {
            // Only retry on transient/network failures, never on permission denials.
            const transient =
              err?.code === 'unavailable' ||
              err?.code === 'deadline-exceeded' ||
              err?.code === 'network-request-failed' ||
              err?.code === 'resource-exhausted' ||
              /timed out/i.test(err?.message || '');
            if (attempt === FIREBASE_RETRIES || !transient) {
              throw err;
            }
            console.warn(`Badge check-in update attempt ${attempt + 1} failed, retrying…`, err);
          }
        }
        if (!updated) throw new Error('Failed to check in the pre-registered visit.');

        savedVisitor = {
          id: preRegisteredVisit.id,
          badgeNumber,
          ...formData,
          type: 'visitor',
          photoUrl: photo,
          checkInTime,
          expectedCheckoutTime,
          durationMinutes,
        };
      } else if (isHostRegistration && !frequentVisitorId) {
        // Host/admin registration: create a Pre-Registered visit with a
        // badge number and email it to the visitor. No photo is captured
        // here — reception takes the photo at check-in via badge lookup.
        const badgeNumber = generateBadgeNumber();
        const payload = {
          ...formData,
          type: visitorType,
          photoUrl: null,
          badgeNumber,
          expectedArrivalTime: serverTimestamp(),
          expectedCheckoutTime,
          duration: formData.duration,
          durationMinutes,
          status: 'Pre-Registered',
          profileId: null,
          frequentVisitorId: null,
          registeredBy: user?.uid || null,
          hostId: null,
          registrationTime: serverTimestamp(),
          registrationEmailSent: false,
          createdAt: serverTimestamp(),
        };

        let docRef = null;
        for (let attempt = 0; attempt <= FIREBASE_RETRIES; attempt += 1) {
          try {
            docRef = await withTimeout(addDoc(collection(db, 'visitors'), payload));
            break;
          } catch (err) {
            const transient =
              err?.code === 'unavailable' ||
              err?.code === 'deadline-exceeded' ||
              err?.code === 'network-request-failed' ||
              err?.code === 'resource-exhausted' ||
              /timed out/i.test(err?.message || '');
            if (attempt === FIREBASE_RETRIES || !transient) {
              throw err;
            }
            console.warn(`Registration write attempt ${attempt + 1} failed, retrying…`, err);
          }
        }

        savedVisitor = {
          id: docRef.id,
          badgeNumber,
          ...formData,
          type: visitorType,
          photoUrl: null,
          checkInTime: null,
          expectedCheckoutTime,
          durationMinutes,
          status: 'Pre-Registered',
        };
      } else {
        const badgeNumber = generateBadgeNumber();
        const payload = {
          ...formData,
          type: visitorType,
          photoUrl: photo || null,
          badgeNumber,
          checkInTime: serverTimestamp(),
          expectedCheckoutTime,
          duration: formData.duration,
          durationMinutes,
          status: 'Checked In',
          frequentVisitorId: frequentVisitorId || null,
        };

        let docRef = null;
        for (let attempt = 0; attempt <= FIREBASE_RETRIES; attempt += 1) {
          try {
            docRef = await withTimeout(addDoc(collection(db, 'visitors'), payload));
            break;
          } catch (err) {
            // Only retry on transient/network failures, never on permission denials.
            const transient =
              err?.code === 'unavailable' ||
              err?.code === 'deadline-exceeded' ||
              err?.code === 'network-request-failed' ||
              err?.code === 'resource-exhausted' ||
              /timed out/i.test(err?.message || '');
            if (attempt === FIREBASE_RETRIES || !transient) {
              throw err;
            }
            console.warn(`Check-in write attempt ${attempt + 1} failed, retrying…`, err);
          }
        }

        savedVisitor = {
          id: docRef.id,
          badgeNumber,
          ...formData,
          type: visitorType,
          photoUrl: photo,
          checkInTime,
          expectedCheckoutTime,
          durationMinutes,
        };
      }
    } catch (err) {
      console.error("Error during check-in: ", err);
      const code = err?.code || '';
      setError(
        code === 'permission-denied'
          ? "Check-in was blocked: Firestore security rules deny this write. Ask your administrator to deploy firestore.rules."
          : code === 'not-found'
            ? "Check-in failed: the Firestore database is not provisioned for this Firebase project."
            : /timed out/i.test(err?.message || '')
              ? "Check-in failed: the Firestore write timed out. Enable the Cloud Firestore API, create the database for this Firebase project, and deploy firestore.rules, then retry."
              : code === 'unavailable' || /network/i.test(err?.message || '')
                ? "Check-in failed: the connection was lost. Check your internet connection and try again."
                : "Failed to check in. Please try again."
      );
    } finally {
      setLoading(false);
    }

    if (savedVisitor) {
      if (savedVisitor.status === 'Pre-Registered') {
        // Host/admin registration: email the badge number to the visitor
        // (and the host when a host email was entered).
        const results = await Promise.allSettled([
          sendVisitEmail(savedVisitor, {
            message: `Your visit has been pre-registered. Your badge number is ${savedVisitor.badgeNumber}. Please present it at reception when you arrive.`,
          }),
          savedVisitor.hostEmail
            ? sendHostEmail(savedVisitor, {
                message: `${savedVisitor.name || 'A visitor'} has been registered. Badge number ${savedVisitor.badgeNumber}.`,
              })
            : Promise.resolve(true),
        ]);
        const emailOk = results.every((r) => r.status === 'fulfilled' && r.value === true);
        if (!emailOk) {
          console.warn('One or more registration emails failed to send.');
          setEmailWarning('Registration saved, but one or more notification emails could not be sent.');
        }
        try {
          await updateDoc(doc(db, 'visitors', savedVisitor.id), { registrationEmailSent: emailOk });
        } catch (err) {
          console.warn('Could not record registrationEmailSent:', err);
        }
        onCheckInSuccess({ ...savedVisitor, emailWarning: emailOk ? emailWarning : 'Registration saved, but one or more notification emails could not be sent.' });
      } else {
        await sendConfirmationEmail(savedVisitor);
        onCheckInSuccess({ ...savedVisitor, emailWarning });
      }
    }
  };

  const renderStepper = () => {
    // Host/admin registration skips photo + verification, so the sidebar
    // shows only: Visitor Details → Visit Details → Confirm & Send.
    const fullSteps = [
      { num: 1, label: 'Visitor Details' },
      { num: 2, label: 'Visit Details' },
      { num: 3, label: 'Photo Capture' },
      { num: 4, label: 'Verify Identity' },
      { num: 5, label: 'Confirm & Print' }
    ];
    const hostSteps = [
      { num: 1, label: 'Visitor Details' },
      { num: 2, label: 'Visit Details' },
      { num: 5, label: 'Confirm & Send' }
    ];
    const steps = isHostRegistration ? hostSteps : fullSteps;

    return (
      <div className="w-64 border-r border-slate-100 p-8 hidden md:block bg-slate-50/50">
        <div className="space-y-8">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step === s.num ? 'bg-blue-600 text-white' : 
                step > s.num ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'
              }`}>
                {step > s.num ? <Check size={16} /> : i + 1}
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

        {/* Pre-Registered Badge Lookup Modal */}
        {showBadgeLookup && (
          <BadgeLookup
            onSelect={handleBadgeSelect}
            onClose={() => setShowBadgeLookup(false)}
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

        <div className="z-10 flex flex-col sm:flex-row items-center justify-center max-w-4xl w-full gap-5">
          {/* New Visitor — host/admin registration (creates badge + emails it) */}
          <button
            onClick={() => { setVisitorType('visitor'); setFrequentVisitorId(null); setPreRegisteredVisit(null); setIsHostRegistration(true); setShowBadgeLookup(false); setStep(1); }}
            className="flex-1 w-full bg-[#0a1526] border border-blue-500/30 hover:border-blue-400 hover:bg-[#0d1b33] transition-all p-10 rounded-3xl flex flex-col items-center justify-center gap-4 group shadow-2xl"
          >
            <div className="w-20 h-20 rounded-full border-2 border-blue-500/50 flex items-center justify-center group-hover:scale-110 transition-transform bg-[#0B192C]">
              <User size={36} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white mt-2">New Visitor</span>
            <span className="text-blue-400 group-hover:text-blue-300 text-sm">Register & email badge &rarr;</span>
          </button>

          {/* Returning Visitor */}
          <button
            onClick={() => { setPreRegisteredVisit(null); setShowBadgeLookup(false); setShowLookup(true); }}
            className="flex-1 w-full bg-[#0a1526] border border-amber-500/30 hover:border-amber-400 hover:bg-[#0d1b33] transition-all p-10 rounded-3xl flex flex-col items-center justify-center gap-4 group shadow-2xl"
          >
            <div className="w-20 h-20 rounded-full border-2 border-amber-500/50 flex items-center justify-center group-hover:scale-110 transition-transform bg-[#0B192C]">
              <Star size={36} className="text-amber-400" />
            </div>
            <span className="text-2xl font-bold text-white mt-2">Returning Visitor</span>
            <span className="text-amber-400/80 group-hover:text-amber-300 text-sm">Fast check-in &rarr;</span>
          </button>

          {/* Pre-Registered (badge) Check-In */}
          <button
            onClick={() => { setShowLookup(false); setShowBadgeLookup(true); }}
            className="flex-1 w-full bg-[#0a1526] border border-teal-500/30 hover:border-teal-400 hover:bg-[#0d1b33] transition-all p-10 rounded-3xl flex flex-col items-center justify-center gap-4 group shadow-2xl"
          >
            <div className="w-20 h-20 rounded-full border-2 border-teal-500/50 flex items-center justify-center group-hover:scale-110 transition-transform bg-[#0B192C]">
              <BadgeCheck size={36} className="text-teal-300" />
            </div>
            <span className="text-2xl font-bold text-white mt-2">Have a Badge?</span>
            <span className="text-teal-400 group-hover:text-teal-300 text-sm">Pre-registered check-in &rarr;</span>
          </button>
        </div>

        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
          <OnboardingGuide />
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
            <button onClick={() => setStep(step === 1 ? 0 : (step === 5 && isHostRegistration ? 2 : step - 1))} className="mr-4 text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {step === 1 && "Visitor Details"}
                {step === 2 && "Visit Details"}
                {step === 3 && "Photo Capture"}
                {step === 4 && "Verify Identity"}
                {step === 5 && (isHostRegistration ? "Confirm & Send Badge" : "Confirm Your Visit")}
              </h2>
              <p className="text-slate-500 mt-1">
                {step === 1 && "Enter the visitor's details"}
                {step === 2 && "Who are they here to see?"}
                {step === 3 && "Please look at the camera"}
                {step === 4 && "Facial verification"}
                {step === 5 && (isHostRegistration ? "Confirm to create the badge and email it to the visitor" : "Please confirm your details")}
                </p>
              </div>
              <button onClick={goHome} className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0">
                <Home size={16} /> Home
              </button>
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="john.smith@example.com" />
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
                    if (!formData.email) {
                      setError("Please provide an email address so we can send your confirmation.");
                      return;
                    }
                    if (!isValidEmail(formData.email)) {
                      setError("Please enter a valid email address.");
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

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Expected Duration *</label>
                <select name="duration" value={formData.duration} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white">
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Your expected checkout time is calculated automatically.</p>
              </div>

              <div className="pt-6 flex justify-end">
                <button 
                  onClick={() => {
                    if(!formData.hostName) {
                      setError("Please provide host name.");
                      return;
                    }
                    setError('');
                    if (isHostRegistration && !preRegisteredVisit && !frequentVisitorId) {
                      // Host/admin registration: no photo capture — go
                      // straight to Confirm & Send Badge.
                      setStep(5);
                    } else {
                      setStep(3);
                      startCamera();
                    }
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
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col items-center w-full max-w-md">
              <div className="w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-xl relative">
                <div className="relative w-full aspect-[3/4] flex items-center justify-center overflow-hidden">
                  {/* Camera / preview viewers */}
                  {photo ? (
                    <img src={photo} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
                  ) : cameraStatus === 'live' ? (
                    <>
                      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" />
                      <canvas ref={detectCanvasRef} className="hidden" />
                    </>
                  ) : null}

                  {/* Face detection frame overlay */}
                  {!photo && cameraStatus === 'live' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className={`w-44 h-56 sm:w-52 sm:h-64 rounded-[3rem] border-4 transition-colors duration-300 ${
                        faceDetected ? 'border-emerald-400' : 'border-sky-300'
                      }`} />
                      <p className={`mt-3 px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${
                        faceDetected ? 'bg-emerald-500 text-white' : 'bg-slate-800/70 text-white'
                      }`}>
                        {faceDetected ? <Check size={16} /> : <ScanFace size={16} />}
                        {faceDetected
                          ? 'Face detected — hold still'
                          : faceModelStatus === 'loading'
                            ? 'Preparing camera…'
                            : 'Position your face in the frame'}
                      </p>
                    </div>
                  )}

                  {/* Countdown overlay */}
                  {!photo && countdown > 0 && cameraStatus === 'live' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 pointer-events-none">
                      <div className="w-28 h-28 rounded-full bg-white/95 shadow-2xl flex items-center justify-center">
                        <span className="text-6xl font-extrabold text-[#0B192C]">{countdown}</span>
                      </div>
                    </div>
                  )}

                  {/* Auto-capture unavailable notice */}
                  {!photo && cameraStatus === 'live' && faceModelStatus === 'failed' && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium pointer-events-none whitespace-nowrap">
                      Auto-capture unavailable — use Capture Photo
                    </div>
                  )}

                  {/* Camera starting */}
                  {!photo && cameraStatus === 'starting' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                      <Loader2 size={40} className="animate-spin text-white mb-4" />
                      <p className="text-white font-medium">Starting camera…</p>
                    </div>
                  )}

                  {/* Camera error */}
                  {!photo && cameraStatus === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 p-6 text-center">
                      <CameraOff size={44} className="text-slate-300 mb-3" />
                      <p className="text-slate-700 font-semibold">Camera unavailable</p>
                      <p className="text-slate-500 text-sm mt-1 mb-5">Allow camera access in your browser to continue.</p>
                      <button
                        onClick={startCamera}
                        className="flex items-center gap-2 bg-[#0B192C] hover:bg-[#14294a] text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
                      >
                        <RefreshCw size={16} /> Try Again
                      </button>
                    </div>
                  )}

                  {/* Dark idle screen fallback */}
                  {!photo && cameraStatus === 'idle' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                      <p className="text-white font-medium">Preparing photo capture…</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
                {!photo ? (
                  <>
                    <button
                      onClick={capturePhoto}
                      disabled={cameraStatus !== 'live'}
                      className="flex-1 bg-[#0B192C] hover:bg-[#14294a] text-white py-3.5 rounded-xl font-semibold flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera size={18} className="mr-2" /> Capture Photo
                    </button>
                    {cameraStatus === 'error' && (
                      <button
                        onClick={() => setStep(4)}
                        className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-3.5 rounded-xl font-semibold transition-colors"
                      >
                        Continue Without Photo
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={retakePhoto} className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-3.5 rounded-xl font-semibold transition-colors">
                      Retake
                    </button>
                    <button onClick={() => setStep(preRegisteredVisit?.photoUrl ? 4 : 5)} className="flex-1 bg-[#0B192C] hover:bg-[#14294a] text-white py-3.5 rounded-xl font-semibold transition-colors">
                      Next &rarr;
                    </button>
                  </>
                )}
              </div>

              {!photo && cameraStatus === 'live' && faceModelStatus === 'ready' && (
                <p className="text-sm text-slate-500 mt-4 text-center">
                  Your photo will be taken automatically when your face is detected.
                </p>
              )}
            </div>
          )}

          {/* Step 4: Verify Identity (only when a reference photo exists;
              badge visits are created without a photo — photo is taken
              at reception — so this step is skipped) */}
          {step === 4 && (
            preRegisteredVisit && !preRegisteredVisit.photoUrl ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col items-center">
                <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50 w-full">
                  <p className="font-semibold text-slate-800 text-center">No reference photo on file — verification skipped. The reception photo will be kept on record.</p>
                </div>
                <button
                  onClick={() => setStep(5)}
                  className="bg-[#0B192C] hover:bg-[#14294a] text-white px-8 py-3 rounded-lg font-semibold"
                >
                  Continue to Confirm
                </button>
              </div>
            ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col items-center">
              <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50 w-full">
                <p className="font-semibold text-slate-800 text-center">{verificationMessage}</p>
              </div>
              
              {verificationStatus === 'idle' && (
                <button 
                  onClick={performVerification}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
                >
                  Start Verification
                </button>
              )}
              
              {verificationStatus === 'verifying' && (
                <Loader2 size={32} className="animate-spin text-blue-600" />
              )}
              
              {verificationStatus === 'success' && (
                <button 
                  onClick={() => setStep(5)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-semibold"
                >
                  Verification Successful — Continue
                </button>
              )}

              {verificationStatus === 'failed' && (
                <button 
                  onClick={() => setStep(3)}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-lg font-semibold"
                >
                  Verification Failed — Retake Photo
                </button>
              )}
            </div>
            )
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
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
                <div className="grid grid-cols-[120px_1fr] items-start">
                  <span className="text-slate-500 font-medium text-sm flex items-center"><Clock size={16} className="mr-2"/> Duration</span>
                  <span className="font-semibold text-slate-800">{formData.duration}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-start">
                  <span className="text-slate-500 font-medium text-sm flex items-center"><CalendarClock size={16} className="mr-2"/> Expected Checkout</span>
                  <span className="font-semibold text-slate-800">
                    {formData.duration ? format(getExpectedCheckout(formData.duration), 'MMM d, h:mm a') : '—'}
                  </span>
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
                  {isHostRegistration
                    ? "I confirm these visitor details are correct and the badge number may be emailed to the visitor."
                    : "I agree to the terms and conditions and understand that my photo and details will be securely stored for security purposes."}
                </span>
              </label>

              <button 
                onClick={handleSubmit}
                disabled={loading || !formData.agreed}
                className="w-full bg-[#0B192C] hover:bg-[#14294a] text-white py-4 rounded-xl font-bold flex items-center justify-center transition-all disabled:opacity-50 shadow-lg"
              >
                {loading ? <Loader2 size={20} className="animate-spin mr-2" /> : null}
                {loading ? 'Processing...' : (isHostRegistration ? 'Confirm & Send Badge' : 'Confirm & Print Badge')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckInForm;
