import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Paperclip, Camera, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatInputProps {
  onSendMessage: (content: string, imagePreview?: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || imagePreview) && !isLoading) {
      onSendMessage(input.trim(), imagePreview || undefined);
      setInput('');
      setImagePreview(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MEDIA_UNSUPPORTED");
      }

      let stream: MediaStream;
      try {
        // Try with ideal constraints first (prefer back camera)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      } catch (e) {
        console.warn("Retrying camera with simple constraints...");
        // Fallback to simplest constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      
      let errorMessage = "Impossible d'accéder à la caméra.";
      
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "Aucune caméra n'a été détectée sur votre appareil. Si vous en avez une, assurez-vous qu'elle est branchée et activée.";
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = "L'accès à la caméra a été refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = "La caméra est déjà utilisée par une autre application.";
      } else if (err.message === "MEDIA_UNSUPPORTED") {
        errorMessage = "Votre navigateur ne supporte pas l'accès à la caméra ou vous êtes dans un contexte non sécurisé.";
      }

      // Suggestion for iframe context
      const isIframe = window.self !== window.top;
      if (isIframe) {
        errorMessage += "\n\nAstuce : Essayez d'ouvrir l'application dans un nouvel onglet si le problème persiste.";
      }

      alert(errorMessage);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setImagePreview(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    } else {
      alert("Le flux vidéo n'est pas encore prêt. Veuillez patienter un instant.");
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Camera modal/overlay */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <button 
              onClick={stopCamera}
              className="absolute top-4 right-4 p-2.5 bg-black/50 hover:bg-white/10 rounded-full text-white backdrop-blur-md transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-8 flex gap-6">
            <button 
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all group"
            >
              <div className="w-12 h-12 rounded-full border-2 border-black/10 group-hover:border-black/20 transition-colors" />
            </button>
          </div>
          <p className="mt-4 text-white/40 text-[13px] font-medium tracking-wide">Take a photo</p>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 relative inline-block animate-in fade-in slide-in-from-bottom-2 duration-300">
          <img src={imagePreview} alt="Preview" className="h-20 w-auto rounded-2xl object-cover border border-white/10 shadow-lg" />
          <button 
            onClick={() => setImagePreview(null)}
            className="absolute -top-2 -right-2 p-1 bg-white text-black rounded-full shadow-xl hover:bg-gray-200 transition-colors"
          >
            <X size={12} strokeWidth={3} />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="relative group flex items-end gap-2 bg-[#2f2f2f] rounded-[26px] shadow-2xl border border-white/5 p-2 transition-all focus-within:border-white/20"
      >
        <div className="flex gap-1 ml-1 mb-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-full"
            title="Attach image"
          >
            <Paperclip size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          
          <button
            type="button"
            onClick={startCamera}
            className="p-2.5 text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-full"
            title="Take photo"
          >
            <Camera size={20} />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message ChatGPT Clean..."
          className="flex-1 max-h-[200px] py-4 px-2 bg-transparent border-none focus:ring-0 resize-none text-[15px] leading-relaxed outline-none text-gray-100 placeholder-gray-500"
          disabled={isLoading}
        />
        
        <button
          type="submit"
          disabled={(!input.trim() && !imagePreview) || isLoading}
          className={cn(
            "p-2.5 rounded-full transition-all shrink-0 mb-1 mr-1",
            (input.trim() || imagePreview) && !isLoading
              ? "bg-white text-black hover:bg-gray-200 shadow-md scale-100"
              : "bg-white/5 text-gray-600 cursor-not-allowed scale-90"
          )}
        >
          <SendHorizontal size={20} strokeWidth={2.5} />
        </button>
      </form>
      <p className="mt-3 text-[11px] text-center text-gray-500 font-medium">
        ChatGPT Clean can make mistakes. Check important info.
      </p>
    </div>
  );
};
