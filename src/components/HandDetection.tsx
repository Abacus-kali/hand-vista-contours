
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
  const lastFrameTime = useRef(0);

  // Draw the video frame and simulated hands on the canvas
  const updateCanvas = (timestamp: number) => {
    if (!videoRef.current || !canvasRef.current) return;

    // Throttle to ~30fps for better performance
    if (timestamp - lastFrameTime.current < 33) {
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(updateCanvas);
      }
      return;
    }
    lastFrameTime.current = timestamp;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to show live camera feed
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    if (isActive) {
      // In a real app, hand detection would happen here
      // For this demo, we'll simulate detecting hands with random positions
      const randomHandCount = Math.floor(Math.random() * 2) + 1;
      setHandCount(randomHandCount);
      
      // Draw simulated hands with movement
      const time = Date.now() * 0.001;
      drawSimulatedHands(ctx, canvas.width, canvas.height, randomHandCount, time);
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(updateCanvas);
    }
  };
  
  // Draw animated simulated hands
  const drawSimulatedHands = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    count: number,
    time: number
  ) => {
    // Add a subtle overlay to make hands more visible
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    for (let h = 0; h < count; h++) {
      // Create some motion with sine waves
      const xOffset = Math.sin(time * 0.7 + h * 1.5) * width * 0.15;
      const yOffset = Math.cos(time * 0.5 + h * 2.3) * height * 0.1;
      
      // Base position for each hand
      const centerX = width * (0.25 + (h * 0.5)) + xOffset;
      const centerY = height * 0.5 + yOffset;
      const handSize = Math.min(width, height) * 0.15;
      
      // Draw palm
      ctx.beginPath();
      ctx.arc(centerX, centerY, handSize * 0.25, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw fingers with animation
      for (let f = 0; f < 5; f++) {
        // Animate finger angles
        const angleOffset = Math.sin(time * 2 + f * 0.7) * 0.2;
        const angle = (f * Math.PI / 4) - Math.PI / 8 + angleOffset;
        
        // Animate finger length
        const lengthMod = Math.sin(time * 3 + f * 1.2) * 0.1 + 0.9;
        const fingerLength = handSize * 0.7 * lengthMod;
        
        const endX = centerX + Math.cos(angle) * fingerLength;
        const endY = centerY + Math.sin(angle) * fingerLength;
        
        // Draw finger segments
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw joints
        ctx.beginPath();
        ctx.arc(endX, endY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF0000';
        ctx.fill();
        
        // Draw middle joint
        const midX = centerX + Math.cos(angle) * fingerLength * 0.5;
        const midY = centerY + Math.sin(angle) * fingerLength * 0.5;
        ctx.beginPath();
        ctx.arc(midX, midY, 3, 0, 2 * Math.PI);
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
            
            videoRef.current.play().then(() => {
              setIsActive(true);
              setIsLoading(false);
              // Start the animation loop
              animationFrameRef.current = requestAnimationFrame(updateCanvas);
            }).catch(err => {
              setError('Failed to play video: ' + err.message);
              setIsLoading(false);
            });
          }
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to access camera: ${errorMessage}. Please ensure camera permissions are granted.`);
      console.error('Camera error:', err);
      setIsLoading(false);
    }
  };

  const stopDetection = () => {
    setIsActive(false);
    setHandCount(0);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
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
            <li>Live camera feed with simulated hand detection</li>
            <li>Animated hand outlines with green connections</li>
            <li>Red landmark points that move naturally</li>
            <li>Simulates detection of up to 2 hands</li>
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            Note: This is a simulated demo. No actual hand detection is performed to avoid compatibility issues.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default HandDetection;
