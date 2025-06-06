
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const HandDetection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [handCount, setHandCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  // Mock hand detection (simplified version without TensorFlow)
  const detectHands = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame on canvas
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    // In a real app, hand detection would happen here
    // For this demo, we'll simulate detecting 1 or 2 hands randomly
    if (isActive) {
      const randomHandCount = Math.floor(Math.random() * 2) + 1;
      setHandCount(randomHandCount);
      
      // Draw mock hand landmarks
      drawMockHands(ctx, canvas.width, canvas.height, randomHandCount);
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(detectHands);
    }
  };
  
  // Draw mock hands on the canvas
  const drawMockHands = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    count: number
  ) => {
    // Clear previous drawings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    for (let h = 0; h < count; h++) {
      // Draw a simplified hand outline
      const centerX = width * (0.25 + (h * 0.5));
      const centerY = height * 0.5;
      const handSize = Math.min(width, height) * 0.2;
      
      // Draw palm
      ctx.beginPath();
      ctx.arc(centerX, centerY, handSize * 0.3, 0, 2 * Math.PI);
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw fingers
      for (let f = 0; f < 5; f++) {
        const angle = (f * Math.PI / 4) - Math.PI / 8;
        const fingerLength = handSize * 0.7;
        const endX = centerX + Math.cos(angle) * fingerLength;
        const endY = centerY + Math.sin(angle) * fingerLength;
        
        // Finger line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Finger joint
        ctx.beginPath();
        ctx.arc(endX, endY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF0000';
        ctx.fill();
      }
    }
  };

  const startDetection = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
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
            // Set canvas dimensions to match video
            const { videoWidth, videoHeight } = videoRef.current;
            canvasRef.current.width = videoWidth;
            canvasRef.current.height = videoHeight;
            
            setIsActive(true);
            setIsLoading(false);
            detectHands();
          }
        };
        await videoRef.current.play();
      }
    } catch (err) {
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      console.error('Camera error:', err);
      setIsLoading(false);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActive) {
        stopDetection();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                {isLoading ? 'Starting camera...' : 'Camera feed will appear here'}
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
            <li>Camera access and visualization</li>
            <li>Demo hand outline drawing with green connections</li>
            <li>Red landmark points for demonstration</li>
            <li>Simulates detection of up to 2 hands</li>
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            Note: This is a simplified demo that simulates hand detection without using TensorFlow.js or MediaPipe.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default HandDetection;
