
import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const HandDetection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [handCount, setHandCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const detectorRef = useRef<handPoseDetection.HandDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const initializeDetector = async () => {
      try {
        setIsLoading(true);
        await tf.ready();
        
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig = {
          runtime: 'tfjs' as const,
          modelType: 'full' as const,
          maxHands: 2,
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        };
        
        const detector = await handPoseDetection.createDetector(model, detectorConfig);
        detectorRef.current = detector;
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize hand detector:', err);
        setError('Failed to initialize hand detection model');
        setIsLoading(false);
      }
    };

    initializeDetector();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const drawHands = (hands: handPoseDetection.Hand[]) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    if (videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }

    // Draw hands
    hands.forEach((hand) => {
      const keypoints = hand.keypoints;
      
      // Draw landmarks (points)
      keypoints.forEach((keypoint) => {
        if (keypoint.score && keypoint.score > 0.5) {
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 3, 0, 2 * Math.PI);
          ctx.fillStyle = '#FF0000';
          ctx.fill();
        }
      });

      // Draw connections (simplified hand outline)
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // index
        [0, 9], [9, 10], [10, 11], [11, 12], // middle
        [0, 13], [13, 14], [14, 15], [15, 16], // ring
        [0, 17], [17, 18], [18, 19], [19, 20], // pinky
        [5, 9], [9, 13], [13, 17] // palm connections
      ];

      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      
      connections.forEach(([start, end]) => {
        const startPoint = keypoints[start];
        const endPoint = keypoints[end];
        
        if (startPoint.score && startPoint.score > 0.5 && 
            endPoint.score && endPoint.score > 0.5) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.stroke();
        }
      });
    });
  };

  const detectHands = async () => {
    if (!videoRef.current || !detectorRef.current || !canvasRef.current) return;

    try {
      const hands = await detectorRef.current.estimateHands(videoRef.current);
      setHandCount(hands.length);
      drawHands(hands);
    } catch (err) {
      console.error('Hand detection error:', err);
    }

    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
    }
  };

  const startDetection = async () => {
    try {
      setError(null);
      
      if (!detectorRef.current) {
        setError('Hand detection model not loaded yet. Please try again.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current && canvasRef.current) {
            const { videoWidth, videoHeight } = videoRef.current;
            canvasRef.current.width = videoWidth;
            canvasRef.current.height = videoHeight;
            setIsActive(true);
            detectHands();
          }
        };
        await videoRef.current.play();
      }
    } catch (err) {
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      console.error('Camera error:', err);
    }
  };

  const stopDetection = () => {
    setIsActive(false);
    setHandCount(0);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
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
            muted
          />
          <canvas
            ref={canvasRef}
            className="w-full max-w-2xl mx-auto border-2 border-gray-300 rounded-lg"
            style={{ aspectRatio: '4/3' }}
          />
          
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <p className="text-gray-500 text-lg">
                {isLoading ? 'Loading hand detection model...' : 'Camera feed will appear here'}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={isActive ? stopDetection : startDetection}
            variant={isActive ? "destructive" : "default"}
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : isActive ? 'Stop Detection' : 'Start Detection'}
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
            <li>Real-time hand detection using TensorFlow.js</li>
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
