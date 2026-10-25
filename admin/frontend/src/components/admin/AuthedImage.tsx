import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { fetchProtectedImage } from "@/services/api";

interface AuthedImageProps {
  src: string;
  alt?: string;
  className?: string;
}

const AuthedImage = ({ src, alt = "", className = "" }: AuthedImageProps) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    let created: string | null = null;

    setObjectUrl(null);
    setFailed(false);

    fetchProtectedImage(src)
      .then((url) => {
        if (revoked) {
          URL.revokeObjectURL(url);
          return;
        }
        created = url;
        setObjectUrl(url);
      })
      .catch(() => setFailed(true));

    return () => {
      revoked = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [src]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 text-gray-300 ${className}`}>
        <ImageOff className="w-4 h-4" />
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 text-gray-300 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  return <img src={objectUrl} alt={alt} className={className} />;
};

export default AuthedImage;
