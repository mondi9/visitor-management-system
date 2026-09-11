// Lazy-load face-api so the initial bundle stays small and the login /
// admin pages render even if the heavy tfjs payload fails to load.
const MODEL_URL = '/models';
let modelsLoaded = false;
let faceapiPromise = null;

const getFaceApi = () => {
  if (!faceapiPromise) {
    faceapiPromise = import('@vladmandic/face-api');
  }
  return faceapiPromise;
};

export const loadModels = async () => {
  if (modelsLoaded) return;
  const faceapi = await getFaceApi();
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  modelsLoaded = true;
};

export const getFaceEmbedding = async (imageElement) => {
  await loadModels();
  const faceapi = await getFaceApi();
  const detection = await faceapi.detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection ? detection.descriptor : null;
};

// Compare two descriptors. A lower distance indicates higher similarity.
// Typical threshold for face matching is < 0.6
export const verifyFace = async (descriptor1, descriptor2, threshold = 0.6) => {
  const faceapi = await getFaceApi();
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  return {
    verified: distance < threshold,
    distance,
  };
};
