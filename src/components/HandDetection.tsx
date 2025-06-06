
import React, { useRef, useEffect, useState } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const HandDetection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [handCount, setHandCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const handsRef = useRef<Hands | null>(null);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results: Results) => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = videoRef.current?.videoWidth || 640;
      canvas.height = videoRef.current?.videoHeight || 480;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the video frame
      if (videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      }

      if (results.multiHandLandmarks) {
        setHandCount(results.multiHandLandmarks.length);
        
        for (const landmarks of results.multiHandLandmarks) {
          // Draw hand connections (outline)
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 2
          });
          
          // Draw hand landmarks (points)
          drawLandmarks(ctx, landmarks, {
            color: '#FF0000',
            lineWidth: 2
          });
        }
      } else {
        setHandCount(0);
      }
      
      ctx.restore();
    });

    handsRef.current = hands;

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current && hands) {
          await hands.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480
    });

    cameraRef.current = camera;

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, []);

  const startDetection = async () => {
    try {
      setError(null);
      if (cameraRef.current) {
        await cameraRef.current.start();
        setIsActive(true);
      }
    } catch (err) {
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      console.error('Camera error:', err);
    }
  };

  const stopDetection = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      setIsActive(false);
      setHandCount(0);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <Card className="p-6 w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-6">Hand Detection & Outline</h1>
        
        <div className="relative mb-4">
          <video
            ref={videoRef}
            className="hidden"
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="w-full max-w-2xl mx-auto border-2 border-gray-300 rounded-lg"
            style={{ aspectRatio: '4/3' }}
          />
          
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <p className="text-gray-500 text-lg">Camera feed will appear here</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={isActive ? stopDetection : startDetection}
            variant={isActive ? "destructive" : "default"}
            size="lg"
          >
            {isActive ? 'Stop Detection' : 'Start Detection'}
          </Button>
          
          <div className="text-lg font-semibold">
            Hands detected: <span className="text-blue-600">{handCount}</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Features:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Real-time hand detection using MediaPipe</li>
            <li>Hand outline drawing with green connections</li>
            <li>Red landmark points for precise tracking</li>
            <li>Supports detection of up to 2 hands simultaneously</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default HandDetection;
